# Evidencias — pruebas desde el panel

Rellena este archivo a medida que ejecutas `docs/pruebas/00-INSTRUCCIONES-PANEL.md`.

- **Capturas** → carpeta `docs/tests/evidencias/img/` con el nombre exacto indicado abajo.
- **Salidas de comandos / respuestas HTTP / logs** → pega el resultado justo debajo del comando en el bloque correspondiente.
- **Resultados de cada run** → si la captura no basta, copia el JSON de `http://localhost:8090/api/runs/<ID-run>` y pega en el bloque "Resultados".
- Si no ejecutas una prueba, anótalo: `NO EJECUTADA — motivo`.

---

## CP-B0 — Checkpoint línea base

```bash
docker compose ps -a
curl -s http://localhost/api/health
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'
```

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
docker exec distributed-three-tier-redis-1 redis-cli info replication | grep -E '^role'
```

```bash
docker exec distributed-three-tier-presentation-keepalived-master-1 ip -4 -o addr show | grep 172.30.0.250 || echo "VIP de presentación NO está en el master"
docker exec distributed-three-tier-application-keepalived-master-1 ip -4 -o addr show | grep 172.31.0.250 || echo "VIP de aplicación NO está en el master"
```

> La salida de estos comandos se encuentran en `docs/tests/CP-B0.md`
---

## T00 — Salud y round-robin

Capturas:

- `T00-salud-1.png` — tienda `http://localhost/`
- `T00-salud-2.png` — Nagios, Service Detail sin CRITICAL

```bash
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
# x-request-trace: presentation-lb-master -> webnode2 -> application-lb-master -> app1
# x-request-trace: presentation-lb-master -> webnode3 -> application-lb-master -> app2
# x-request-trace: presentation-lb-master -> webnode1 -> application-lb-master -> app3

curl -s http://localhost/api/products/cheapest | head -c 300; echo
# [{"id":1,"sku":"ST-001","name":"Cotton Tote Bag","description":"Reusable natural cotton shopping bag.","price":"3.49"},{"id":4,"sku":"ST-002","name":"Wooden Pencil Set","description":"Pack of six graphite pencils.","price":"4.25"},{"id":7,"sku":"ST-003","name":"Ceramic Mug","description":"Everyday 3
curl -s http://localhost/api/products/ST-001/reviews | head -c 300; echo
# {"sku":"ST-001","reviews":[{"comment":"Sturdy and convenient for grocery shopping.","createdAt":"2025-01-15T12:00:00.000Z","rating":5,"reviewer":"Alex"}]}
```

---

## CP-B1 — Checkpoint antes del bloque de rendimiento

```bash
docker compose ps -a
# son los mismos que el CPB0, nada ha cambiado
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
```
---

## T01 — ab Smoke

Capturas:

- `T01-ab-smoke-1.png` — Output data + Latency percentiles

Resultados (JSON de `/api/runs/<id>`):

```json
{"id": "20261026-000356-f0b9", "tool": "ab", "status": "finished", "started": 1792973036.7569382, "params": {"TARGET_URL": "http://presentation-entry/", "REQUESTS": "100", "CONCURRENCY": "5", "TIMEOUT": "30", "KEEPALIVE": "false"}, "summary": {"metrics": {"Requests/s": 4644.25, "Mean latency ms": 1.077, "Completed requests": 100.0, "Failed requests": 0.0, "Non-2xx responses": 0, "Transfer rate KB/s": 9088.94, "Total time s": 0.022}, "percentiles": {"p50": 1.0, "p66": 1.0, "p75": 1.0, "p80": 1.0, "p90": 1.0, "p95": 1.0, "p98": 2.0, "p99": 3.0, "p100": 3.0}, "unit": "ms"}, "finished": 1792973036.9142647, "exit_code": 0}
```

---

## T02 — ab Load

Capturas:

- `T02-ab-load-1.png`

Resultados:

```json
{"id": "20261026-001026-3920", "tool": "ab", "status": "finished", "started": 1792973426.234424, "params": {"TARGET_URL": "http://presentation-entry/", "REQUESTS": "5000", "CONCURRENCY": "50", "TIMEOUT": "30", "KEEPALIVE": "false"}, "summary": {"metrics": {"Requests/s": 4846.22, "Mean latency ms": 10.317, "Completed requests": 5000.0, "Failed requests": 0.0, "Non-2xx responses": 0, "Transfer rate KB/s": 9484.19, "Total time s": 1.032}, "percentiles": {"p50": 10.0, "p66": 11.0, "p75": 12.0, "p80": 12.0, "p90": 14.0, "p95": 16.0, "p98": 21.0, "p99": 25.0, "p100": 38.0}, "unit": "ms"}, "finished": 1792973427.3478196, "exit_code": 0}
```

---

## T03 — ab Stress

Capturas:

- `T03-ab-stress-1.png`

Resultados (añade nota si aparecen fallos):

```json
{"id": "20261026-001117-5fee", "tool": "ab", "status": "finished", "started": 1792973477.527725, "params": {"TARGET_URL": "http://presentation-entry/", "REQUESTS": "20000", "CONCURRENCY": "200", "TIMEOUT": "30", "KEEPALIVE": "false"}, "summary": {"metrics": {"Requests/s": 4472.16, "Mean latency ms": 44.721, "Completed requests": 20000.0, "Failed requests": 0.0, "Non-2xx responses": 0, "Transfer rate KB/s": 8752.16, "Total time s": 4.472}, "percentiles": {"p50": 44.0, "p66": 47.0, "p75": 49.0, "p80": 50.0, "p90": 54.0, "p95": 58.0, "p98": 62.0, "p99": 66.0, "p100": 118.0}, "unit": "ms"}, "finished": 1792973482.1269624, "exit_code": 0}
```

---

## T04 — Siege Load

Capturas:

- `T04-siege-load-1.png`

Resultados:

```json
{"id": "20261026-001300-ff8c", "tool": "siege", "status": "finished", "started": 1792973580.6611025, "params": {"URLS": "http://presentation-entry/\nhttp://presentation-entry/api/health\nhttp://presentation-entry/api/products/cheapest", "CONCURRENCY": "50", "DURATION": "60", "BENCHMARK": "true", "DELAY": "1"}, "summary": {"metrics": {"Transactions": 108838.0, "Availability %": 100.0, "Elapsed s": 60.25, "Data MB": 145.77, "Avg response s": 0.03, "Transactions/s": 1806.44, "Throughput MB/s": 2.42, "Avg concurrency": 47.38, "Successful": 108838.0, "Failed": 0.0, "Longest s": 0.14, "Shortest s": 0.0}}, "finished": 1792973641.0401034, "exit_code": 0}
```

---

## T05 — JMeter Load

Capturas:

- `T05-jmeter-load-1.png` — panel (tarjetas + percentiles + Per request)
- `T05-jmeter-load-2.png` — informe HTML (botón *Open JMeter HTML report*)

Resultados:

```json
{"id": "20261026-001624-b96d", "tool": "jmeter", "status": "finished", "started": 1792973784.985113, "params": {"PATHS": "/\n/api/health\n/api/products/cheapest", "THREADS": "50", "RAMPUP": "10", "DURATION": "60", "THINK_MS": "0", "PROTOCOL": "http", "HOST": "presentation-entry", "PORT": "80"}, "summary": {"metrics": {"Samples": 93651, "Errors": 0, "Error %": 0.0, "Throughput req/s": 1563.64, "Avg ms": 29.3, "Min ms": 0, "Max ms": 823}, "percentiles": {"p50": 18, "p90": 66, "p95": 102, "p99": 191}, "unit": "ms", "table": [{"label": "GET /", "samples": 31226, "errors": 0, "avg_ms": 9.8}, {"label": "GET /api/health", "samples": 31221, "errors": 0, "avg_ms": 40.1}, {"label": "GET /api/products/cheapest", "samples": 31204, "errors": 0, "avg_ms": 38.0}], "report": true}, "finished": 1792973852.6632786, "exit_code": 0}
```

---

## T06 — JMeter Stress

Capturas:

- `T06-jmeter-stress-1.png` — panel
- `T06-jmeter-stress-2.png` — informe HTML

Resultados (nota el primer síntoma de saturación):

```json
{"id": "20261026-004542-59da", "tool": "jmeter", "status": "finished", "started": 1792975542.2557547, "params": {"PATHS": "/\n/api/health\n/api/products/cheapest", "THREADS": "200", "RAMPUP": "30", "DURATION": "90", "THINK_MS": "0", "PROTOCOL": "http", "HOST": "presentation-entry", "PORT": "80"}, "summary": {"metrics": {"Samples": 149975, "Errors": 0, "Error %": 0.0, "Throughput req/s": 1667.19, "Avg ms": 99.9, "Min ms": 0, "Max ms": 1398}, "percentiles": {"p50": 61, "p90": 234, "p95": 342, "p99": 669}, "unit": "ms", "table": [{"label": "GET /", "samples": 50030, "errors": 0, "avg_ms": 32.0}, {"label": "GET /api/health", "samples": 50022, "errors": 0, "avg_ms": 134.1}, {"label": "GET /api/products/cheapest", "samples": 49923, "errors": 0, "avg_ms": 133.7}], "report": true}, "finished": 1792975642.2990954, "exit_code": 0}
```

En cuanto al sintoma de saturacion, no hay errores pero parece que la latencia empieza a crecer bastante
---

## T07 — Efecto de la caché

Capturas:

- `T07-cachefx-1.png` — run A (caché caliente)
- `T07-cachefx-2.png` — run B (inmediatamente tras limpiar la caché)

```bash
curl -s -X POST http://localhost/api/cache/clear; echo
```

Resultados (run A y run B):

```json
// Run A
{"id": "20261026-005818-3869", "tool": "ab", "status": "finished", "started": 1792976298.7636094, "params": {"TARGET_URL": "http://presentation-entry/api/products/cheapest", "REQUESTS": "5000", "CONCURRENCY": "50", "TIMEOUT": "30", "KEEPALIVE": "false"}, "summary": {"metrics": {"Requests/s": 2519.27, "Mean latency ms": 19.847, "Completed requests": 5000.0, "Failed requests": 0.0, "Non-2xx responses": 0, "Transfer rate KB/s": 3478.77, "Total time s": 1.985}, "percentiles": {"p50": 19.0, "p66": 22.0, "p75": 24.0, "p80": 25.0, "p90": 29.0, "p95": 32.0, "p98": 36.0, "p99": 39.0, "p100": 54.0}, "unit": "ms"}, "finished": 1792976300.8295298, "exit_code": 0}

// Run B
{"id": "20261026-005731-9071", "tool": "ab", "status": "finished", "started": 1792976251.0854461, "params": {"TARGET_URL": "http://presentation-entry/api/products/cheapest", "REQUESTS": "5000", "CONCURRENCY": "50", "TIMEOUT": "30", "KEEPALIVE": "false"}, "summary": {"metrics": {"Requests/s": 2336.84, "Mean latency ms": 21.396, "Completed requests": 5000.0, "Failed requests": 0.0, "Non-2xx responses": 0, "Transfer rate KB/s": 3226.86, "Total time s": 2.14}, "percentiles": {"p50": 20.0, "p66": 24.0, "p75": 26.0, "p80": 27.0, "p90": 31.0, "p95": 35.0, "p98": 39.0, "p99": 43.0, "p100": 61.0}, "unit": "ms"}, "finished": 1792976253.304467, "exit_code": 0}
```

Ejecute el checkpoint y todo sigue correcto antes y despues de ejecutar las pruebas
---

## CP-B2 — Checkpoint antes del bloque de LB

```bash
docker compose ps -a
# son los mismos, nada ha cambiado
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
docker exec distributed-three-tier-presentation-keepalived-master-1 ip -4 -o addr show | grep 172.30.0.250 || echo "VIP de presentación NO está en el master"
# 2: eth0    inet 172.30.0.250/24 scope global secondary eth0\       valid_lft forever preferred_lft forever
docker exec distributed-three-tier-application-keepalived-master-1 ip -4 -o addr show | grep 172.31.0.250 || echo "VIP de aplicación NO está en el master"
# 2: eth0    inet 172.31.0.250/24 scope global secondary eth0\       valid_lft forever preferred_lft forever
```

---

## T08 — Failover LB de presentación

Capturas:

- `T08-lb-presentacion-1.png` — Availability + timeline + Chaos events

Resultados (eventos y availability; esto calculo el tiempo de failover):

```json
{"id": "20261026-034048-dc59", "tool": "chaosmonkey", "status": "finished", "started": 1792986048.6416278, "params": {"GROUP": "presentation-lb", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 94, "Probes failed": 3, "Availability %": 96.81, "Longest outage s": 1.0, "Avg probe latency ms": 3.4}, "events": [{"t": 3.5, "action": "stop", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 23.7, "action": "restore", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 24.9, "action": "restart", "service": "presentation-keepalived-master", "ok": true, "detail": ""}, {"t": 34.1, "action": "stop", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 54.3, "action": "restore", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 55.5, "action": "restart", "service": "presentation-keepalived-master", "ok": true, "detail": ""}, {"t": 64.7, "action": "stop", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 84.9, "action": "restore", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 86.0, "action": "restart", "service": "presentation-keepalived-master", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 34}, {"t": 1.1, "ok": true, "ms": 5}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": false, "ms": 3003}, {"t": 7.2, "ok": true, "ms": 3}, {"t": 8.2, "ok": true, "ms": 3}, {"t": 9.2, "ok": true, "ms": 3}, {"t": 10.2, "ok": true, "ms": 4}, {"t": 11.2, "ok": true, "ms": 3}, {"t": 12.2, "ok": true, "ms": 3}, {"t": 13.2, "ok": true, "ms": 3}, {"t": 14.2, "ok": true, "ms": 6}, {"t": 15.2, "ok": true, "ms": 3}, {"t": 16.2, "ok": true, "ms": 3}, {"t": 17.2, "ok": true, "ms": 3}, {"t": 18.2, "ok": true, "ms": 3}, {"t": 19.2, "ok": true, "ms": 4}, {"t": 20.2, "ok": true, "ms": 3}, {"t": 21.2, "ok": true, "ms": 3}, {"t": 22.2, "ok": true, "ms": 3}, {"t": 23.2, "ok": true, "ms": 5}, {"t": 24.2, "ok": true, "ms": 3}, {"t": 25.2, "ok": true, "ms": 3}, {"t": 26.2, "ok": true, "ms": 3}, {"t": 27.2, "ok": true, "ms": 5}, {"t": 28.2, "ok": true, "ms": 4}, {"t": 29.2, "ok": true, "ms": 3}, {"t": 30.2, "ok": true, "ms": 3}, {"t": 31.2, "ok": true, "ms": 3}, {"t": 32.2, "ok": true, "ms": 4}, {"t": 33.2, "ok": true, "ms": 3}, {"t": 34.2, "ok": false, "ms": 3004}, {"t": 37.2, "ok": true, "ms": 4}, {"t": 38.2, "ok": true, "ms": 3}, {"t": 39.2, "ok": true, "ms": 3}, {"t": 40.2, "ok": true, "ms": 3}, {"t": 41.2, "ok": true, "ms": 2}, {"t": 42.2, "ok": true, "ms": 2}, {"t": 43.2, "ok": true, "ms": 2}, {"t": 44.2, "ok": true, "ms": 4}, {"t": 45.2, "ok": true, "ms": 3}, {"t": 46.2, "ok": true, "ms": 2}, {"t": 47.2, "ok": true, "ms": 3}, {"t": 48.2, "ok": true, "ms": 3}, {"t": 49.2, "ok": true, "ms": 2}, {"t": 50.2, "ok": true, "ms": 3}, {"t": 51.2, "ok": true, "ms": 2}, {"t": 52.2, "ok": true, "ms": 2}, {"t": 53.2, "ok": true, "ms": 2}, {"t": 54.2, "ok": true, "ms": 5}, {"t": 55.2, "ok": true, "ms": 3}, {"t": 56.2, "ok": true, "ms": 3}, {"t": 57.2, "ok": true, "ms": 4}, {"t": 58.2, "ok": true, "ms": 7}, {"t": 59.2, "ok": true, "ms": 3}, {"t": 60.2, "ok": true, "ms": 2}, {"t": 61.2, "ok": true, "ms": 3}, {"t": 62.2, "ok": true, "ms": 3}, {"t": 63.2, "ok": true, "ms": 3}, {"t": 64.2, "ok": true, "ms": 3}, {"t": 65.2, "ok": false, "ms": 3004}, {"t": 68.2, "ok": true, "ms": 3}, {"t": 69.2, "ok": true, "ms": 3}, {"t": 70.2, "ok": true, "ms": 2}, {"t": 71.2, "ok": true, "ms": 3}, {"t": 72.2, "ok": true, "ms": 3}, {"t": 73.2, "ok": true, "ms": 3}, {"t": 74.2, "ok": true, "ms": 3}, {"t": 75.2, "ok": true, "ms": 3}, {"t": 76.2, "ok": true, "ms": 3}, {"t": 77.2, "ok": true, "ms": 3}, {"t": 78.2, "ok": true, "ms": 3}, {"t": 79.2, "ok": true, "ms": 3}, {"t": 80.2, "ok": true, "ms": 2}, {"t": 81.2, "ok": true, "ms": 3}, {"t": 82.2, "ok": true, "ms": 4}, {"t": 83.2, "ok": true, "ms": 2}, {"t": 84.2, "ok": true, "ms": 3}, {"t": 85.2, "ok": true, "ms": 3}, {"t": 86.2, "ok": true, "ms": 3}, {"t": 87.2, "ok": true, "ms": 2}, {"t": 88.2, "ok": true, "ms": 3}, {"t": 89.2, "ok": true, "ms": 2}, {"t": 90.2, "ok": true, "ms": 3}, {"t": 91.2, "ok": true, "ms": 3}, {"t": 92.2, "ok": true, "ms": 3}, {"t": 93.2, "ok": true, "ms": 3}, {"t": 94.2, "ok": true, "ms": 2}, {"t": 95.2, "ok": true, "ms": 3}, {"t": 96.2, "ok": true, "ms": 2}, {"t": 97.2, "ok": true, "ms": 2}, {"t": 98.2, "ok": true, "ms": 3}, {"t": 99.2, "ok": true, "ms": 3}]}, "finished": 1792986149.7977479, "exit_code": 0}
```

---

## T09 — Failover LB de aplicación

Capturas:

- `T09-lb-aplicacion-1.png`

Resultados:

```json
{"id": "20261026-034737-d967", "tool": "chaosmonkey", "status": "finished", "started": 1792986457.6347818, "params": {"GROUP": "application-lb", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 101, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 3.2}, "events": [{"t": 3.3, "action": "stop", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 23.5, "action": "restore", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 28.7, "action": "restart", "service": "application-keepalived-backup", "ok": true, "detail": ""}, {"t": 33.9, "action": "stop", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 54.1, "action": "restore", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 55.3, "action": "restart", "service": "application-keepalived-backup", "ok": true, "detail": ""}, {"t": 64.4, "action": "stop", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 84.6, "action": "restore", "service": "application-lb-backup", "ok": true, "detail": ""}, {"t": 85.8, "action": "restart", "service": "application-keepalived-backup", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 21}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 3}, {"t": 5.1, "ok": true, "ms": 3}, {"t": 6.1, "ok": true, "ms": 3}, {"t": 7.1, "ok": true, "ms": 3}, {"t": 8.1, "ok": true, "ms": 2}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 3}, {"t": 12.1, "ok": true, "ms": 2}, {"t": 13.1, "ok": true, "ms": 3}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 2}, {"t": 18.1, "ok": true, "ms": 2}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 2}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 4}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 2}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 3}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 2}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": true, "ms": 3}, {"t": 37.1, "ok": true, "ms": 2}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 2}, {"t": 43.1, "ok": true, "ms": 3}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 2}, {"t": 46.1, "ok": true, "ms": 3}, {"t": 47.1, "ok": true, "ms": 3}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 2}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 4}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 4}, {"t": 57.1, "ok": true, "ms": 4}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 4}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 5}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 2}, {"t": 68.1, "ok": true, "ms": 2}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 6}, {"t": 71.1, "ok": true, "ms": 3}, {"t": 72.1, "ok": true, "ms": 4}, {"t": 73.1, "ok": true, "ms": 3}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 3}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 4}, {"t": 82.1, "ok": true, "ms": 4}, {"t": 83.1, "ok": true, "ms": 4}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 2}, {"t": 100.1, "ok": true, "ms": 4}]}, "finished": 1792986558.554051, "exit_code": 0}
```

---

## T10 — Nodo web `web1` fuera

Capturas:

- `T10-web1-1.png`

Resultados:

```json
{"id": "20261026-035409-38c5", "tool": "chaosmonkey", "status": "finished", "started": 1792986849.7220707, "params": {"GROUP": "web", "TARGETS": "web1", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 88, "Probes failed": 6, "Availability %": 93.18, "Longest outage s": 1.0, "Avg probe latency ms": 3.7}, "events": [{"t": 3.4, "action": "stop", "service": "web1", "ok": true, "detail": ""}, {"t": 23.6, "action": "restore", "service": "web1", "ok": true, "detail": ""}, {"t": 33.9, "action": "stop", "service": "web1", "ok": true, "detail": ""}, {"t": 54.1, "action": "restore", "service": "web1", "ok": true, "detail": ""}, {"t": 64.4, "action": "stop", "service": "web1", "ok": true, "detail": ""}, {"t": 84.6, "action": "restore", "service": "web1", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 24}, {"t": 1.1, "ok": true, "ms": 5}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 3}, {"t": 5.1, "ok": false, "ms": 3003}, {"t": 8.1, "ok": true, "ms": 2}, {"t": 9.1, "ok": true, "ms": 2}, {"t": 10.1, "ok": false, "ms": 3004}, {"t": 13.1, "ok": true, "ms": 3}, {"t": 14.1, "ok": true, "ms": 2}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 2}, {"t": 18.1, "ok": true, "ms": 2}, {"t": 19.1, "ok": true, "ms": 2}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 2}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 4}, {"t": 28.1, "ok": true, "ms": 4}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 4}, {"t": 33.1, "ok": true, "ms": 4}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": false, "ms": 3003}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": false, "ms": 3004}, {"t": 46.1, "ok": true, "ms": 3}, {"t": 47.1, "ok": true, "ms": 3}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 5}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 2}, {"t": 53.1, "ok": true, "ms": 2}, {"t": 54.1, "ok": true, "ms": 3}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 6}, {"t": 58.1, "ok": true, "ms": 10}, {"t": 59.1, "ok": true, "ms": 5}, {"t": 60.1, "ok": true, "ms": 5}, {"t": 61.1, "ok": true, "ms": 9}, {"t": 62.1, "ok": true, "ms": 5}, {"t": 63.1, "ok": true, "ms": 4}, {"t": 64.1, "ok": true, "ms": 4}, {"t": 65.1, "ok": true, "ms": 5}, {"t": 66.1, "ok": false, "ms": 3004}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": false, "ms": 3004}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 4}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 3}, {"t": 78.1, "ok": true, "ms": 2}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 4}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 4}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 5}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 8}, {"t": 90.1, "ok": true, "ms": 5}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 4}, {"t": 94.1, "ok": true, "ms": 5}, {"t": 95.1, "ok": true, "ms": 5}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 2}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}]}, "finished": 1792986950.51852, "exit_code": 0}
```

Nota: la disponibilidad no es del 100%, sino del 93%
---

## T11 — Dos nodos web fuera

Capturas:

- `T11-web12-1.png`

Resultados:

```json
{"id": "20261026-040359-f25b", "tool": "chaosmonkey", "status": "finished", "started": 1792987439.6181574, "params": {"GROUP": "web", "TARGETS": "web1,web2", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "2", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 87, "Probes failed": 7, "Availability %": 91.95, "Longest outage s": 1.0, "Avg probe latency ms": 3.9}, "events": [{"t": 3.3, "action": "stop", "service": "web1", "ok": true, "detail": ""}, {"t": 23.6, "action": "restore", "service": "web1", "ok": true, "detail": ""}, {"t": 33.8, "action": "stop", "service": "web2", "ok": true, "detail": ""}, {"t": 54.3, "action": "restore", "service": "web2", "ok": true, "detail": ""}, {"t": 64.5, "action": "stop", "service": "web1", "ok": true, "detail": ""}, {"t": 84.8, "action": "restore", "service": "web1", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 25}, {"t": 1.1, "ok": true, "ms": 5}, {"t": 2.1, "ok": true, "ms": 2}, {"t": 3.1, "ok": true, "ms": 2}, {"t": 4.1, "ok": true, "ms": 2}, {"t": 5.1, "ok": false, "ms": 3004}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": false, "ms": 3004}, {"t": 13.1, "ok": true, "ms": 2}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 3}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 2}, {"t": 27.1, "ok": true, "ms": 4}, {"t": 28.1, "ok": true, "ms": 3}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 2}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 6}, {"t": 36.1, "ok": false, "ms": 3003}, {"t": 39.1, "ok": true, "ms": 4}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": false, "ms": 3005}, {"t": 44.1, "ok": true, "ms": 5}, {"t": 45.1, "ok": true, "ms": 5}, {"t": 46.1, "ok": true, "ms": 4}, {"t": 47.1, "ok": true, "ms": 5}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 4}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 6}, {"t": 53.1, "ok": true, "ms": 7}, {"t": 54.1, "ok": true, "ms": 6}, {"t": 55.1, "ok": true, "ms": 4}, {"t": 56.1, "ok": true, "ms": 7}, {"t": 57.1, "ok": true, "ms": 6}, {"t": 58.1, "ok": true, "ms": 5}, {"t": 59.1, "ok": true, "ms": 6}, {"t": 60.1, "ok": true, "ms": 4}, {"t": 61.1, "ok": true, "ms": 6}, {"t": 62.1, "ok": true, "ms": 5}, {"t": 63.1, "ok": true, "ms": 3}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": false, "ms": 3004}, {"t": 68.1, "ok": true, "ms": 7}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": false, "ms": 3004}, {"t": 73.1, "ok": true, "ms": 3}, {"t": 74.1, "ok": true, "ms": 2}, {"t": 75.1, "ok": false, "ms": 3004}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 4}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 4}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 6}, {"t": 88.1, "ok": true, "ms": 2}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 2}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 4}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 4}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 3}]}, "finished": 1792987540.60771, "exit_code": 0}
```
Nota: disponibilidad no fue del 100% sino del 91.95$

---

## T12 — Nodo de aplicación `app1` fuera

Capturas:

- `T12-app1-1.png`

Resultados:

```json
{"id": "20261026-040945-1cb4", "tool": "chaosmonkey", "status": "finished", "started": 1792987785.2942874, "params": {"GROUP": "app", "TARGETS": "app1", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 87, "Probes failed": 7, "Availability %": 91.95, "Longest outage s": 1.0, "Avg probe latency ms": 3.5}, "events": [{"t": 3.6, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 23.8, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 34.0, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 54.2, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 64.5, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 84.7, "action": "restore", "service": "app1", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 27}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 8}, {"t": 4.1, "ok": true, "ms": 3}, {"t": 5.1, "ok": false, "ms": 3005}, {"t": 8.2, "ok": true, "ms": 2}, {"t": 9.2, "ok": true, "ms": 3}, {"t": 10.2, "ok": false, "ms": 3004}, {"t": 13.2, "ok": true, "ms": 2}, {"t": 14.2, "ok": true, "ms": 4}, {"t": 15.2, "ok": true, "ms": 3}, {"t": 16.2, "ok": true, "ms": 2}, {"t": 17.2, "ok": true, "ms": 3}, {"t": 18.2, "ok": true, "ms": 4}, {"t": 19.2, "ok": true, "ms": 3}, {"t": 20.2, "ok": true, "ms": 3}, {"t": 21.2, "ok": true, "ms": 2}, {"t": 22.2, "ok": true, "ms": 3}, {"t": 23.2, "ok": true, "ms": 2}, {"t": 24.2, "ok": true, "ms": 3}, {"t": 25.2, "ok": true, "ms": 3}, {"t": 26.2, "ok": true, "ms": 2}, {"t": 27.2, "ok": true, "ms": 2}, {"t": 28.2, "ok": true, "ms": 2}, {"t": 29.2, "ok": true, "ms": 3}, {"t": 30.2, "ok": true, "ms": 3}, {"t": 31.2, "ok": true, "ms": 5}, {"t": 32.2, "ok": true, "ms": 3}, {"t": 33.2, "ok": true, "ms": 3}, {"t": 34.2, "ok": false, "ms": 3003}, {"t": 37.2, "ok": true, "ms": 2}, {"t": 38.2, "ok": true, "ms": 3}, {"t": 39.2, "ok": false, "ms": 3004}, {"t": 42.2, "ok": true, "ms": 3}, {"t": 43.2, "ok": true, "ms": 3}, {"t": 44.2, "ok": false, "ms": 3003}, {"t": 47.2, "ok": true, "ms": 3}, {"t": 48.2, "ok": true, "ms": 2}, {"t": 49.2, "ok": true, "ms": 2}, {"t": 50.2, "ok": true, "ms": 3}, {"t": 51.2, "ok": true, "ms": 3}, {"t": 52.2, "ok": true, "ms": 3}, {"t": 53.2, "ok": true, "ms": 3}, {"t": 54.2, "ok": true, "ms": 3}, {"t": 55.2, "ok": true, "ms": 3}, {"t": 56.2, "ok": true, "ms": 3}, {"t": 57.2, "ok": true, "ms": 2}, {"t": 58.2, "ok": true, "ms": 4}, {"t": 59.2, "ok": true, "ms": 3}, {"t": 60.2, "ok": true, "ms": 2}, {"t": 61.2, "ok": true, "ms": 8}, {"t": 62.2, "ok": true, "ms": 3}, {"t": 63.2, "ok": true, "ms": 4}, {"t": 64.2, "ok": true, "ms": 5}, {"t": 65.2, "ok": true, "ms": 6}, {"t": 66.2, "ok": true, "ms": 3}, {"t": 67.2, "ok": false, "ms": 3004}, {"t": 70.2, "ok": true, "ms": 5}, {"t": 71.2, "ok": true, "ms": 3}, {"t": 72.2, "ok": false, "ms": 3004}, {"t": 75.2, "ok": true, "ms": 2}, {"t": 76.2, "ok": true, "ms": 2}, {"t": 77.2, "ok": true, "ms": 3}, {"t": 78.2, "ok": true, "ms": 2}, {"t": 79.2, "ok": true, "ms": 2}, {"t": 80.2, "ok": true, "ms": 2}, {"t": 81.2, "ok": true, "ms": 3}, {"t": 82.2, "ok": true, "ms": 3}, {"t": 83.2, "ok": true, "ms": 3}, {"t": 84.2, "ok": true, "ms": 4}, {"t": 85.2, "ok": true, "ms": 7}, {"t": 86.2, "ok": true, "ms": 4}, {"t": 87.2, "ok": true, "ms": 4}, {"t": 88.2, "ok": true, "ms": 3}, {"t": 89.2, "ok": true, "ms": 3}, {"t": 90.2, "ok": true, "ms": 3}, {"t": 91.2, "ok": true, "ms": 6}, {"t": 92.2, "ok": true, "ms": 5}, {"t": 93.2, "ok": true, "ms": 3}, {"t": 94.2, "ok": true, "ms": 2}, {"t": 95.2, "ok": true, "ms": 5}, {"t": 96.2, "ok": true, "ms": 4}, {"t": 97.2, "ok": true, "ms": 3}, {"t": 98.2, "ok": true, "ms": 3}, {"t": 99.2, "ok": true, "ms": 3}, {"t": 100.2, "ok": true, "ms": 2}]}, "finished": 1792987886.1964984, "exit_code": 0}
```

---

## T13 — NEGATIVO: ambos LB de presentación (opcional)

Capturas:

- `T13-lb-ambos-1.png`

```bash
docker compose ps -a   # pegar el estado tras la prueba (todo debe estar Up de nuevo)
```

Resultados:

```json
{"id": "20261026-041024-939b", "tool": "chaosmonkey", "status": "finished", "started": 1792987824.79681, "params": {"GROUP": "web", "TARGETS": "presentation-lb-master,presentation-lb-backup", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "2", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 99, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 23.7}, "events": [{"t": 3.4, "action": "stop", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 23.6, "action": "restore", "service": "presentation-lb-master", "ok": true, "detail": ""}, {"t": 24.8, "action": "restart", "service": "presentation-keepalived-master", "ok": true, "detail": ""}, {"t": 34.0, "action": "stop", "service": "presentation-lb-backup", "ok": true, "detail": ""}, {"t": 54.2, "action": "restore", "service": "presentation-lb-backup", "ok": true, "detail": ""}, {"t": 55.4, "action": "restart", "service": "presentation-keepalived-backup", "ok": true, "detail": ""}, {"t": 64.7, "action": "stop", "service": "presentation-lb-backup", "ok": true, "detail": ""}, {"t": 84.8, "action": "restore", "service": "presentation-lb-backup", "ok": true, "detail": ""}, {"t": 86.1, "action": "restart", "service": "presentation-keepalived-backup", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 17}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 6}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 2038}, {"t": 6.1, "ok": true, "ms": 2}, {"t": 7.1, "ok": true, "ms": 4}, {"t": 8.1, "ok": true, "ms": 4}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 2}, {"t": 12.1, "ok": true, "ms": 3}, {"t": 13.1, "ok": true, "ms": 3}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 2}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 3}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 4}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 3}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 4}, {"t": 36.1, "ok": true, "ms": 2}, {"t": 37.1, "ok": true, "ms": 3}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": true, "ms": 2}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 2}, {"t": 46.1, "ok": true, "ms": 3}, {"t": 47.1, "ok": true, "ms": 4}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 2}, {"t": 52.1, "ok": true, "ms": 3}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 3}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 3}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 3}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 3}, {"t": 68.1, "ok": true, "ms": 3}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": true, "ms": 2}, {"t": 72.1, "ok": true, "ms": 3}, {"t": 73.1, "ok": true, "ms": 3}, {"t": 74.1, "ok": true, "ms": 2}, {"t": 75.1, "ok": true, "ms": 2}, {"t": 76.1, "ok": true, "ms": 2}, {"t": 77.1, "ok": true, "ms": 2}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 2}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 4}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.2, "ok": true, "ms": 2}, {"t": 91.2, "ok": true, "ms": 3}, {"t": 92.2, "ok": true, "ms": 3}, {"t": 93.2, "ok": true, "ms": 3}, {"t": 94.2, "ok": true, "ms": 3}, {"t": 95.2, "ok": true, "ms": 3}, {"t": 96.2, "ok": true, "ms": 4}, {"t": 97.2, "ok": true, "ms": 3}, {"t": 98.2, "ok": true, "ms": 3}, {"t": 99.2, "ok": true, "ms": 3}]}, "finished": 1792987925.5747678, "exit_code": 0}

```

---

## CP-B3 — Checkpoint antes del bloque de datos

```bash
docker compose ps -a
# todos los servicios activos y sin cambios
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"

# Variable_name   Value
# wsrep_cluster_size      3
# Variable_name   Value
# wsrep_local_state_comment       Synced
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'
# mongodb:27017 PRIMARY
# mongodb2:27017 SECONDARY
# mongodb3:27017 SECONDARY
```

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
# OK 3 usable Sentinels. Quorum and failover authorization can be reached
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
# he
# name
# catalog-cache
# ip
# redis
# port
# 6379
# runid
# 317d3497f672b08688907ecd5ade6d5299b1064e
# flags
# master
# link-pending-commands
# 0
# link-refcount
# 1
# last-ping-sent
# 0
# last-ok-ping-reply
# 29
# last-ping-reply
# 29
# down-after-milliseconds
# 5000
# info-refresh
# 1090
# role-reported
# master
# role-reported-time
# 34979432
# config-epoch
# 0
# num-slaves
# 2
# num-other-sentinels
# 2
# quorum
# 2
# failover-timeout
# 30000
# parallel-syncs
# 1
```

---

## T14 — Galera `galera2` fuera

Capturas:

- `T14-galera2-1.png`

Estado de Galera durante/después (cluster_size vuelve a 3):

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
```
Nota: ejecute este comando durante el downtime y despues del downtime, efectivamente el cluster size fue de 2 y despues regreso a 3.

Resultados:

```json
{"id": "20261026-042016-16d0", "tool": "chaosmonkey", "status": "finished", "started": 1792988416.7011104, "params": {"GROUP": "galera", "TARGETS": "galera2", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 101, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 3.8}, "events": [{"t": 3.6, "action": "stop", "service": "galera2", "ok": true, "detail": ""}, {"t": 23.8, "action": "restore", "service": "galera2", "ok": true, "detail": ""}, {"t": 34.4, "action": "stop", "service": "galera2", "ok": true, "detail": ""}, {"t": 54.6, "action": "restore", "service": "galera2", "ok": true, "detail": ""}, {"t": 65.1, "action": "stop", "service": "galera2", "ok": true, "detail": ""}, {"t": 85.2, "action": "restore", "service": "galera2", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 19}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 4}, {"t": 5.1, "ok": true, "ms": 3}, {"t": 6.1, "ok": true, "ms": 3}, {"t": 7.1, "ok": true, "ms": 3}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 2}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 4}, {"t": 12.1, "ok": true, "ms": 3}, {"t": 13.1, "ok": true, "ms": 3}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 2}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 4}, {"t": 20.1, "ok": true, "ms": 2}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 4}, {"t": 23.1, "ok": true, "ms": 3}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 4}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 4}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 4}, {"t": 35.1, "ok": true, "ms": 5}, {"t": 36.1, "ok": true, "ms": 3}, {"t": 37.1, "ok": true, "ms": 3}, {"t": 38.1, "ok": true, "ms": 6}, {"t": 39.1, "ok": true, "ms": 6}, {"t": 40.1, "ok": true, "ms": 4}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": true, "ms": 3}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 4}, {"t": 46.1, "ok": true, "ms": 3}, {"t": 47.1, "ok": true, "ms": 4}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 8}, {"t": 50.1, "ok": true, "ms": 4}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 3}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 3}, {"t": 55.1, "ok": true, "ms": 4}, {"t": 56.1, "ok": true, "ms": 7}, {"t": 57.1, "ok": true, "ms": 5}, {"t": 58.1, "ok": true, "ms": 5}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 4}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 4}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 5}, {"t": 66.1, "ok": true, "ms": 6}, {"t": 67.1, "ok": true, "ms": 7}, {"t": 68.1, "ok": true, "ms": 6}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": true, "ms": 3}, {"t": 72.1, "ok": true, "ms": 3}, {"t": 73.1, "ok": true, "ms": 4}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 4}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 4}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 4}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 4}, {"t": 89.1, "ok": true, "ms": 4}, {"t": 90.1, "ok": true, "ms": 8}, {"t": 91.1, "ok": true, "ms": 4}, {"t": 92.1, "ok": true, "ms": 4}, {"t": 93.1, "ok": true, "ms": 4}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 4}, {"t": 97.1, "ok": true, "ms": 4}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 3}]}, "finished": 1792988517.5980477, "exit_code": 0}
```

---

## T15 — Galera `galera1` (bootstrap) fuera

Capturas:

- `T15-galera1-1.png`

Estado de Galera antes y después:

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera2-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
```

Resultados:

```json
{"id": "20261026-042008-7f40", "tool": "chaosmonkey", "status": "finished", "started": 1792988408.314579, "params": {"GROUP": "web", "TARGETS": "galera1", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 89, "Probes failed": 14, "Availability %": 84.27, "Longest outage s": 8.0, "Avg probe latency ms": 3.1}, "events": [{"t": 4.7, "action": "stop", "service": "galera1", "ok": true, "detail": ""}, {"t": 24.9, "action": "restore", "service": "galera1", "ok": true, "detail": ""}, {"t": 36.5, "action": "stop", "service": "galera1", "ok": true, "detail": ""}, {"t": 56.7, "action": "restore", "service": "galera1", "ok": true, "detail": ""}, {"t": 67.3, "action": "stop", "service": "galera1", "ok": true, "detail": ""}, {"t": 87.5, "action": "restore", "service": "galera1", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 14}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": false, "ms": 120}, {"t": 5.1, "ok": false, "ms": 3001}, {"t": 8.1, "ok": false, "ms": 3003}, {"t": 11.1, "ok": false, "ms": 1872}, {"t": 12.9, "ok": false, "ms": 1}, {"t": 13.9, "ok": false, "ms": 1}, {"t": 14.9, "ok": false, "ms": 1}, {"t": 15.9, "ok": false, "ms": 1}, {"t": 16.9, "ok": true, "ms": 2}, {"t": 17.9, "ok": true, "ms": 3}, {"t": 18.9, "ok": true, "ms": 3}, {"t": 19.9, "ok": true, "ms": 3}, {"t": 20.9, "ok": true, "ms": 3}, {"t": 21.9, "ok": true, "ms": 3}, {"t": 22.9, "ok": true, "ms": 3}, {"t": 23.9, "ok": true, "ms": 2}, {"t": 24.9, "ok": true, "ms": 3}, {"t": 25.9, "ok": true, "ms": 3}, {"t": 26.9, "ok": true, "ms": 2}, {"t": 27.9, "ok": true, "ms": 2}, {"t": 28.9, "ok": true, "ms": 3}, {"t": 29.9, "ok": true, "ms": 2}, {"t": 30.9, "ok": true, "ms": 3}, {"t": 31.9, "ok": true, "ms": 3}, {"t": 32.9, "ok": true, "ms": 2}, {"t": 33.9, "ok": true, "ms": 3}, {"t": 34.9, "ok": true, "ms": 2}, {"t": 35.9, "ok": false, "ms": 29}, {"t": 36.9, "ok": false, "ms": 3002}, {"t": 39.9, "ok": false, "ms": 1036}, {"t": 41.0, "ok": true, "ms": 4}, {"t": 42.0, "ok": true, "ms": 4}, {"t": 43.0, "ok": true, "ms": 3}, {"t": 44.0, "ok": true, "ms": 4}, {"t": 45.0, "ok": true, "ms": 3}, {"t": 46.0, "ok": true, "ms": 4}, {"t": 47.0, "ok": true, "ms": 3}, {"t": 48.0, "ok": true, "ms": 3}, {"t": 49.0, "ok": true, "ms": 2}, {"t": 50.0, "ok": true, "ms": 3}, {"t": 51.0, "ok": true, "ms": 3}, {"t": 52.0, "ok": true, "ms": 3}, {"t": 53.0, "ok": true, "ms": 3}, {"t": 54.0, "ok": true, "ms": 3}, {"t": 55.0, "ok": true, "ms": 3}, {"t": 56.0, "ok": true, "ms": 3}, {"t": 57.0, "ok": true, "ms": 3}, {"t": 58.0, "ok": true, "ms": 3}, {"t": 59.0, "ok": true, "ms": 2}, {"t": 60.0, "ok": true, "ms": 3}, {"t": 61.0, "ok": true, "ms": 3}, {"t": 62.0, "ok": true, "ms": 3}, {"t": 63.0, "ok": true, "ms": 3}, {"t": 64.0, "ok": true, "ms": 3}, {"t": 65.0, "ok": true, "ms": 3}, {"t": 66.0, "ok": true, "ms": 5}, {"t": 67.0, "ok": false, "ms": 3003}, {"t": 70.0, "ok": false, "ms": 3001}, {"t": 73.0, "ok": false, "ms": 2096}, {"t": 75.1, "ok": true, "ms": 5}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 3}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 2}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 2}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 4}, {"t": 100.1, "ok": true, "ms": 3}]}, "finished": 1792988509.4216146, "exit_code": 0}
```

---

## T16 — Primario de MongoDB fuera

Capturas:

- `T16-mongo-primario-1.png`

Quién es PRIMARY antes y quién queda después:

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'

# Antes de ejecutar el test, mongodb era el primario
# mongodb:27017 PRIMARY
# mongodb2:27017 SECONDARY
# mongodb3:27017 SECONDARY

# Despues de ejecutar el test, mongodb2 era el primario
# mongodb:27017 SECONDARY
# mongodb2:27017 PRIMARY
# mongodb3:27017 SECONDARY
```

Resultados:

```json
{"id": "20261026-042627-3952", "tool": "chaosmonkey", "status": "finished", "started": 1792988787.7279932, "params": {"GROUP": "mongodb", "TARGETS": "mongodb", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 105, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 3.6}, "events": [{"t": 13.3, "action": "stop", "service": "mongodb", "ok": true, "detail": ""}, {"t": 33.5, "action": "restore", "service": "mongodb", "ok": true, "detail": ""}, {"t": 53.7, "action": "stop", "service": "mongodb", "ok": true, "detail": ""}, {"t": 73.9, "action": "restore", "service": "mongodb", "ok": true, "detail": ""}, {"t": 94.0, "action": "stop", "service": "mongodb", "ok": true, "detail": ""}, {"t": 94.7, "action": "restore", "service": "mongodb", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 23}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 4}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 11}, {"t": 5.1, "ok": true, "ms": 4}, {"t": 6.1, "ok": true, "ms": 4}, {"t": 7.1, "ok": true, "ms": 5}, {"t": 8.1, "ok": true, "ms": 8}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": true, "ms": 7}, {"t": 11.1, "ok": true, "ms": 3}, {"t": 12.1, "ok": true, "ms": 8}, {"t": 13.1, "ok": true, "ms": 10}, {"t": 14.1, "ok": true, "ms": 2}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 2}, {"t": 22.1, "ok": true, "ms": 4}, {"t": 23.1, "ok": true, "ms": 2}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 2}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 3}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 2}, {"t": 31.1, "ok": true, "ms": 4}, {"t": 32.1, "ok": true, "ms": 2}, {"t": 33.1, "ok": true, "ms": 2}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": true, "ms": 2}, {"t": 37.1, "ok": true, "ms": 3}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": true, "ms": 2}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": true, "ms": 3}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 3}, {"t": 46.1, "ok": true, "ms": 4}, {"t": 47.1, "ok": true, "ms": 3}, {"t": 48.1, "ok": true, "ms": 10}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 2}, {"t": 52.1, "ok": true, "ms": 3}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 5}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 3}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 4}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 3}, {"t": 68.1, "ok": true, "ms": 2}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": true, "ms": 3}, {"t": 72.1, "ok": true, "ms": 3}, {"t": 73.1, "ok": true, "ms": 3}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 2}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 2}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 2}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 4}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 4}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 4}, {"t": 101.1, "ok": true, "ms": 3}, {"t": 102.1, "ok": true, "ms": 3}, {"t": 103.1, "ok": true, "ms": 4}, {"t": 104.1, "ok": true, "ms": 4}]}, "finished": 1792988893.1250682, "exit_code": 0}
```

---

## T17 — Mayoría de MongoDB caída ⚠

Capturas:

- `T17-mongo-mayoria-1.png`

Estado del replica set después de restaurar:

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'

# Ejecutado despues del test
# mongodb:27017 SECONDARY
# mongodb2:27017 SECONDARY
# mongodb3:27017 PRIMARY
```

Resultados (aquí se esperan fallos visibles; anota el error exacto si aparece):
En el panel se menciona que fallaron 3 pruebas, pero ningun error visible en la consola, de hecho, veo resultados bastante buenos.

```json
{"id": "20261026-043248-5b3c", "tool": "chaosmonkey", "status": "finished", "started": 1792989168.1542835, "params": {"GROUP": "mongodb", "TARGETS": "mongodb,mongodb2", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "30", "DURATION": "120", "MAX_CONCURRENT": "2", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 125, "Probes failed": 3, "Availability %": 97.6, "Longest outage s": 3.0, "Avg probe latency ms": 11.3}, "events": [{"t": 13.4, "action": "stop", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 43.6, "action": "restore", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 53.8, "action": "stop", "service": "mongodb", "ok": true, "detail": ""}, {"t": 83.9, "action": "restore", "service": "mongodb", "ok": true, "detail": ""}, {"t": 94.1, "action": "stop", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 120.3, "action": "restore", "service": "mongodb2", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 24}, {"t": 1.1, "ok": true, "ms": 5}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 4}, {"t": 4.1, "ok": true, "ms": 10}, {"t": 5.1, "ok": true, "ms": 5}, {"t": 6.1, "ok": true, "ms": 5}, {"t": 7.1, "ok": true, "ms": 4}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 5}, {"t": 10.2, "ok": true, "ms": 4}, {"t": 11.2, "ok": true, "ms": 3}, {"t": 12.2, "ok": true, "ms": 6}, {"t": 13.2, "ok": true, "ms": 6}, {"t": 14.2, "ok": true, "ms": 4}, {"t": 15.2, "ok": true, "ms": 3}, {"t": 16.2, "ok": true, "ms": 3}, {"t": 17.2, "ok": true, "ms": 5}, {"t": 18.2, "ok": true, "ms": 3}, {"t": 19.2, "ok": true, "ms": 3}, {"t": 20.2, "ok": true, "ms": 3}, {"t": 21.2, "ok": true, "ms": 3}, {"t": 22.2, "ok": true, "ms": 4}, {"t": 23.2, "ok": true, "ms": 3}, {"t": 24.2, "ok": true, "ms": 3}, {"t": 25.2, "ok": true, "ms": 3}, {"t": 26.2, "ok": true, "ms": 3}, {"t": 27.2, "ok": true, "ms": 3}, {"t": 28.2, "ok": true, "ms": 3}, {"t": 29.2, "ok": true, "ms": 3}, {"t": 30.2, "ok": true, "ms": 3}, {"t": 31.2, "ok": true, "ms": 3}, {"t": 32.2, "ok": true, "ms": 3}, {"t": 33.2, "ok": true, "ms": 5}, {"t": 34.2, "ok": true, "ms": 3}, {"t": 35.2, "ok": true, "ms": 3}, {"t": 36.2, "ok": true, "ms": 2}, {"t": 37.2, "ok": true, "ms": 4}, {"t": 38.2, "ok": true, "ms": 3}, {"t": 39.2, "ok": true, "ms": 3}, {"t": 40.2, "ok": true, "ms": 3}, {"t": 41.2, "ok": true, "ms": 3}, {"t": 42.2, "ok": true, "ms": 2}, {"t": 43.2, "ok": true, "ms": 3}, {"t": 44.2, "ok": false, "ms": 3004}, {"t": 47.2, "ok": false, "ms": 3004}, {"t": 50.2, "ok": false, "ms": 3003}, {"t": 53.2, "ok": true, "ms": 973}, {"t": 54.2, "ok": true, "ms": 3}, {"t": 55.2, "ok": true, "ms": 3}, {"t": 56.2, "ok": true, "ms": 3}, {"t": 57.2, "ok": true, "ms": 3}, {"t": 58.2, "ok": true, "ms": 3}, {"t": 59.2, "ok": true, "ms": 3}, {"t": 60.2, "ok": true, "ms": 3}, {"t": 61.2, "ok": true, "ms": 3}, {"t": 62.2, "ok": true, "ms": 3}, {"t": 63.2, "ok": true, "ms": 3}, {"t": 64.2, "ok": true, "ms": 3}, {"t": 65.2, "ok": true, "ms": 3}, {"t": 66.2, "ok": true, "ms": 3}, {"t": 67.2, "ok": true, "ms": 3}, {"t": 68.2, "ok": true, "ms": 2}, {"t": 69.2, "ok": true, "ms": 3}, {"t": 70.2, "ok": true, "ms": 3}, {"t": 71.2, "ok": true, "ms": 3}, {"t": 72.2, "ok": true, "ms": 3}, {"t": 73.2, "ok": true, "ms": 3}, {"t": 74.2, "ok": true, "ms": 3}, {"t": 75.2, "ok": true, "ms": 3}, {"t": 76.2, "ok": true, "ms": 3}, {"t": 77.2, "ok": true, "ms": 3}, {"t": 78.2, "ok": true, "ms": 3}, {"t": 79.2, "ok": true, "ms": 3}, {"t": 80.2, "ok": true, "ms": 3}, {"t": 81.2, "ok": true, "ms": 4}, {"t": 82.2, "ok": true, "ms": 2}, {"t": 83.2, "ok": true, "ms": 3}, {"t": 84.2, "ok": true, "ms": 4}, {"t": 85.2, "ok": true, "ms": 3}, {"t": 86.2, "ok": true, "ms": 3}, {"t": 87.2, "ok": true, "ms": 3}, {"t": 88.2, "ok": true, "ms": 2}, {"t": 89.2, "ok": true, "ms": 3}, {"t": 90.2, "ok": true, "ms": 3}, {"t": 91.2, "ok": true, "ms": 3}, {"t": 92.2, "ok": true, "ms": 3}, {"t": 93.2, "ok": true, "ms": 3}, {"t": 94.2, "ok": true, "ms": 3}, {"t": 95.2, "ok": true, "ms": 3}, {"t": 96.2, "ok": true, "ms": 3}, {"t": 97.2, "ok": true, "ms": 3}, {"t": 98.2, "ok": true, "ms": 3}, {"t": 99.2, "ok": true, "ms": 3}, {"t": 100.2, "ok": true, "ms": 3}, {"t": 101.2, "ok": true, "ms": 3}, {"t": 102.2, "ok": true, "ms": 3}, {"t": 103.2, "ok": true, "ms": 3}, {"t": 104.2, "ok": true, "ms": 3}, {"t": 105.2, "ok": true, "ms": 3}, {"t": 106.2, "ok": true, "ms": 3}, {"t": 107.2, "ok": true, "ms": 2}, {"t": 108.2, "ok": true, "ms": 2}, {"t": 109.2, "ok": true, "ms": 3}, {"t": 110.2, "ok": true, "ms": 3}, {"t": 111.2, "ok": true, "ms": 3}, {"t": 112.2, "ok": true, "ms": 3}, {"t": 113.2, "ok": true, "ms": 3}, {"t": 114.2, "ok": true, "ms": 3}, {"t": 115.2, "ok": true, "ms": 3}, {"t": 116.2, "ok": true, "ms": 2}, {"t": 117.2, "ok": true, "ms": 3}, {"t": 118.2, "ok": true, "ms": 3}, {"t": 119.2, "ok": true, "ms": 3}, {"t": 120.2, "ok": true, "ms": 3}, {"t": 121.2, "ok": true, "ms": 3}, {"t": 122.2, "ok": true, "ms": 3}, {"t": 123.2, "ok": true, "ms": 4}, {"t": 124.2, "ok": true, "ms": 3}, {"t": 125.2, "ok": true, "ms": 3}, {"t": 126.2, "ok": true, "ms": 4}, {"t": 127.2, "ok": true, "ms": 3}, {"t": 128.2, "ok": true, "ms": 4}, {"t": 129.2, "ok": true, "ms": 3}, {"t": 130.2, "ok": true, "ms": 2}]}, "finished": 1792989299.1193016, "exit_code": 0}
```

---

## T18 — Master de Redis fuera

Capturas:

- `T18-redis-master-1.png`

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
curl -s http://localhost/api/health; echo

# todo en orden despues de ejecutar esos checks
```

Resultados:

```json
{"id": "20261026-044416-e695", "tool": "chaosmonkey", "status": "finished", "started": 1792989856.036438, "params": {"GROUP": "redis", "TARGETS": "redis", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "30", "DURATION": "120", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 4, "Probes sent": 131, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 4.4}, "events": [{"t": 3.5, "action": "stop", "service": "redis", "ok": true, "detail": ""}, {"t": 33.8, "action": "restore", "service": "redis", "ok": true, "detail": ""}, {"t": 34.2, "action": "stop", "service": "redis", "ok": true, "detail": ""}, {"t": 64.4, "action": "restore", "service": "redis", "ok": true, "detail": ""}, {"t": 64.7, "action": "stop", "service": "redis", "ok": true, "detail": ""}, {"t": 94.9, "action": "restore", "service": "redis", "ok": true, "detail": ""}, {"t": 95.1, "action": "stop", "service": "redis", "ok": true, "detail": ""}, {"t": 120.3, "action": "restore", "service": "redis", "ok": true, "detail": ""}], "timeline": [{"t": 0.2, "ok": true, "ms": 27}, {"t": 1.2, "ok": true, "ms": 4}, {"t": 2.2, "ok": true, "ms": 4}, {"t": 3.2, "ok": true, "ms": 4}, {"t": 4.2, "ok": true, "ms": 5}, {"t": 5.2, "ok": true, "ms": 4}, {"t": 6.2, "ok": true, "ms": 4}, {"t": 7.2, "ok": true, "ms": 5}, {"t": 8.2, "ok": true, "ms": 4}, {"t": 9.2, "ok": true, "ms": 5}, {"t": 10.2, "ok": true, "ms": 8}, {"t": 11.2, "ok": true, "ms": 6}, {"t": 12.2, "ok": true, "ms": 4}, {"t": 13.2, "ok": true, "ms": 4}, {"t": 14.2, "ok": true, "ms": 4}, {"t": 15.2, "ok": true, "ms": 3}, {"t": 16.2, "ok": true, "ms": 5}, {"t": 17.2, "ok": true, "ms": 3}, {"t": 18.2, "ok": true, "ms": 3}, {"t": 19.2, "ok": true, "ms": 5}, {"t": 20.2, "ok": true, "ms": 3}, {"t": 21.2, "ok": true, "ms": 4}, {"t": 22.2, "ok": true, "ms": 4}, {"t": 23.2, "ok": true, "ms": 6}, {"t": 24.2, "ok": true, "ms": 5}, {"t": 25.2, "ok": true, "ms": 3}, {"t": 26.2, "ok": true, "ms": 4}, {"t": 27.2, "ok": true, "ms": 5}, {"t": 28.2, "ok": true, "ms": 6}, {"t": 29.2, "ok": true, "ms": 6}, {"t": 30.2, "ok": true, "ms": 8}, {"t": 31.2, "ok": true, "ms": 4}, {"t": 32.2, "ok": true, "ms": 4}, {"t": 33.2, "ok": true, "ms": 8}, {"t": 34.2, "ok": true, "ms": 7}, {"t": 35.2, "ok": true, "ms": 5}, {"t": 36.2, "ok": true, "ms": 4}, {"t": 37.2, "ok": true, "ms": 7}, {"t": 38.2, "ok": true, "ms": 4}, {"t": 39.2, "ok": true, "ms": 5}, {"t": 40.2, "ok": true, "ms": 4}, {"t": 41.2, "ok": true, "ms": 5}, {"t": 42.2, "ok": true, "ms": 4}, {"t": 43.2, "ok": true, "ms": 6}, {"t": 44.2, "ok": true, "ms": 3}, {"t": 45.2, "ok": true, "ms": 13}, {"t": 46.2, "ok": true, "ms": 4}, {"t": 47.2, "ok": true, "ms": 5}, {"t": 48.2, "ok": true, "ms": 3}, {"t": 49.2, "ok": true, "ms": 3}, {"t": 50.2, "ok": true, "ms": 5}, {"t": 51.2, "ok": true, "ms": 4}, {"t": 52.2, "ok": true, "ms": 5}, {"t": 53.2, "ok": true, "ms": 4}, {"t": 54.2, "ok": true, "ms": 4}, {"t": 55.2, "ok": true, "ms": 3}, {"t": 56.2, "ok": true, "ms": 4}, {"t": 57.2, "ok": true, "ms": 3}, {"t": 58.2, "ok": true, "ms": 4}, {"t": 59.2, "ok": true, "ms": 4}, {"t": 60.2, "ok": true, "ms": 5}, {"t": 61.2, "ok": true, "ms": 4}, {"t": 62.2, "ok": true, "ms": 5}, {"t": 63.2, "ok": true, "ms": 3}, {"t": 64.2, "ok": true, "ms": 3}, {"t": 65.2, "ok": true, "ms": 5}, {"t": 66.2, "ok": true, "ms": 4}, {"t": 67.2, "ok": true, "ms": 4}, {"t": 68.2, "ok": true, "ms": 4}, {"t": 69.2, "ok": true, "ms": 4}, {"t": 70.2, "ok": true, "ms": 3}, {"t": 71.2, "ok": true, "ms": 4}, {"t": 72.2, "ok": true, "ms": 3}, {"t": 73.2, "ok": true, "ms": 3}, {"t": 74.2, "ok": true, "ms": 3}, {"t": 75.2, "ok": true, "ms": 3}, {"t": 76.2, "ok": true, "ms": 3}, {"t": 77.2, "ok": true, "ms": 4}, {"t": 78.2, "ok": true, "ms": 3}, {"t": 79.2, "ok": true, "ms": 5}, {"t": 80.2, "ok": true, "ms": 3}, {"t": 81.2, "ok": true, "ms": 3}, {"t": 82.2, "ok": true, "ms": 3}, {"t": 83.2, "ok": true, "ms": 10}, {"t": 84.2, "ok": true, "ms": 4}, {"t": 85.2, "ok": true, "ms": 3}, {"t": 86.2, "ok": true, "ms": 7}, {"t": 87.2, "ok": true, "ms": 4}, {"t": 88.2, "ok": true, "ms": 3}, {"t": 89.2, "ok": true, "ms": 4}, {"t": 90.2, "ok": true, "ms": 4}, {"t": 91.2, "ok": true, "ms": 3}, {"t": 92.2, "ok": true, "ms": 4}, {"t": 93.2, "ok": true, "ms": 7}, {"t": 94.2, "ok": true, "ms": 5}, {"t": 95.2, "ok": true, "ms": 3}, {"t": 96.2, "ok": true, "ms": 3}, {"t": 97.2, "ok": true, "ms": 5}, {"t": 98.2, "ok": true, "ms": 2}, {"t": 99.2, "ok": true, "ms": 3}, {"t": 100.2, "ok": true, "ms": 3}, {"t": 101.2, "ok": true, "ms": 2}, {"t": 102.2, "ok": true, "ms": 3}, {"t": 103.2, "ok": true, "ms": 3}, {"t": 104.2, "ok": true, "ms": 2}, {"t": 105.2, "ok": true, "ms": 3}, {"t": 106.2, "ok": true, "ms": 3}, {"t": 107.2, "ok": true, "ms": 6}, {"t": 108.2, "ok": true, "ms": 5}, {"t": 109.2, "ok": true, "ms": 16}, {"t": 110.2, "ok": true, "ms": 3}, {"t": 111.2, "ok": true, "ms": 4}, {"t": 112.2, "ok": true, "ms": 3}, {"t": 113.2, "ok": true, "ms": 3}, {"t": 114.2, "ok": true, "ms": 3}, {"t": 115.2, "ok": true, "ms": 2}, {"t": 116.2, "ok": true, "ms": 3}, {"t": 117.2, "ok": true, "ms": 4}, {"t": 118.2, "ok": true, "ms": 3}, {"t": 119.2, "ok": true, "ms": 2}, {"t": 120.2, "ok": true, "ms": 4}, {"t": 121.2, "ok": true, "ms": 3}, {"t": 122.2, "ok": true, "ms": 4}, {"t": 123.2, "ok": true, "ms": 3}, {"t": 124.2, "ok": true, "ms": 2}, {"t": 125.2, "ok": true, "ms": 2}, {"t": 126.2, "ok": true, "ms": 2}, {"t": 127.2, "ok": true, "ms": 5}, {"t": 128.2, "ok": true, "ms": 3}, {"t": 129.2, "ok": true, "ms": 3}, {"t": 130.2, "ok": true, "ms": 3}]}, "finished": 1792989987.0694494, "exit_code": 0}
```

---

## T19 — Sentinel `redis-sentinel1` fuera

Capturas:

- `T19-sentinel-1.png`

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
# OK 3 usable Sentinels. Quorum and failover authorization can be reached
```

Resultados:

```json
{"id": "20261026-044857-ae63", "tool": "chaosmonkey", "status": "finished", "started": 1792990137.4999032, "params": {"GROUP": "redis", "TARGETS": "redis-sentinel1", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "20", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 101, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 4.0}, "events": [{"t": 3.3, "action": "stop", "service": "redis-sentinel1", "ok": true, "detail": ""}, {"t": 23.6, "action": "restore", "service": "redis-sentinel1", "ok": true, "detail": ""}, {"t": 33.8, "action": "stop", "service": "redis-sentinel1", "ok": true, "detail": ""}, {"t": 54.0, "action": "restore", "service": "redis-sentinel1", "ok": true, "detail": ""}, {"t": 64.2, "action": "stop", "service": "redis-sentinel1", "ok": true, "detail": ""}, {"t": 84.4, "action": "restore", "service": "redis-sentinel1", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 27}, {"t": 1.1, "ok": true, "ms": 4}, {"t": 2.1, "ok": true, "ms": 5}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 3}, {"t": 5.1, "ok": true, "ms": 3}, {"t": 6.1, "ok": true, "ms": 3}, {"t": 7.1, "ok": true, "ms": 3}, {"t": 8.1, "ok": true, "ms": 4}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 4}, {"t": 12.1, "ok": true, "ms": 14}, {"t": 13.1, "ok": true, "ms": 4}, {"t": 14.1, "ok": true, "ms": 4}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 3}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 5}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 7}, {"t": 21.1, "ok": true, "ms": 5}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 5}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 4}, {"t": 29.1, "ok": true, "ms": 4}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 6}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 4}, {"t": 34.1, "ok": true, "ms": 5}, {"t": 35.1, "ok": true, "ms": 6}, {"t": 36.1, "ok": true, "ms": 6}, {"t": 37.1, "ok": true, "ms": 4}, {"t": 38.1, "ok": true, "ms": 4}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 10}, {"t": 42.1, "ok": true, "ms": 4}, {"t": 43.1, "ok": true, "ms": 4}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 3}, {"t": 46.1, "ok": true, "ms": 4}, {"t": 47.1, "ok": true, "ms": 4}, {"t": 48.1, "ok": true, "ms": 5}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 4}, {"t": 51.1, "ok": true, "ms": 4}, {"t": 52.1, "ok": true, "ms": 4}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 5}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 5}, {"t": 63.1, "ok": true, "ms": 4}, {"t": 64.1, "ok": true, "ms": 4}, {"t": 65.1, "ok": true, "ms": 3}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 3}, {"t": 68.1, "ok": true, "ms": 4}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 2}, {"t": 71.1, "ok": true, "ms": 11}, {"t": 72.1, "ok": true, "ms": 3}, {"t": 73.1, "ok": true, "ms": 4}, {"t": 74.1, "ok": true, "ms": 2}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": true, "ms": 2}, {"t": 77.1, "ok": true, "ms": 3}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 4}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 2}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 4}]}, "finished": 1792990238.6137521, "exit_code": 0}
```

---

## CP-B4 — Checkpoint antes del bloque de chaos

```bash
docker compose ps -a
curl -s http://localhost/api/health
```

---

## T20 — Chaos Dry run

Capturas:

- `T20-chaos-dryrun-1.png`

```bash
docker compose ps -a   # pegar para confirmar que ningún contenedor fue afectado
```

Resultados:

```json
{"id": "20261026-044226-21be", "tool": "chaosmonkey", "status": "finished", "started": 1792989746.382545, "params": {"GROUP": "any", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "15", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "true"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 101, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 2.6}, "events": [{"t": 3.1, "action": "stop(dry-run)", "service": "mongodb", "ok": true, "detail": ""}, {"t": 18.1, "action": "restore(dry-run)", "service": "mongodb", "ok": true, "detail": ""}, {"t": 33.1, "action": "stop(dry-run)", "service": "redis3", "ok": true, "detail": ""}, {"t": 48.1, "action": "restore(dry-run)", "service": "redis3", "ok": true, "detail": ""}, {"t": 63.1, "action": "stop(dry-run)", "service": "redis", "ok": true, "detail": ""}, {"t": 78.1, "action": "restore(dry-run)", "service": "redis", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 13}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 2}, {"t": 4.1, "ok": true, "ms": 2}, {"t": 5.1, "ok": true, "ms": 3}, {"t": 6.1, "ok": true, "ms": 2}, {"t": 7.1, "ok": true, "ms": 3}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 2}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 3}, {"t": 12.1, "ok": true, "ms": 2}, {"t": 13.1, "ok": true, "ms": 2}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 2}, {"t": 17.1, "ok": true, "ms": 2}, {"t": 18.1, "ok": true, "ms": 2}, {"t": 19.1, "ok": true, "ms": 2}, {"t": 20.1, "ok": true, "ms": 2}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 2}, {"t": 23.1, "ok": true, "ms": 2}, {"t": 24.1, "ok": true, "ms": 2}, {"t": 25.1, "ok": true, "ms": 2}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 2}, {"t": 28.1, "ok": true, "ms": 2}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 2}, {"t": 32.1, "ok": true, "ms": 2}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": true, "ms": 2}, {"t": 37.1, "ok": true, "ms": 2}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 2}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": true, "ms": 2}, {"t": 44.1, "ok": true, "ms": 3}, {"t": 45.1, "ok": true, "ms": 3}, {"t": 46.1, "ok": true, "ms": 2}, {"t": 47.1, "ok": true, "ms": 2}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 2}, {"t": 50.1, "ok": true, "ms": 2}, {"t": 51.1, "ok": true, "ms": 2}, {"t": 52.1, "ok": true, "ms": 2}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 3}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 2}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 2}, {"t": 62.1, "ok": true, "ms": 2}, {"t": 63.1, "ok": true, "ms": 2}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 3}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 2}, {"t": 68.1, "ok": true, "ms": 3}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": true, "ms": 2}, {"t": 72.1, "ok": true, "ms": 2}, {"t": 73.1, "ok": true, "ms": 2}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 2}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 3}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 2}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 2}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 2}, {"t": 87.1, "ok": true, "ms": 2}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 2}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 2}, {"t": 97.1, "ok": true, "ms": 2}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 2}, {"t": 100.1, "ok": true, "ms": 2}]}, "finished": 1792989847.0780022, "exit_code": 0}
```

---

## T21 — Chaos grupo `web`

Capturas:

- `T21-chaos-web-1.png`

Resultados:

```json
{"id": "20261026-052438-d780", "tool": "chaosmonkey", "status": "finished", "started": 1792992278.4068332, "params": {"GROUP": "web", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "15", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 88, "Probes failed": 6, "Availability %": 93.18, "Longest outage s": 1.0, "Avg probe latency ms": 2.9}, "events": [{"t": 3.5, "action": "stop", "service": "web3", "ok": true, "detail": ""}, {"t": 18.8, "action": "restore", "service": "web3", "ok": true, "detail": ""}, {"t": 34.2, "action": "stop", "service": "web3", "ok": true, "detail": ""}, {"t": 49.4, "action": "restore", "service": "web3", "ok": true, "detail": ""}, {"t": 64.8, "action": "stop", "service": "web3", "ok": true, "detail": ""}, {"t": 80.0, "action": "restore", "service": "web3", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 15}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 3}, {"t": 5.1, "ok": true, "ms": 2}, {"t": 6.1, "ok": false, "ms": 3003}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": false, "ms": 3004}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 2}, {"t": 16.1, "ok": true, "ms": 2}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 2}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 3}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 3}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 2}, {"t": 28.1, "ok": true, "ms": 3}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 4}, {"t": 32.1, "ok": true, "ms": 2}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": false, "ms": 3001}, {"t": 39.1, "ok": true, "ms": 2}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": false, "ms": 3003}, {"t": 44.2, "ok": true, "ms": 3}, {"t": 45.2, "ok": true, "ms": 3}, {"t": 46.2, "ok": true, "ms": 3}, {"t": 47.2, "ok": true, "ms": 3}, {"t": 48.2, "ok": true, "ms": 3}, {"t": 49.2, "ok": true, "ms": 3}, {"t": 50.2, "ok": true, "ms": 2}, {"t": 51.2, "ok": true, "ms": 3}, {"t": 52.2, "ok": true, "ms": 2}, {"t": 53.2, "ok": true, "ms": 3}, {"t": 54.2, "ok": true, "ms": 2}, {"t": 55.2, "ok": true, "ms": 3}, {"t": 56.2, "ok": true, "ms": 2}, {"t": 57.2, "ok": true, "ms": 3}, {"t": 58.2, "ok": true, "ms": 3}, {"t": 59.2, "ok": true, "ms": 3}, {"t": 60.2, "ok": true, "ms": 3}, {"t": 61.2, "ok": true, "ms": 3}, {"t": 62.2, "ok": true, "ms": 3}, {"t": 63.2, "ok": true, "ms": 3}, {"t": 64.2, "ok": true, "ms": 2}, {"t": 65.2, "ok": true, "ms": 3}, {"t": 66.2, "ok": true, "ms": 3}, {"t": 67.2, "ok": false, "ms": 3004}, {"t": 70.2, "ok": true, "ms": 3}, {"t": 71.2, "ok": true, "ms": 3}, {"t": 72.2, "ok": false, "ms": 3004}, {"t": 75.2, "ok": true, "ms": 2}, {"t": 76.2, "ok": true, "ms": 3}, {"t": 77.2, "ok": true, "ms": 3}, {"t": 78.2, "ok": true, "ms": 2}, {"t": 79.2, "ok": true, "ms": 3}, {"t": 80.2, "ok": true, "ms": 2}, {"t": 81.2, "ok": true, "ms": 3}, {"t": 82.2, "ok": true, "ms": 2}, {"t": 83.2, "ok": true, "ms": 3}, {"t": 84.2, "ok": true, "ms": 3}, {"t": 85.2, "ok": true, "ms": 2}, {"t": 86.2, "ok": true, "ms": 3}, {"t": 87.2, "ok": true, "ms": 3}, {"t": 88.2, "ok": true, "ms": 3}, {"t": 89.2, "ok": true, "ms": 3}, {"t": 90.2, "ok": true, "ms": 3}, {"t": 91.2, "ok": true, "ms": 3}, {"t": 92.2, "ok": true, "ms": 3}, {"t": 93.2, "ok": true, "ms": 2}, {"t": 94.2, "ok": true, "ms": 3}, {"t": 95.2, "ok": true, "ms": 3}, {"t": 96.2, "ok": true, "ms": 3}, {"t": 97.2, "ok": true, "ms": 3}, {"t": 98.2, "ok": true, "ms": 3}, {"t": 99.2, "ok": true, "ms": 3}]}, "finished": 1792992379.1278648, "exit_code": 0}
```

---

## T22 — Chaos grupo `app`

Capturas:

- `T22-chaos-app-1.png`

Resultados:

```json
{"id": "20261026-052903-3c70", "tool": "chaosmonkey", "status": "finished", "started": 1792992543.8620827, "params": {"GROUP": "app", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "15", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 85, "Probes failed": 8, "Availability %": 90.59, "Longest outage s": 1.0, "Avg probe latency ms": 3.2}, "events": [{"t": 3.4, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 18.7, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 34.0, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 49.2, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 64.5, "action": "stop", "service": "app3", "ok": true, "detail": ""}, {"t": 79.7, "action": "restore", "service": "app3", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 13}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 3}, {"t": 4.1, "ok": true, "ms": 2}, {"t": 5.1, "ok": false, "ms": 3002}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 3}, {"t": 10.1, "ok": false, "ms": 3003}, {"t": 13.1, "ok": true, "ms": 3}, {"t": 14.1, "ok": true, "ms": 2}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 2}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 2}, {"t": 19.1, "ok": true, "ms": 4}, {"t": 20.1, "ok": true, "ms": 9}, {"t": 21.1, "ok": true, "ms": 2}, {"t": 22.1, "ok": true, "ms": 2}, {"t": 23.1, "ok": true, "ms": 2}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 4}, {"t": 26.1, "ok": true, "ms": 2}, {"t": 27.1, "ok": true, "ms": 2}, {"t": 28.1, "ok": true, "ms": 4}, {"t": 29.1, "ok": true, "ms": 3}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": false, "ms": 3001}, {"t": 37.1, "ok": true, "ms": 3}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": false, "ms": 3003}, {"t": 42.1, "ok": true, "ms": 3}, {"t": 43.1, "ok": true, "ms": 3}, {"t": 44.1, "ok": false, "ms": 3004}, {"t": 47.1, "ok": true, "ms": 3}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 3}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 6}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 4}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 3}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 4}, {"t": 66.1, "ok": false, "ms": 3004}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": false, "ms": 3004}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": false, "ms": 3004}, {"t": 79.1, "ok": true, "ms": 3}, {"t": 80.1, "ok": true, "ms": 3}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 4}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 3}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 2}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 4}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 2}, {"t": 97.1, "ok": true, "ms": 4}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 3}]}, "finished": 1792992644.6945467, "exita
```

---

## T23 — Chaos grupo `mongodb`

Capturas:

- `T23-chaos-mongo-1.png`

Resultados:

```json
{"id": "20261026-053304-36b4", "tool": "chaosmonkey", "status": "finished", "started": 1792992784.8112597, "params": {"GROUP": "mongodb", "TARGETS": "", "ACTION": "stop", "INTERVAL": "30", "DOWNTIME": "15", "DURATION": "90", "MAX_CONCURRENT": "1", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 3, "Probes sent": 105, "Probes failed": 0, "Availability %": 100.0, "Longest outage s": 0.0, "Avg probe latency ms": 3.1}, "events": [{"t": 13.3, "action": "stop", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 28.5, "action": "restore", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 53.7, "action": "stop", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 68.9, "action": "restore", "service": "mongodb2", "ok": true, "detail": ""}, {"t": 94.1, "action": "stop", "service": "mongodb3", "ok": true, "detail": ""}, {"t": 94.8, "action": "restore", "service": "mongodb3", "ok": true, "detail": ""}], "timeline": [{"t": 0.1, "ok": true, "ms": 16}, {"t": 1.1, "ok": true, "ms": 3}, {"t": 2.1, "ok": true, "ms": 3}, {"t": 3.1, "ok": true, "ms": 4}, {"t": 4.1, "ok": true, "ms": 4}, {"t": 5.1, "ok": true, "ms": 3}, {"t": 6.1, "ok": true, "ms": 3}, {"t": 7.1, "ok": true, "ms": 3}, {"t": 8.1, "ok": true, "ms": 3}, {"t": 9.1, "ok": true, "ms": 4}, {"t": 10.1, "ok": true, "ms": 3}, {"t": 11.1, "ok": true, "ms": 4}, {"t": 12.1, "ok": true, "ms": 3}, {"t": 13.1, "ok": true, "ms": 7}, {"t": 14.1, "ok": true, "ms": 3}, {"t": 15.1, "ok": true, "ms": 3}, {"t": 16.1, "ok": true, "ms": 2}, {"t": 17.1, "ok": true, "ms": 3}, {"t": 18.1, "ok": true, "ms": 3}, {"t": 19.1, "ok": true, "ms": 3}, {"t": 20.1, "ok": true, "ms": 3}, {"t": 21.1, "ok": true, "ms": 3}, {"t": 22.1, "ok": true, "ms": 3}, {"t": 23.1, "ok": true, "ms": 2}, {"t": 24.1, "ok": true, "ms": 3}, {"t": 25.1, "ok": true, "ms": 2}, {"t": 26.1, "ok": true, "ms": 3}, {"t": 27.1, "ok": true, "ms": 3}, {"t": 28.1, "ok": true, "ms": 4}, {"t": 29.1, "ok": true, "ms": 4}, {"t": 30.1, "ok": true, "ms": 3}, {"t": 31.1, "ok": true, "ms": 3}, {"t": 32.1, "ok": true, "ms": 3}, {"t": 33.1, "ok": true, "ms": 3}, {"t": 34.1, "ok": true, "ms": 3}, {"t": 35.1, "ok": true, "ms": 3}, {"t": 36.1, "ok": true, "ms": 3}, {"t": 37.1, "ok": true, "ms": 3}, {"t": 38.1, "ok": true, "ms": 3}, {"t": 39.1, "ok": true, "ms": 3}, {"t": 40.1, "ok": true, "ms": 3}, {"t": 41.1, "ok": true, "ms": 3}, {"t": 42.1, "ok": true, "ms": 2}, {"t": 43.1, "ok": true, "ms": 2}, {"t": 44.1, "ok": true, "ms": 4}, {"t": 45.1, "ok": true, "ms": 3}, {"t": 46.1, "ok": true, "ms": 3}, {"t": 47.1, "ok": true, "ms": 3}, {"t": 48.1, "ok": true, "ms": 3}, {"t": 49.1, "ok": true, "ms": 3}, {"t": 50.1, "ok": true, "ms": 3}, {"t": 51.1, "ok": true, "ms": 3}, {"t": 52.1, "ok": true, "ms": 3}, {"t": 53.1, "ok": true, "ms": 3}, {"t": 54.1, "ok": true, "ms": 3}, {"t": 55.1, "ok": true, "ms": 3}, {"t": 56.1, "ok": true, "ms": 3}, {"t": 57.1, "ok": true, "ms": 3}, {"t": 58.1, "ok": true, "ms": 3}, {"t": 59.1, "ok": true, "ms": 3}, {"t": 60.1, "ok": true, "ms": 3}, {"t": 61.1, "ok": true, "ms": 3}, {"t": 62.1, "ok": true, "ms": 3}, {"t": 63.1, "ok": true, "ms": 3}, {"t": 64.1, "ok": true, "ms": 3}, {"t": 65.1, "ok": true, "ms": 3}, {"t": 66.1, "ok": true, "ms": 3}, {"t": 67.1, "ok": true, "ms": 2}, {"t": 68.1, "ok": true, "ms": 3}, {"t": 69.1, "ok": true, "ms": 3}, {"t": 70.1, "ok": true, "ms": 3}, {"t": 71.1, "ok": true, "ms": 2}, {"t": 72.1, "ok": true, "ms": 3}, {"t": 73.1, "ok": true, "ms": 2}, {"t": 74.1, "ok": true, "ms": 3}, {"t": 75.1, "ok": true, "ms": 3}, {"t": 76.1, "ok": true, "ms": 3}, {"t": 77.1, "ok": true, "ms": 2}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 2}, {"t": 80.1, "ok": true, "ms": 4}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 3}, {"t": 86.1, "ok": true, "ms": 3}, {"t": 87.1, "ok": true, "ms": 3}, {"t": 88.1, "ok": true, "ms": 4}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": true, "ms": 3}, {"t": 91.1, "ok": true, "ms": 3}, {"t": 92.1, "ok": true, "ms": 3}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": true, "ms": 3}, {"t": 95.1, "ok": true, "ms": 3}, {"t": 96.1, "ok": true, "ms": 3}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 3}, {"t": 101.1, "ok": true, "ms": 3}, {"t": 102.1, "ok": true, "ms": 3}, {"t": 103.1, "ok": true, "ms": 3}, {"t": 104.1, "ok": true, "ms": 2}]}, "finished": 1792992890.2185493, "exit_code": 0}
```

---

## T24 — Compuesto (carga + fallos)

Capturas:

- `T24-compuesto-1.png` — resultado del run de Siege
- `T24-compuesto-2.png` — resultado del run de Chaos

Resultados (los dos JSON, Siege y Chaos):

```json
{"id": "20261026-053903-b819", "tool": "siege", "status": "finished", "started": 1792993143.527607, "params": {"URLS": "http://presentation-entry/\nhttp://presentation-entry/api/health\nhttp://presentation-entry/api/products/cheapest", "CONCURRENCY": "50", "DURATION": "60", "BENCHMARK": "true", "DELAY": "1"}, "summary": {"metrics": {"Transactions": 62321.0, "Availability %": 99.49, "Elapsed s": 60.41, "Data MB": 83.77, "Avg response s": 0.05, "Transactions/s": 1031.63, "Throughput MB/s": 1.39, "Avg concurrency": 49.3, "Successful": 62321.0, "Failed": 317.0, "Longest s": 8.04, "Shortest s": 0.0}}, "finished": 1792993204.0540414, "exit_code": 0}

{"id": "20261026-053913-9952", "tool": "chaosmonkey", "status": "finished", "started": 1792993153.8793259, "params": {"GROUP": "app", "TARGETS": "", "ACTION": "stop", "INTERVAL": "10", "DOWNTIME": "20", "DURATION": "120", "MAX_CONCURRENT": "2", "PROBE_URL": "http://presentation-entry/api/health", "DRY_RUN": "false"}, "summary": {"metrics": {"Faults injected": 9, "Probes sent": 103, "Probes failed": 13, "Availability %": 87.38, "Longest outage s": 2.0, "Avg probe latency ms": 67.2}, "events": [{"t": 10.4, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 26.9, "action": "stop", "service": "app3", "ok": true, "detail": ""}, {"t": 31.4, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 43.9, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 47.9, "action": "restore", "service": "app3", "ok": true, "detail": ""}, {"t": 54.2, "action": "stop", "service": "app3", "ok": true, "detail": ""}, {"t": 64.5, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 74.8, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 75.6, "action": "restore", "service": "app3", "ok": true, "detail": ""}, {"t": 85.4, "action": "stop", "service": "app2", "ok": true, "detail": ""}, {"t": 95.1, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 95.9, "action": "stop", "service": "app1", "ok": true, "detail": ""}, {"t": 105.7, "action": "restore", "service": "app2", "ok": true, "detail": ""}, {"t": 106.5, "action": "stop", "service": "app3", "ok": true, "detail": ""}, {"t": 116.2, "action": "restore", "service": "app1", "ok": true, "detail": ""}, {"t": 117.0, "action": "stop", "service": "app2", "ok": true, "detail": ""}, {"t": 120.3, "action": "restore", "service": "app3", "ok": true, "detail": ""}, {"t": 120.6, "action": "restore", "service": "app2", "ok": true, "detail": ""}], "timeline": [{"t": 1.0, "ok": true, "ms": 61}, {"t": 2.0, "ok": true, "ms": 15}, {"t": 3.0, "ok": true, "ms": 29}, {"t": 4.0, "ok": true, "ms": 80}, {"t": 5.0, "ok": true, "ms": 3}, {"t": 6.0, "ok": true, "ms": 2}, {"t": 7.0, "ok": false, "ms": 3003}, {"t": 10.0, "ok": true, "ms": 2}, {"t": 11.0, "ok": true, "ms": 25}, {"t": 12.0, "ok": true, "ms": 15}, {"t": 13.0, "ok": true, "ms": 17}, {"t": 14.0, "ok": true, "ms": 18}, {"t": 15.0, "ok": true, "ms": 13}, {"t": 16.0, "ok": true, "ms": 37}, {"t": 17.0, "ok": true, "ms": 47}, {"t": 18.0, "ok": true, "ms": 25}, {"t": 19.0, "ok": true, "ms": 91}, {"t": 20.0, "ok": true, "ms": 44}, {"t": 21.0, "ok": true, "ms": 4}, {"t": 22.0, "ok": false, "ms": 3004}, {"t": 25.0, "ok": true, "ms": 2}, {"t": 26.0, "ok": true, "ms": 3}, {"t": 27.0, "ok": true, "ms": 52}, {"t": 28.0, "ok": true, "ms": 46}, {"t": 29.0, "ok": true, "ms": 54}, {"t": 30.0, "ok": true, "ms": 49}, {"t": 31.0, "ok": true, "ms": 43}, {"t": 32.0, "ok": true, "ms": 96}, {"t": 33.0, "ok": true, "ms": 73}, {"t": 34.0, "ok": true, "ms": 75}, {"t": 35.0, "ok": true, "ms": 128}, {"t": 36.0, "ok": true, "ms": 91}, {"t": 37.0, "ok": true, "ms": 109}, {"t": 38.0, "ok": true, "ms": 7}, {"t": 39.0, "ok": false, "ms": 3004}, {"t": 42.0, "ok": true, "ms": 6}, {"t": 43.0, "ok": false, "ms": 3003}, {"t": 46.0, "ok": true, "ms": 16}, {"t": 47.0, "ok": true, "ms": 13}, {"t": 48.0, "ok": true, "ms": 136}, {"t": 49.0, "ok": true, "ms": 195}, {"t": 50.0, "ok": true, "ms": 7}, {"t": 51.0, "ok": true, "ms": 6}, {"t": 52.0, "ok": true, "ms": 3}, {"t": 53.0, "ok": true, "ms": 2}, {"t": 54.0, "ok": true, "ms": 3}, {"t": 55.0, "ok": false, "ms": 3004}, {"t": 58.0, "ok": true, "ms": 2}, {"t": 59.0, "ok": false, "ms": 3004}, {"t": 62.0, "ok": true, "ms": 2}, {"t": 63.0, "ok": true, "ms": 2061}, {"t": 65.0, "ok": true, "ms": 2}, {"t": 66.0, "ok": true, "ms": 3}, {"t": 67.0, "ok": true, "ms": 2}, {"t": 68.0, "ok": true, "ms": 3}, {"t": 69.0, "ok": true, "ms": 3}, {"t": 70.0, "ok": true, "ms": 3}, {"t": 71.0, "ok": true, "ms": 4}, {"t": 72.0, "ok": true, "ms": 3}, {"t": 73.0, "ok": true, "ms": 4}, {"t": 74.0, "ok": true, "ms": 3}, {"t": 75.0, "ok": true, "ms": 1049}, {"t": 76.1, "ok": true, "ms": 2}, {"t": 77.1, "ok": true, "ms": 4}, {"t": 78.1, "ok": true, "ms": 3}, {"t": 79.1, "ok": true, "ms": 4}, {"t": 80.1, "ok": true, "ms": 2}, {"t": 81.1, "ok": true, "ms": 3}, {"t": 82.1, "ok": true, "ms": 3}, {"t": 83.1, "ok": true, "ms": 3}, {"t": 84.1, "ok": true, "ms": 3}, {"t": 85.1, "ok": true, "ms": 5}, {"t": 86.1, "ok": false, "ms": 3001}, {"t": 89.1, "ok": true, "ms": 3}, {"t": 90.1, "ok": false, "ms": 3003}, {"t": 93.1, "ok": true, "ms": 3}, {"t": 94.1, "ok": false, "ms": 3004}, {"t": 97.1, "ok": true, "ms": 3}, {"t": 98.1, "ok": true, "ms": 3}, {"t": 99.1, "ok": true, "ms": 3}, {"t": 100.1, "ok": true, "ms": 3}, {"t": 101.1, "ok": true, "ms": 3}, {"t": 102.1, "ok": true, "ms": 3}, {"t": 103.1, "ok": true, "ms": 3}, {"t": 104.1, "ok": true, "ms": 3}, {"t": 105.1, "ok": true, "ms": 3}, {"t": 106.1, "ok": true, "ms": 4}, {"t": 107.1, "ok": false, "ms": 3002}, {"t": 110.1, "ok": false, "ms": 3004}, {"t": 113.1, "ok": true, "ms": 4}, {"t": 114.1, "ok": false, "ms": 3004}, {"t": 117.1, "ok": false, "ms": 3004}, {"t": 120.1, "ok": true, "ms": 1048}, {"t": 121.2, "ok": true, "ms": 4}, {"t": 122.2, "ok": true, "ms": 5}, {"t": 123.2, "ok": true, "ms": 3}, {"t": 124.2, "ok": true, "ms": 3}, {"t": 125.2, "ok": true, "ms": 5}, {"t": 126.2, "ok": true, "ms": 4}, {"t": 127.2, "ok": true, "ms": 4}, {"t": 128.2, "ok": true, "ms": 3}, {"t": 129.2, "ok": true, "ms": 4}, {"t": 130.2, "ok": true, "ms": 3}]}, "finished": 1792993285.3066819, "exit_code": 0}
```

---

## CP-B5 — Checkpoint antes/después del bloque de observabilidad

```bash
docker compose ps -a
curl -s http://localhost/api/health
```

---

## T25 — Nagios detecta un fallo

Capturas:

- `T25-nagios-1.png` — Nagios en CRITICAL durante la caída
- `T25-nagios-2.png` — Nagios vuelto a OK

```bash
curl -s http://localhost/api/health; echo   # estado tras la prueba
```

Servicios que cambiaron de estado y tiempo de detección observado (escribe aquí):

```text
web1 fue el primero en estar "Down", aunque nagios tardo un par de minutos en detectar el cambio, parece logico ya que en la interfaz web dice que se recarga cada 90 segundos.
despues web1 volvio sin problema y web2 fue el que se detuvo.
durante un rato web2 estuvo inactivo pero volvio sin problemas.

Nota: se tomo una tercera foto `T25-nagios-3.png` de la pantalla de chaos monkey mostrando el test, las primeras fotos son de nagios
```

---

## T26 — History global del panel

Capturas:

- `T26-history-1.png`

---

## CP final — estado del sistema al terminar todo

```bash
docker compose ps -a
# exactamente como el primer check
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
# x-request-trace: presentation-lb-master -> webnode3 -> application-lb-master -> app1
# x-request-trace: presentation-lb-master -> webnode1 -> application-lb-master -> app2
# x-request-trace: presentation-lb-master -> webnode2 -> application-lb-master -> app3
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"

# Variable_name   Value
# wsrep_cluster_size      3
# Variable_name   Value
# wsrep_local_state_comment       Synced

docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'

# mongodb:27017 SECONDARY
# mongodb2:27017 SECONDARY
# mongodb3:27017 PRIMARY

docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
# OK 3 usable Sentinels. Quorum and failover authorization can be reached
```

---

## Incidencias durante la campaña (contenedores caídos, runs interrumpidos, etc.)

```text
el unico contenedor que "daba problemas" fue galera1, cada vez que se apagaba e intentaba encender, ya sea porque la maquina host se apagaba controladamente, y en la parte de los tests con galera cuando se "apago", ya no "regreso" automaticamente. este fue el problema que haye:
1. Incidente actual: galera1 caído  
- docker compose ps: distributed-three-tier-galera1-1 en Exited (1) hace ~14 min.  
- Log: Persisted data detected. Restoring + safe_to_bootstrap=0 → el contenedor intenta bootstrap y se niega.  
- Consecuencia: wsrep_cluster_size = 2 (quorum aún válido, pero sin redundancia completa).  
- Nagios muestra galera1 como DOWN / TCP CRITICAL (esto es esperado mientras el contenedor esté caído).

y esta fue la solucion que ejecute:
Recuperación de galera1 (hacer antes de B5)
No fuerces bootstrap mientras galera2/galera3 están sanos. Usa un override temporal sin modificar docker-compose.yml:
cat > /tmp/opencode/galera-override.yml <<'EOF'
services:
  galera1:
    environment:
      MARIADB_GALERA_CLUSTER_BOOTSTRAP: "no"
EOF

docker compose -f docker-compose.yml -f /tmp/opencode/galera-override.yml up -d galera1
Luego verifica:
docker compose ps -a | grep galera1
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
Esperado: galera1 Up (healthy), wsrep_cluster_size = 3, Synced. Si se recupera así, el incidente queda documentado como “rejoin por IST/SST, sin bootstrap forzado”.

---
despues de eso, galera1 volvio a la normalidad.
```
