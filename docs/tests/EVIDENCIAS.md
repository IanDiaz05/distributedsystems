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

---

## T00 — Salud y round-robin

Capturas:

- `T00-salud-1.png` — tienda `http://localhost/`
- `T00-salud-2.png` — Nagios, Service Detail sin CRITICAL

```bash
curl -s http://localhost/api/health
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
curl -s http://localhost/api/products/cheapest | head -c 300; echo
curl -s http://localhost/api/products/ST-001/reviews | head -c 300; echo
```

---

## CP-B1 — Checkpoint antes del bloque de rendimiento

```bash
docker compose ps -a
curl -s http://localhost/api/health
```

---

## T01 — ab Smoke

Capturas:

- `T01-ab-smoke-1.png` — Output data + Latency percentiles

Resultados (JSON de `/api/runs/<id>`):

```json

```

---

## T02 — ab Load

Capturas:

- `T02-ab-load-1.png`

Resultados:

```json

```

---

## T03 — ab Stress

Capturas:

- `T03-ab-stress-1.png`

Resultados (añade nota si aparecen fallos):

```json

```

---

## T04 — Siege Load

Capturas:

- `T04-siege-load-1.png`

Resultados:

```json

```

---

## T05 — JMeter Load

Capturas:

- `T05-jmeter-load-1.png` — panel (tarjetas + percentiles + Per request)
- `T05-jmeter-load-2.png` — informe HTML (botón *Open JMeter HTML report*)

Resultados:

```json

```

---

## T06 — JMeter Stress

Capturas:

- `T06-jmeter-stress-1.png` — panel
- `T06-jmeter-stress-2.png` — informe HTML

Resultados (nota el primer síntoma de saturación):

```json

```

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

```

---

## CP-B2 — Checkpoint antes del bloque de LB

```bash
docker compose ps -a
curl -s http://localhost/api/health
docker exec distributed-three-tier-presentation-keepalived-master-1 ip -4 -o addr show | grep 172.30.0.250 || echo "VIP de presentación NO está en el master"
docker exec distributed-three-tier-application-keepalived-master-1 ip -4 -o addr show | grep 172.31.0.250 || echo "VIP de aplicación NO está en el master"
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
