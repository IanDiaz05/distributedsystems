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

```

---

## T09 — Failover LB de aplicación

Capturas:

- `T09-lb-aplicacion-1.png`

Resultados:

```json

```

---

## T10 — Nodo web `web1` fuera

Capturas:

- `T10-web1-1.png`

Resultados:

```json

```

---

## T11 — Dos nodos web fuera

Capturas:

- `T11-web12-1.png`

Resultados:

```json

```

---

## T12 — Nodo de aplicación `app1` fuera

Capturas:

- `T12-app1-1.png`

Resultados:

```json

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

```

---

## CP-B3 — Checkpoint antes del bloque de datos

```bash
docker compose ps -a
curl -s http://localhost/api/health
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

Resultados:

```json

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
```

Resultados:

```json

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
```

Resultados (aquí se esperan fallos visibles; anota el error exacto si aparece):

```json

```

---

## T18 — Master de Redis fuera

Capturas:

- `T18-redis-master-1.png`

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
curl -s http://localhost/api/health; echo
```

Resultados:

```json

```

---

## T19 — Sentinel `redis-sentinel1` fuera

Capturas:

- `T19-sentinel-1.png`

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
```

Resultados:

```json

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

```

---

## T21 — Chaos grupo `web`

Capturas:

- `T21-chaos-web-1.png`

Resultados:

```json

```

---

## T22 — Chaos grupo `app`

Capturas:

- `T22-chaos-app-1.png`

Resultados:

```json

```

---

## T23 — Chaos grupo `mongodb`

Capturas:

- `T23-chaos-mongo-1.png`

Resultados:

```json

```

---

## T24 — Compuesto (carga + fallos)

Capturas:

- `T24-compuesto-1.png` — resultado del run de Siege
- `T24-compuesto-2.png` — resultado del run de Chaos

Resultados (los dos JSON, Siege y Chaos):

```json

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

```

---

## T26 — History global del panel

Capturas:

- `T26-history-1.png`

---

## CP final — estado del sistema al terminar todo

```bash
docker compose ps -a
curl -s http://localhost/api/health
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
```

---

## Incidencias durante la campaña (contenedores caídos, runs interrumpidos, etc.)

```text

```
