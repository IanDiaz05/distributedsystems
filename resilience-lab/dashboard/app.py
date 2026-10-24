"""Dashboard that launches the resilience-lab tools and shows their results."""
import csv
import json
import os
import re
import subprocess
import threading
import time
import uuid
from urllib.parse import urlparse

from flask import Flask, abort, jsonify, request, send_from_directory

RESULTS = "/results"
DEFAULT_TARGET = os.environ.get("DEFAULT_TARGET", "http://presentation-entry").rstrip("/")
app = Flask(__name__, static_folder="static", static_url_path="")
procs, lock = {}, threading.Lock()

F = lambda key, label, default, kind="text", **kw: {"key": key, "label": label, "default": default, "type": kind, **kw}  # noqa: E731

TOOLS = {
    "ab": {
        "title": "ApacheBench (ab)", "container": "lab-ab", "kind": "performance",
        "description": "Fixed number of requests against one URL. Quick throughput/latency baseline.",
        "runbook": ["Start the main stack and open this dashboard.",
                    "Run the Smoke preset to confirm the target answers (0 failed requests).",
                    "Run Load, then Stress; compare requests/s and p95/p99 across runs.",
                    "Failed requests or Non-2xx responses point to saturation: check HAProxy/Nagios."],
        "fields": [F("TARGET_URL", "Target URL", DEFAULT_TARGET + "/"),
                   F("REQUESTS", "Total requests", 1000, "number", min=1, max=1000000),
                   F("CONCURRENCY", "Concurrency", 20, "number", min=1, max=2000),
                   F("TIMEOUT", "Timeout (s)", 30, "number", min=1, max=600),
                   F("KEEPALIVE", "HTTP keep-alive", False, "bool")],
        "presets": {"Smoke": {"REQUESTS": 100, "CONCURRENCY": 5}, "Load": {"REQUESTS": 5000, "CONCURRENCY": 50},
                    "Stress": {"REQUESTS": 20000, "CONCURRENCY": 200}},
    },
    "siege": {
        "title": "Siege", "container": "lab-siege", "kind": "performance",
        "description": "Time-boxed load over a list of URLs with simulated users.",
        "runbook": ["Enter one URL per line (web pages and /api/ calls).",
                    "Run Smoke, then Load; leave benchmark mode on for max pressure or off to add think time.",
                    "Check Availability (target >= 99%) and Response time / Longest transaction.",
                    "Run it together with a Chaos Monkey run to see behaviour under failures."],
        "fields": [F("URLS", "URLs (one per line)", f"{DEFAULT_TARGET}/\n{DEFAULT_TARGET}/api/health\n{DEFAULT_TARGET}/api/products/cheapest", "textarea"),
                   F("CONCURRENCY", "Concurrent users", 20, "number", min=1, max=1000),
                   F("DURATION", "Duration (s)", 30, "number", min=1, max=3600),
                   F("BENCHMARK", "Benchmark mode (no delay)", True, "bool"),
                   F("DELAY", "Max random delay (s)", 1, "number", min=0, max=60)],
        "presets": {"Smoke": {"CONCURRENCY": 5, "DURATION": 10}, "Load": {"CONCURRENCY": 50, "DURATION": 60},
                    "Stress": {"CONCURRENCY": 200, "DURATION": 60}},
    },
    "jmeter": {
        "title": "Apache JMeter", "container": "lab-jmeter", "kind": "performance",
        "description": "Thread-group scenario with ramp-up; produces a full HTML report.",
        "runbook": ["Set the base URL and the request paths (one per line).",
                    "Pick threads, ramp-up and duration; Smoke first, then Load.",
                    "Review error %, percentiles and throughput here; open the full HTML report for graphs.",
                    "Use think time to model real users; set it to 0 for raw capacity."],
        "fields": [F("BASE_URL", "Base URL", DEFAULT_TARGET),
                   F("PATHS", "Paths (one per line)", "/\n/api/health\n/api/products/cheapest", "textarea"),
                   F("THREADS", "Threads (users)", 20, "number", min=1, max=1000),
                   F("RAMPUP", "Ramp-up (s)", 5, "number", min=0, max=600),
                   F("DURATION", "Duration (s)", 30, "number", min=1, max=3600),
                   F("THINK_MS", "Think time (ms)", 0, "number", min=0, max=60000)],
        "presets": {"Smoke": {"THREADS": 5, "DURATION": 15}, "Load": {"THREADS": 50, "RAMPUP": 10, "DURATION": 60},
                    "Stress": {"THREADS": 200, "RAMPUP": 30, "DURATION": 90}},
    },
    "chaosmonkey": {
        "title": "Chaos Monkey", "container": "lab-chaosmonkey", "kind": "resilience",
        "description": "Randomly stops/kills/pauses project containers and measures user-visible availability.",
        "runbook": ["Start with Dry run to see which containers would be hit.",
                    "Pick a group: presentation-lb tests the VRRP failover, web/app test pool redundancy, galera/redis/mongodb test the data tier.",
                    "Optionally start Siege/JMeter in parallel for load while faults are injected.",
                    "Expect availability near 100% for redundant groups; compare Longest outage with the Keepalived/health-check timers.",
                    "All targets are restored automatically at the end or when stopped."],
        "fields": [F("GROUP", "Target group", "web", "select",
                     options=["web", "app", "presentation-lb", "application-lb", "galera", "redis", "redis-sentinel", "mongodb", "any"]),
                   F("TARGETS", "Explicit services (comma separated, overrides group)", "", "text", required=False),
                   F("ACTION", "Fault", "stop", "select", options=["stop", "kill", "pause"]),
                   F("INTERVAL", "Seconds between faults", 20, "number", min=1, max=3600),
                   F("DOWNTIME", "Seconds a victim stays down", 15, "number", min=1, max=3600),
                   F("DURATION", "Total duration (s)", 90, "number", min=5, max=7200),
                   F("MAX_CONCURRENT", "Max victims at once", 1, "number", min=1, max=5),
                   F("PROBE_URL", "Availability probe URL", DEFAULT_TARGET + "/api/health"),
                   F("DRY_RUN", "Dry run (do not touch containers)", False, "bool")],
        "presets": {"Gentle": {"INTERVAL": 30, "DOWNTIME": 15, "DURATION": 90},
                    "Aggressive": {"INTERVAL": 10, "DOWNTIME": 20, "DURATION": 120, "MAX_CONCURRENT": 2},
                    "LB failover": {"GROUP": "presentation-lb", "INTERVAL": 30, "DOWNTIME": 20, "DURATION": 90}},
    },
}


def clean_params(tool, raw):
    params = {}
    for f in TOOLS[tool]["fields"]:
        v = raw.get(f["key"], f["default"])
        if f["type"] == "number":
            try:
                v = float(v)
            except (TypeError, ValueError):
                raise ValueError(f"{f['label']} must be a number")
            if not f["min"] <= v <= f["max"]:
                raise ValueError(f"{f['label']} must be between {f['min']} and {f['max']}")
            v = str(int(v)) if v == int(v) else str(v)
        elif f["type"] == "bool":
            v = "true" if v in (True, "true", "on", 1) else "false"
        elif f["type"] == "select":
            if v not in f["options"]:
                raise ValueError(f"{f['label']} is invalid")
        else:
            v = str(v).strip()
            if not v and f.get("required", True):
                raise ValueError(f"{f['label']} is required")
            if f["key"] in ("TARGET_URL", "PROBE_URL", "BASE_URL") and not re.match(r"^https?://[^\s]+$", v):
                raise ValueError(f"{f['label']} must be an http(s) URL")
            if f["key"] == "TARGETS" and v and not re.match(r"^[\w.,\- ]+$", v):
                raise ValueError("Explicit services contain invalid characters")
            if f["key"] in ("URLS",) and any(not re.match(r"^https?://\S+$", u.strip()) for u in v.splitlines() if u.strip()):
                raise ValueError("Every URL must start with http:// or https://")
            if f["key"] == "PATHS" and any(not u.strip().startswith("/") for u in v.splitlines() if u.strip()):
                raise ValueError("Every path must start with /")
        params[f["key"]] = v
    if tool == "jmeter":
        u = urlparse(params.pop("BASE_URL"))
        params["PROTOCOL"] = u.scheme
        params["HOST"] = u.hostname
        params["PORT"] = str(u.port or (443 if u.scheme == "https" else 80))
    return params


def run_dir(run_id):
    return os.path.join(RESULTS, run_id)


def read_meta(run_id):
    try:
        with open(os.path.join(run_dir(run_id), "meta.json")) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_meta(meta):
    path = os.path.join(run_dir(meta["id"]), "meta.json")
    with open(path + ".tmp", "w") as f:
        json.dump(meta, f)
    os.replace(path + ".tmp", path)


def execute(meta, params):
    tool = TOOLS[meta["tool"]]
    out = run_dir(meta["id"])
    cmd = ["docker", "exec"]
    for k, v in params.items():
        cmd += ["-e", f"{k}={v}"]
    cmd += [tool["container"], f"/runbook/run.sh", out]
    with open(os.path.join(out, "console.log"), "w") as log:
        proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)
        with lock:
            procs[meta["id"]] = proc
        code = proc.wait()
    with lock:
        procs.pop(meta["id"], None)
    meta = read_meta(meta["id"])
    meta["finished"] = time.time()
    if meta["status"] == "stopping":
        meta["status"] = "stopped"
    else:
        meta["status"] = "finished" if code == 0 else "failed"
    meta["exit_code"] = code
    try:
        meta["summary"] = build_summary(meta)
    except Exception as e:  # noqa: BLE001 - never lose a run because of a parser bug
        meta["summary"] = {"metrics": {}, "error": f"could not parse results: {e}"}
    write_meta(meta)


# ---- result parsers -------------------------------------------------------

def num(s):
    return float(s.replace(",", ""))


def parse_ab(text, out):
    m = {}
    patterns = {
        "Requests/s": r"Requests per second:\s+([\d.]+)",
        "Mean latency ms": r"Time per request:\s+([\d.]+) \[ms\] \(mean\)\n",
        "Completed requests": r"Complete requests:\s+(\d+)",
        "Failed requests": r"Failed requests:\s+(\d+)",
        "Non-2xx responses": r"Non-2xx responses:\s+(\d+)",
        "Transfer rate KB/s": r"Transfer rate:\s+([\d.]+)",
        "Total time s": r"Time taken for tests:\s+([\d.]+)",
    }
    for label, pat in patterns.items():
        r = re.search(pat, text)
        m[label] = num(r.group(1)) if r else (0 if label == "Non-2xx responses" else None)
    pct = {f"p{p}": num(v) for p, v in re.findall(r"^\s+(\d+)%\s+(\d+)", text, re.M)}
    return {"metrics": m, "percentiles": pct, "unit": "ms"}


def parse_siege(text, out):
    labels = {"Transactions": "Transactions", "Availability": "Availability %", "Elapsed time": "Elapsed s",
              "Data transferred": "Data MB", "Response time": "Avg response s", "Transaction rate": "Transactions/s",
              "Throughput": "Throughput MB/s", "Concurrency": "Avg concurrency",
              "Successful transactions": "Successful", "Failed transactions": "Failed",
              "Longest transaction": "Longest s", "Shortest transaction": "Shortest s"}
    m = {}
    for key, val in re.findall(r"^([A-Za-z ]+):\s+([\d.,]+)", text, re.M):
        if key.strip() in labels:
            m[labels[key.strip()]] = num(val)
    return {"metrics": m}


def parse_jmeter(text, out):
    path = os.path.join(out, "results.jtl")
    rows = list(csv.DictReader(open(path))) if os.path.exists(path) else []
    if not rows:
        return {"metrics": {}, "error": "JMeter produced no samples"}
    el = sorted(int(r["elapsed"]) for r in rows)
    ts = [int(r["timeStamp"]) for r in rows]
    span = max((max(ts) + int(rows[ts.index(max(ts))]["elapsed"]) - min(ts)) / 1000, 0.001)
    errors = sum(1 for r in rows if r["success"] != "true")
    pick = lambda p: el[min(len(el) - 1, int(len(el) * p / 100))]  # noqa: E731
    per = {}
    for r in rows:
        s = per.setdefault(r["label"], {"n": 0, "err": 0, "sum": 0})
        s["n"] += 1
        s["err"] += r["success"] != "true"
        s["sum"] += int(r["elapsed"])
    return {
        "metrics": {"Samples": len(rows), "Errors": errors, "Error %": round(100 * errors / len(rows), 2),
                    "Throughput req/s": round(len(rows) / span, 2), "Avg ms": round(sum(el) / len(el), 1),
                    "Min ms": el[0], "Max ms": el[-1]},
        "percentiles": {"p50": pick(50), "p90": pick(90), "p95": pick(95), "p99": pick(99)},
        "unit": "ms",
        "table": [{"label": k, "samples": v["n"], "errors": v["err"], "avg_ms": round(v["sum"] / v["n"], 1)}
                  for k, v in per.items()],
        "report": os.path.isfile(os.path.join(out, "report", "index.html")),
    }


def build_summary(meta):
    out = run_dir(meta["id"])
    if meta["tool"] == "chaosmonkey":
        p = os.path.join(out, "summary.json")
        if os.path.exists(p):
            return json.load(open(p))
        return {"metrics": {}, "error": "no summary produced (see console log)"}
    text = open(os.path.join(out, "console.log"), errors="replace").read()
    return {"ab": parse_ab, "siege": parse_siege, "jmeter": parse_jmeter}[meta["tool"]](text, out)


# ---- API ------------------------------------------------------------------

@app.get("/api/tools")
def api_tools():
    return jsonify(TOOLS)


@app.post("/api/runs")
def api_start():
    body = request.get_json(force=True, silent=True) or {}
    tool = body.get("tool")
    if tool not in TOOLS:
        return jsonify(error="unknown tool"), 400
    try:
        params = clean_params(tool, body.get("params", {}))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    run_id = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    os.makedirs(run_dir(run_id))
    meta = {"id": run_id, "tool": tool, "status": "running", "started": time.time(),
            "params": params if tool != "jmeter" else {**params}, "summary": None}
    write_meta(meta)
    threading.Thread(target=execute, args=(meta, params), daemon=True).start()
    return jsonify(meta), 202


@app.get("/api/runs")
def api_runs():
    runs = []
    for name in sorted(os.listdir(RESULTS), reverse=True):
        meta = read_meta(name)
        if meta:
            with lock:
                active = name in procs
            if meta["status"] in ("running", "stopping") and not active:
                meta["status"] = "interrupted"
            runs.append({k: meta.get(k) for k in ("id", "tool", "status", "started", "finished", "summary")})
    return jsonify(runs[:100])


@app.get("/api/runs/<run_id>")
def api_run(run_id):
    meta = read_meta(run_id) if re.fullmatch(r"[\w-]+", run_id) else None
    if not meta:
        abort(404)
    with lock:
        active = run_id in procs
    if meta["status"] in ("running", "stopping") and not active:
        meta["status"] = "interrupted"
    try:
        with open(os.path.join(run_dir(run_id), "console.log"), errors="replace") as f:
            meta["console"] = f.read()[-20000:]
    except OSError:
        meta["console"] = ""
    meta["files"] = sorted(f for f in os.listdir(run_dir(run_id)) if os.path.isfile(os.path.join(run_dir(run_id), f)))
    return jsonify(meta)


@app.post("/api/runs/<run_id>/stop")
def api_stop(run_id):
    meta = read_meta(run_id) if re.fullmatch(r"[\w-]+", run_id) else None
    with lock:
        active = run_id in procs
    if not meta or not active:
        return jsonify(error="run is not active"), 404
    meta["status"] = "stopping"
    write_meta(meta)
    container = TOOLS[meta["tool"]]["container"]
    script = f'p=$(cat {run_dir(run_id)}/pid); pkill -TERM -P "$p"; kill -TERM "$p"'
    subprocess.run(["docker", "exec", container, "sh", "-c", script], capture_output=True)
    return jsonify(meta)


@app.get("/files/<run_id>/<path:name>")
def files(run_id, name):
    if not re.fullmatch(r"[\w-]+", run_id):
        abort(404)
    resp = send_from_directory(run_dir(run_id), name)
    if request.args.get("download"):
        resp.headers["Content-Disposition"] = f'attachment; filename="{run_id}-{os.path.basename(name)}"'
    return resp


@app.get("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090, threaded=True)
