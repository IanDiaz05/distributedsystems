# Resilience, HA, Failover and Performance Test Plan

Complete test set for the `distributed-three-tier` project, plus commonly used tools.
The lab in this folder already covers ab, Siege, JMeter and container-level Chaos Monkey faults.

## 1. Baseline and functional checks (before any fault)

- Every layer is healthy: HAProxy backends all UP, `/api/health` returns OK, Galera `wsrep_cluster_size=3`, VIPs held by their masters.
- Round-robin: the `X-Web-Node` and `X-Presentation-LB` headers rotate across web1-3.
- Data consistency: a write on one Galera node is readable on the others; cache hits and misses behave correctly.

## 2. Performance tests

| Test | Goal | Lab tool |
|---|---|---|
| Smoke | Confirm the path works with 1-5 users | ab, JMeter |
| Load | Expected traffic held for 10-30 minutes | JMeter, Siege |
| Stress | Ramp up until errors or latency climb; find the first bottleneck | ab, JMeter |
| Spike | Jump from 5 to 300 users within seconds, then recover | JMeter |
| Soak | Moderate load for hours to catch leaks and connection exhaustion | JMeter |
| Cache effect | Compare latency with and without Redis (`/cache/clear`) | JMeter |
| Capacity per layer | Test web, app and DB directly, bypassing upper layers, to locate the bottleneck | ab |

Track p50/p95/p99 latency, throughput, error rate and CPU/memory per container (`docker stats` or cAdvisor).
Use SLO-style targets, e.g. p95 < 200 ms and availability >= 99.9%.

## 3. HA and failover tests

Run each under constant load; record outage time and failed requests.

| Component | Fault | Expected result |
|---|---|---|
| Presentation LB master | stop, kill, pause | VIP moves to the backup within about 3-4 s |
| Presentation LB master | HAProxy hangs but container stays up | Keepalived check script fails, priority drops by 20, backup takes over |
| Presentation LB master | recovery | Failback without flapping |
| Application LB master | same three faults | Same, on `172.31.0.250` |
| Both LBs of one tier | stop both | Total outage, recovery on restart (negative test) |
| 1 of 3 web/app nodes | stop | HAProxy health check drops it; zero or near-zero errors |
| 2 of 3 web/app nodes | stop | Reduced capacity but still serving |
| Galera node | stop galera2 or galera3 | Cluster keeps quorum |
| Galera node | stop galera1 | SQL proxy routes to a Synced node in the Primary component after detection; in-flight requests may fail |
| Redis | stop | Graceful degradation: slower DB-only reads, no 500s |
| MongoDB primary | stop | Remaining majority elects a primary; review writes resume after election |
| MongoDB majority | stop two members | Majority writes fail visibly; do not force a new set |
| Redis Sentinel | stop one sentinel | Two surviving Sentinels retain failover quorum |
| Entry proxy | stop | Total outage, accepted Docker Desktop limitation |

## 4. Chaos engineering tests

Each experiment: state a steady-state hypothesis (e.g. availability >= 99% and p95 < 500 ms), inject the fault,
compare against the hypothesis, recover, record findings.

- **Container faults:** random stop/kill/pause, several victims at once (covered by the lab).
- **Network faults:** latency, jitter, packet loss, bandwidth limits, partitions between app and DB or between Galera halves (split-brain). Not yet in the lab; use Pumba or Toxiproxy.
- **Resource faults:** CPU hog, memory pressure, disk full/slow, file-descriptor exhaustion (`stress-ng`, Pumba stress).
- **Time faults:** clock skew, which affects Keepalived and Galera.
- **Dependency faults:** DB slowness without failure, exposing missing timeouts and retry storms.
- **Compound faults:** load test plus node failure plus cache flush at the same time.
- **Recovery faults:** restart the whole stack; check startup order, cold cache and Galera re-bootstrap after losing all nodes.

## 5. Observability and alerting checks

- Nagios alerts on each fault within its check interval; count missed and false alerts.
- Logs are sufficient to reconstruct the timeline.
- Record mean time to detect, mean time to recover and error budget burn per experiment.

## Gaps the tests will likely expose

- `galera-proxy` is a single instance; SQL node failover does not protect against proxy loss.
- All database and Sentinel members share the same Compose host.
- Live replica elections and restart convergence require acceptance evidence (see `../DATA-HA.md`).
- `presentation-entry` is a single point of failure.
- Compose `restart: unless-stopped` does not restart a container that was stopped deliberately.

## Commonly used tools

| Area | Tools |
|---|---|
| HTTP load | k6 (JS scripts, CI-friendly), Locust (Python), Gatling, wrk/wrk2 (constant rate, accurate latency), vegeta, hey, bombardier, Artillery |
| Enterprise / distributed load | BlazeMeter, Tsung, NBomber, Taurus (YAML wrapper over JMeter, Gatling, etc.) |
| Chaos, containers/Docker | Pumba (kill, pause, netem, stress), Chaos Toolkit (declarative experiments), Gremlin (SaaS) |
| Chaos, Kubernetes | Chaos Mesh, LitmusChaos, Netflix Chaos Monkey / Simian Army (cloud, Spinnaker) |
| Chaos, cloud | AWS Fault Injection Service, Azure Chaos Studio |
| Network faults | Toxiproxy, tc/netem, Comcast, iptables |
| Host/resource stress | stress-ng, fio, iperf3 |
| Database | sysbench, HammerDB, mysqlslap, pgbench, YCSB, mongoperf, redis-benchmark |
| Distributed correctness | Jepsen (for databases like Galera and MongoDB) |
| Observability | Prometheus + Grafana, cAdvisor, node_exporter, Loki, Jaeger/OpenTelemetry, HAProxy stats and exporter, mysqld_exporter, Nagios/Zabbix |
| CI gating | GitHub Actions with k6 thresholds, Taurus |
| Game days | Written runbooks and blameless postmortems |

## Suggested next steps

1. Add Prometheus and Grafana (HAProxy exporter, cAdvisor) so each experiment has graphs of its hypothesis.
2. Add Pumba or Toxiproxy to the lab for latency, loss and partition experiments.
3. Add k6 or Locust for scripted, threshold-based tests that can run in CI.
4. Validate the database-aware proxy's Galera failover, MongoDB elections and Redis Sentinel failover using the acceptance cases in `../DATA-HA.md`.
