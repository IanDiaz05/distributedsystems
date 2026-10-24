"""Small Chaos Monkey for the distributed-three-tier compose project.

Periodically stops/kills/pauses random containers from a target group, restores
them after DOWNTIME seconds, and probes an HTTP endpoint to measure the
availability the users would have seen. Everything is restored on exit.
"""
import json
import os
import random
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

OUT = sys.argv[1]
PROJECT = os.environ.get("CHAOS_PROJECT", "distributed-three-tier")
GROUP = os.environ.get("GROUP", "web")
TARGETS = [t.strip() for t in os.environ.get("TARGETS", "").split(",") if t.strip()]
ACTION = os.environ.get("ACTION", "stop")
INTERVAL = float(os.environ.get("INTERVAL", "20"))
DOWNTIME = float(os.environ.get("DOWNTIME", "15"))
DURATION = float(os.environ.get("DURATION", "90"))
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "1"))
PROBE_URL = os.environ.get("PROBE_URL", "http://presentation-entry/api/health")
PROBE_INTERVAL = float(os.environ.get("PROBE_INTERVAL", "1"))
DRY_RUN = os.environ.get("DRY_RUN", "false") == "true"

# Service names of the main project; the entry proxy, nagios and the init job are never touched.
GROUPS = {
    "presentation-lb": ["presentation-lb-master", "presentation-lb-backup"],
    "web": ["web1", "web2", "web3"],
    "application-lb": ["application-lb-master", "application-lb-backup"],
    "app": ["app1", "app2", "app3"],
    "galera": ["galera1", "galera2", "galera3"],
    "redis": ["redis", "redis2", "redis3"],
    "redis-sentinel": ["redis-sentinel1", "redis-sentinel2", "redis-sentinel3"],
    "mongodb": ["mongodb", "mongodb2", "mongodb3"],
}
GROUPS["any"] = sum(GROUPS.values(), [])
PROTECTED = {"presentation-entry", "nagios", "catalog-init", "mongodb-init", "mongodb-keyfile"}

stop_event = threading.Event()
lock = threading.Lock()
events, probes = [], []
down = {}  # container name -> (service, action, restore deadline)
started = time.time()


def log(msg):
    print(f"[{time.time() - started:6.1f}s] {msg}", flush=True)


def docker(*args):
    return subprocess.run(["docker", *args], capture_output=True, text=True)


def record(action, service, ok=True, detail=""):
    with lock:
        events.append({"t": round(time.time() - started, 1), "action": action,
                       "service": service, "ok": ok, "detail": detail})
    log(f"{action} {service} {'' if ok else 'FAILED '}{detail}")


def list_containers():
    res = docker("ps", "-a", "--filter", f"label=com.docker.compose.project={PROJECT}",
                 "--format", '{{.Names}}|{{.Label "com.docker.compose.service"}}|{{.State}}')
    found = {}
    for line in res.stdout.splitlines():
        name, service, state = line.split("|")
        found[service] = (name, state)
    return found


def restore(name, service, action):
    if DRY_RUN:
        record("restore(dry-run)", service)
        return
    res = docker("unpause", name) if action == "pause" else docker("start", name)
    record("restore", service, res.returncode == 0, res.stderr.strip())
    # keepalived shares the netns of its load balancer, so it must follow a restart
    if "-lb-" in service and action != "pause":
        r = docker("restart", name.replace("-lb-", "-keepalived-"))
        record("restart", service.replace("-lb-", "-keepalived-"), r.returncode == 0, r.stderr.strip())


def inject(name, service):
    if DRY_RUN:
        record(f"{ACTION}(dry-run)", service)
        return True
    res = docker(ACTION, name)
    record(ACTION, service, res.returncode == 0, res.stderr.strip())
    return res.returncode == 0


def prober():
    while not stop_event.is_set():
        t0 = time.time()
        status, err = 0, ""
        try:
            with urllib.request.urlopen(PROBE_URL, timeout=3) as r:
                status = r.status
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception as e:  # noqa: BLE001 - any failure counts as unavailable
            err = type(e).__name__
        probes.append({"t": round(t0 - started, 1), "status": status,
                       "ms": round((time.time() - t0) * 1000), "ok": 200 <= status < 400, "err": err})
        stop_event.wait(max(0, PROBE_INTERVAL - (time.time() - t0)))


def write_summary():
    ok = [p for p in probes if p["ok"]]
    longest = cur = 0.0
    for p in probes:
        cur = cur + PROBE_INTERVAL if not p["ok"] else 0.0
        longest = max(longest, cur)
    injected = [e for e in events if e["action"].startswith(ACTION) and e["ok"]]
    summary = {
        "metrics": {
            "Faults injected": len(injected),
            "Probes sent": len(probes),
            "Probes failed": len(probes) - len(ok),
            "Availability %": round(100 * len(ok) / len(probes), 2) if probes else None,
            "Longest outage s": round(longest, 1),
            "Avg probe latency ms": round(sum(p["ms"] for p in ok) / len(ok), 1) if ok else None,
        },
        "events": events,
        "timeline": [{"t": p["t"], "ok": p["ok"], "ms": p["ms"]} for p in probes],
    }
    with open(os.path.join(OUT, "summary.json"), "w") as f:
        json.dump(summary, f)


def main():
    signal.signal(signal.SIGTERM, lambda *_: stop_event.set())
    signal.signal(signal.SIGINT, lambda *_: stop_event.set())
    pool = TARGETS or GROUPS.get(GROUP, [])
    found = list_containers()
    pool = [s for s in pool if s not in PROTECTED and s in found]
    log(f"project={PROJECT} action={ACTION} dry_run={DRY_RUN} pool={pool}")
    log(f"interval={INTERVAL}s downtime={DOWNTIME}s duration={DURATION}s probe={PROBE_URL}")
    if not pool:
        log("no matching containers; is the main stack running?")
        sys.exit(2)

    threading.Thread(target=prober, daemon=True).start()
    stop_event.wait(min(3, INTERVAL))  # healthy baseline before the first fault
    deadline = started + DURATION
    next_fault = time.time()
    try:
        while not stop_event.is_set() and time.time() < deadline:
            now = time.time()
            for name, (service, action, due) in list(down.items()):
                if now >= due:
                    restore(name, service, action)
                    del down[name]
            if now >= next_fault and len(down) < MAX_CONCURRENT:
                idle = [s for s in pool if found[s][0] not in down]
                if idle:
                    service = random.choice(idle)
                    name = found[service][0]
                    if inject(name, service):
                        down[name] = (service, ACTION, time.time() + DOWNTIME)
                next_fault = time.time() + INTERVAL
            stop_event.wait(0.5)
    finally:
        interrupted = stop_event.is_set()
        for name, (service, action, _) in list(down.items()):
            restore(name, service, action)
        if not interrupted:
            stop_event.wait(min(10, DOWNTIME))  # observe recovery
        stop_event.set()
        time.sleep(0.5)
        write_summary()
        log("done; all targets restored")


main()
