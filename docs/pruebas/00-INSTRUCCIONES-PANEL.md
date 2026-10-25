# Ejecución de pruebas desde el panel del Resilience Lab

Este documento contiene el **procedimiento exacto de todas las pruebas**, pensado
para lanzarlas desde el panel web del laboratorio (`http://localhost:8090`),
tomar las capturas con nombre fijo y dejar la evidencia donde corresponde.

Compañeros de este documento:

- `docs/tests/EVIDENCIAS.md` — plantilla vacía con el nombre de cada captura y
  los huecos donde pegarás salidas de comandos, respuestas HTTP y métricas.
- `docs/tests/evidencias/img/` — carpeta donde guardas las capturas PNG.

---

## 1. URLs y credenciales

| Qué | URL | Credenciales |
|---|---|---|
| Tienda (entrada) | `http://localhost/` | — |
| API (vía nginx) | `http://localhost/api/health` | — |
| Panel del lab | `http://localhost:8090` | — |
| Nagios | `http://localhost:8088/` | `nagiosadmin` / `NAGIOSADMIN_PASSWORD` de `.env` |

Arranque y parada ordenada del conjunto: `docs/START-DOWN.md`.
Requisito: el stack principal **y** el laboratorio arriba antes de empezar
(`docker compose ps` y `docker compose ls`).

## 2. Convención de evidencias (importante)

1. **Capturas PNG** → carpeta `docs/tests/evidencias/img/` con **exactamente**
   el nombre indicado en cada prueba (p. ej. `T08-lb-presentacion-1.png`).
   Si sacas una segunda captura de la misma prueba, sigue con `-2`, `-3`.
2. **Salidas de comandos, respuestas HTTP o logs** → bloque correspondiente en
   `docs/tests/EVIDENCIAS.md`.
3. **Métricas exactas** (cuando la captura no basta o quieras que valide los
   números sin leer la imagen): cada run tiene su ID en la cabecera del panel
   de resultado (formato `20251025-153000-ab12`). Abre
   `http://localhost:8090/api/runs/<ID>` en el navegador, copia el JSON y
   pégalo en el bloque "Resultados" de esa prueba en `EVIDENCIAS.md`.
   También puedes copiar el listado completo de un bloque entero desde
   `http://localhost:8090/api/runs`.
4. **No inventes nombres**: si el nombre de captura no coincide con el de la
   plantilla, no podré cruzar la evidencia con la prueba.

## 3. El panel en 90 segundos

- **Pestañas**: `ApacheBench (ab)`, `Siege`, `Apache JMeter`, `Chaos Monkey`.
- Cada pestaña tiene: campos del test, botones de **preset** (Smoke, Load,
  Stress, Gentle, Aggressive, LB failover), botón **`Launch test`** y un
  desplegable **Runbook** con la idea de cada prueba.
- **Un preset solo rellena algunos campos**: tras pulsarlo, revisa que el resto
  de campos tenga los valores indicados en este documento (sobre todo
  `Target URL`, `Group`, `Fault`, `Dry run`).
- Al lanzar aparece el panel de resultado con:
  - **Badge de estado**: `running` → `finished` (o `failed`).
    **Espera a `finished` antes de capturar la pantalla.**
  - Botón `Stop` (mientras corre).
  - **Output data**: tarjetas con las métricas clave del run.
  - **Latency percentiles**: barras p50/p90/p95/p99 (ab, JMeter).
  - **Availability probes** (Chaos): línea de tiempo, barras rojas = fallos.
  - **Chaos events**: tabla `t (s) | Action | Service` → sirve para calcular
    cuándo se inyectó el fallo y cuándo se restauró (MTTR).
  - **Input parameters** y **Console**.
  - Enlaces de descarga (`console.log`, `percentiles.csv`, `results.jtl`,
    `summary.json`) y **`Open JMeter HTML report`** cuando JMeter genera informe.
- **History** (abajo): todos los runs; `View` reabre cualquiera. Actualiza
  solo cada 4 s. Si lanzas dos runs a la vez (bloque compuesto), el segundo
  sustituye el panel visible: el primero sigue corriendo y se recupera desde
  `History → View`.

## 4. Checkpoints de salud (CP-Bx)

Se ejecutan **antes del bloque y después de cada prueba destructiva**. Cada
checkpoint tiene su hueco en `docs/tests/EVIDENCIAS.md`: copia el comando,
pega la salida justo debajo. Todos los comandos se ejecutan desde la **raíz
del repositorio**.

**CP genérico (todos los bloques):**

```bash
docker compose ps -a
curl -s http://localhost/api/health
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
```

Esperado: contenedores `Up` (`healthy` los de datos), respuesta
`{"status":"ok","cache":"available"}` y tres `x-request-trace` distintos
(rotación round-robin: `webnode1/2/3` y `app1/2/3`).

**Estado de Galera:**

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"
```

Esperado: `wsrep_cluster_size = 3`, `wsrep_local_state_comment = Synced`.

**Replica set de MongoDB:**

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'
```

Esperado: `mongodb:27017 PRIMARY`, `mongodb2:27017 SECONDARY`,
`mongodb3:27017 SECONDARY`.

**Redis + Sentinel:**

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
docker exec distributed-three-tier-redis-1 redis-cli info replication | grep -E '^role'
```

Esperado: quorum `OK`, master `ip = redis`, `role:master`.

**VIP Keepalived (solo bloques de LB):**

```bash
docker exec distributed-three-tier-presentation-keepalived-master-1 ip -4 -o addr show | grep 172.30.0.250 || echo "VIP de presentación NO está en el master"
docker exec distributed-three-tier-application-keepalived-master-1 ip -4 -o addr show | grep 172.31.0.250 || echo "VIP de aplicación NO está en el master"
```

## 5. Reglas de seguridad

1. **Nunca** `docker compose down -v`, `docker volume prune` ni borrar
   volúmenes: destruyes los datos.
2. Chaos Monkey **restaura solo** al terminar (o al pulsar `Stop`), incluido el
   reinicio del sidecar de Keepalived tras un LB. Aun así, **verifica el
   checkpoint después de cada prueba destructiva**.
3. **Un solo experimento destructivo a la vez** y siempre en este orden:
   B0 → B1 → B2 → B3 → B4 → B5. No mezcles bloques.
4. Si un contenedor queda `Exited` (el chaos lo interrumpiste a mano),
   recupéralo con `docker start <nombre>` y vuelve a pasar el checkpoint,
   anotándolo en `EVIDENCIAS.md`.
5. El panel rechaza valores fuera de rango con un error rojo (HTTP 400):
   revísalo antes de relanzar.
6. Chaos Monkey **nunca toca** `presentation-entry`, `nagios`,
   `catalog-init` ni `mongodb-init` (protegidos por diseño).

---

# Bloque 0 — Línea base (sin fallos)

## CP-B0

Ejecuta el **CP genérico + Galera + MongoDB + Redis/Sentinel + VIP** completos
y pega las cinco salidas en `EVIDENCIAS.md` (sección CP-B0). Este es tu estado
de referencia para todo el resto.

## T00 — Salud y round-robin (sin panel)

1. Abre `http://localhost/` → captura `T00-salud-1.png`.
2. Abre Nagios `http://localhost:8088` (vista *Service Detail*) →
   captura `T00-salud-2.png` (todo OK/PENDING sin CRITICAL).
3. En terminal, ejecuta y **pega la salida en EVIDENCIAS (T00)**:

```bash
curl -s http://localhost/api/health
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
curl -s http://localhost/api/products/cheapest | head -c 300; echo
curl -s http://localhost/api/products/ST-001/reviews | head -c 300; echo
```

---

# Bloque 1 — Rendimiento

**CP-B1**: CP genérico antes de empezar (pegarlo en EVIDENCIAS).

Criterios de aceptación del plan (`TEST-PLAN.md`):
p95 < 200 ms y disponibilidad ≥ 99.9% en baseline.
Registra también CPU/RAM si quieres (opcional): `docker stats --no-stream`.

## T01 — ab Smoke (¿responde la tienda?)

Pestaña **ApacheBench (ab)**:
- Preset `Smoke` → REQUESTS 100, CONCURRENCY 5
- `Target URL`: `http://presentation-entry/` (déjalo por defecto)
- `Timeout (s)`: 30 · `HTTP keep-alive`: sin marcar
- `Launch test` → espera `finished` → captura `T01-ab-smoke-1.png`
  (tarjetas **Output data** + **Latency percentiles**).

Esperado: `Failed requests: 0`, `Non-2xx responses: 0`.
Evidencia: pega el JSON del run si quieres (bloque "Resultados" de T01).

## T02 — ab Load (tráfico esperado)

Misma pestaña → preset `Load` (REQUESTS 5000, CONCURRENCY 50) → `Launch test`
→ captura `T02-ab-load-1.png`.

Compara con T01: Requests/s, latencia media, p95/p99.

## T03 — ab Stress (buscar el primer cuello de botella)

Preset `Stress` (REQUESTS 20000, CONCURRENCY 200) → `Launch test`
→ captura `T03-ab-stress-1.png`.

Anota: ¿aparecen `Failed requests` o `Non-2xx`? ¿Cuánto sube p95 respecto a
T02? Ese es el punto de saturación.

## T04 — Siege Load (multi-URL con usuarios simulados)

Pestaña **Siege**:
- Preset `Load` → CONCURRENCY 50, DURATION 60
- `URLS` (una por línea, déjalo por defecto):
  ```
  http://presentation-entry/
  http://presentation-entry/api/health
  http://presentation-entry/api/products/cheapest
  ```
- `Benchmark mode` marcado · `Launch test` → captura `T04-siege-load-1.png`.

Esperado: `Availability %` ≥ 99.9 (ideal 100).

## T05 — JMeter Load (informe completo)

Pestaña **Apache JMeter**:
- Preset `Load` → THREADS 50, RAMPUP 10, DURATION 60
- `Base URL`: `http://presentation-entry` · `Paths` (por defecto): `/`,
  `/api/health`, `/api/products/cheapest` · `Think time`: 0
- `Launch test` → espera `finished` → captura `T05-jmeter-load-1.png`
  (Output data + percentiles + tabla *Per request*).
- Pulsa **`Open JMeter HTML report`** y captura el informe:
  `T05-jmeter-load-2.png` (la página con la gráfica de percentiles).

Esperado: `Error %` = 0 y p95 < 200 ms.

## T06 — JMeter Stress

Preset `Stress` (THREADS 200, RAMPUP 30, DURATION 90) → `Launch test`
→ capturas `T06-jmeter-stress-1.png` (panel) y `T06-jmeter-stress-2.png`
(informe HTML).

Anota por dónde empieza a romperse: ¿errores, latencia o ambas?

## T07 — Efecto de la caché (con y sin Redis)

1. Pestaña **ab**: `Target URL` = `http://presentation-entry/api/products/cheapest`,
   preset `Load` → `Launch test` → captura `T07-cachefx-1.png`
   (run A, con caché caliente).
2. Limpia la caché (pega la respuesta en EVIDENCIAS T07):

```bash
curl -s -X POST http://localhost/api/cache/clear; echo
```

   Esperado: `"cacheEntryRemoved": true` (si sale `false`, la clave ya estaba
   vacía o caducada: vuelve a ejecutar un GET de `/api/products/cheapest` y
   repite el clear).
3. **Inmediatamente** repite el run A igual → captura `T07-cachefx-2.png`
   (run B, miss de caché: primera petición va a Galera).

Compara `Requests/s` y latencia media de A vs B. Pega los JSON de ambos runs
en el bloque de T07 si quieres cifras exactas.

**CP-B1 final**: CP genérico y pega la salida (sigue en verde antes de seguir).

---

# Bloque 2 — Failovers de presentación y aplicación

Todas usan la pestaña **Chaos Monkey**. Valores comunes (verifícalos tras cada
preset): `Fault: stop`, `Availability probe URL`:
`http://presentation-entry/api/health`, `Dry run` **sin marcar**.

**CP-B2 antes** (CP genérico + VIP) y **CP-B2 después de cada prueba**.
Si una prueba termina con algún contenedor `Exited`, `docker start <nombre>`.

## T08 — Failover del LB de presentación (VIP → backup)

- Preset **`LB failover`** → GROUP `presentation-lb`, INTERVAL 30,
  DOWNTIME 20, DURATION 90 (verifícalos).
- `Launch test` → espera `finished` → captura `T08-lb-presentacion-1.png`
  (tarjetas **Availability % / Longest outage**, timeline y tabla
  **Chaos events**).

Esperado: disponibilidad ≈ 100% (o la caída mínima de ~2–4 s de la
transición VRRP), y en *Chaos events* se ven `stop presentation-lb-master`,
`restore` y `restart presentation-keepalived-master`.
Pega el JSON del run en T08 (con los eventos calculo el tiempo de failover).

## T09 — Failover del LB de aplicación

- Sin preset: GROUP `application-lb`, INTERVAL 30, DOWNTIME 20, DURATION 90,
  MAX_CONCURRENT 1, ACTION `stop`.
- `Launch test` → captura `T09-lb-aplicacion-1.png`. Espejo de T08 sobre
  `172.31.0.250`.

## T10 — Un nodo web fuera (1 de 3)

- GROUP `web`, pero en **`Explicit services`** escribe: `web1`
  (TARGETS tiene prioridad sobre GROUP).
- INTERVAL 30, DOWNTIME 20, DURATION 90, MAX_CONCURRENT 1.
- `Launch test` → captura `T10-web1-1.png`.

Esperado: `web1` sale del balanceo de HAProxy y la disponibilidad se mantiene
en ~100% (cero errores visibles).

## T11 — Dos nodos web fuera (2 de 3)

- `Explicit services`: `web1,web2` · `Max victims at once`: **2** ·
  resto igual que T10.
- `Launch test` → captura `T11-web12-1.png`.

Esperado: sigue sirviendo con `web3` solo; disponibilidad alta, pero la
latencia puede subir. Anota si aparecen errores.

## T12 — Un nodo de aplicación fuera (1 de 3)

- `Explicit services`: `app1` · INTERVAL 30, DOWNTIME 20, DURATION 90.
- `Launch test` → captura `T12-app1-1.png`. Esperado ~100% (HAProxy retira
  `app1` por `/health`).

## T13 — NEGATIVO: ambos LB de presentación a la vez (opcional)

- `Explicit services`: `presentation-lb-master,presentation-lb-backup` ·
  `Max victims at once`: 2 · INTERVAL 30, DOWNTIME 20, DURATION 90.
- `Launch test` → captura `T13-lb-ambos-1.png`.

**Esperado: caída total** durante el DOWNTIME (sin VIP no hay camino) y
recuperación al restaurar. Es la prueba que demuestra por qué el par es
necesario; márcala como "test negativo" si la haces.

**CP-B2 final** completo (con VIP).

---

# Bloque 3 — Failovers de datos

Misma pestaña **Chaos Monkey**, mismos valores comunes que el Bloque 2.

**CP-B3 antes** completo (genérico + Galera + Mongo + Redis/Sentinel).
**CP-B3 después de cada prueba**, sin excepción: son las capas con datos.

## T14 — Nodo Galera secundario (`galera2`)

- `Explicit services`: `galera2` · INTERVAL 30, DOWNTIME 20, DURATION 90.
- `Launch test` → captura `T14-galera2-1.png`.
- **Durante** el DOWNTIME (si da tiempo) o justo después, ejecuta el comando
  de Galera y pégalo en T14 (cluster_size debe volver a 3).

Esperado: quorum conservado (2/3 durante la caída), disponibilidad ~100%.

## T15 — Nodo Galera de arranque (`galera1`)

- `Explicit services`: `galera1` · mismos parámetros que T14.
- `Launch test` → captura `T15-galera1-1.png`.
- Pega el estado de Galera antes/después (CP) en T15.

Esperado: `galera-proxy` reenvía a un nodo `Synced`; puede haber alguna
petición fallida en vuelo (disponibilidad ≥ 99%).

## T16 — Primario de MongoDB

- Antes: ejecuta el comando de Mongo y **confirma quién es PRIMARY**
  (debe ser `mongodb:27017`) → pégalo en T16.
- `Explicit services`: `mongodb` · INTERVAL 30, DOWNTIME 20, DURATION 90.
- `Launch test` → captura `T16-mongo-primario-1.png`.
- Después: CP de Mongo (pegado en T16): debe haber un PRIMARY nuevo
  (`mongodb2` o `mongodb3`) en cuestión de segundos.

Esperado: elección de primario, reanudación de escrituras de reseñas;
disponibilidad ≥ 99%.

## T17 — Mayoría de MongoDB caída (2 de 3) ⚠

- `Explicit services`: `mongodb,mongodb2` · `Max victims at once`: 2 ·
  INTERVAL 30, DOWNTIME 30, DURATION 120.
- `Launch test` → captura `T17-mongo-mayoria-1.png`.

**Esperado: las reseñas fallan visiblemente** (sin mayoría no hay primario):
espera una caída de disponibilidad notable. **No fuerces `rs.reconfig`**; el
chaos restaura solo. CP-B3 inmediatamente después y verifica que el primario
vuelve.

## T18 — Master de Redis

- `Explicit services`: `redis` · INTERVAL 30, DOWNTIME 30, DURATION 120
  (deja margen para el failover de Sentinel).
- `Launch test` → captura `T18-redis-master-1.png`.
- Después: CP de Redis/Sentinel (pegado en T18): el master reportado por
  Sentinel debe ser `redis2` o `redis3` hasta que se restaure `redis`.

Esperado: Sentinel hace failover y **la API sigue respondiendo sin 500**
(degradación: catálogo sin caché → Galera). Verifícalo con
`curl -s http://localhost/api/health` (pégalo).

## T19 — Un Sentinel fuera

- `Explicit services`: `redis-sentinel1` · INTERVAL 30, DOWNTIME 20, DURATION 90.
- `Launch test` → captura `T19-sentinel-1.png`.
- Después: CP de Redis/Sentinel → `ckquorum` debe seguir `OK` (quorum 2/3).

**CP-B3 final** completo.

---

# Bloque 4 — Chaos Engineering

Misma pestaña. Comunes: `Fault: stop`, probe por defecto, `Dry run` sin marcar
salvo en T20.

**CP-B4 antes** y **después de cada prueba**.

## T20 — Dry run (no toca nada)

- `Group`: `any` · `Dry run`: **MARCADO** · INTERVAL 30, DOWNTIME 15,
  DURATION 90.
- `Launch test` → captura `T20-chaos-dryrun-1.png`.

Esperado: eventos con sufijo `(dry-run)` y **ningún contenedor afectado**
(compruébalo con `docker compose ps` y pégalo si lo dudas).

## T21 — Grupo `web`

- Preset `Gentle` (INTERVAL 30, DOWNTIME 15, DURATION 90) · `Group`: `web` ·
  `Max victims at once`: 1.
- `Launch test` → captura `T21-chaos-web-1.png` (timeline + Chaos events).

Esperado: disponibilidad ≥ 99% (grupo redundante).

## T22 — Grupo `app`

- Preset `Gentle` · `Group`: `app`.
- `Launch test` → captura `T22-chaos-app-1.png`. Mismo criterio.

## T23 — Grupo `mongodb`

- Preset `Gentle` · `Group`: `mongodb` · `Max victims at once`: 1
  (un solo miembro a la vez: con 2 simultáneos perderías mayoría).
- `Launch test` → captura `T23-chaos-mongo-1.png`.

Esperado: elecciones visibles en el timeline, disponibilidad ≥ 99%.

## T24 — Compuesto: carga + fallos a la vez

1. Pestaña **Siege**: preset `Load` (CONCURRENCY 50, DURATION 60) →
   `Launch test` (queda corriendo).
2. **Sin esperar**, pestaña **Chaos Monkey**: preset `Aggressive`
   (INTERVAL 10, DOWNTIME 20, DURATION 120, MAX_CONCURRENT 2) ·
   `Group`: `app` → `Launch test`.
3. Deja que corran los dos. Cuando terminen, ve a **History → View** de cada
   uno y captura:
   - `T24-compuesto-1.png` → resultado de **Siege** (Availability %).
   - `T24-compuesto-2.png` → resultado de **Chaos** (timeline + events).

Esperado: la disponibilidad "del usuario" (Siege) es la que manda; compárala
con la del propio chaos (el probe es solo `/api/health`). Pega los dos JSON.

**CP-B4 final** completo.

---

# Bloque 5 — Observabilidad (Nagios)

**CP-B5 antes** (CP genérico).

## T25 — Nagios detecta un fallo

1. Pestaña **Chaos Monkey**: `Group`: `web`, `Fault`: `stop`,
   **INTERVAL 300, DOWNTIME 300, DURATION 600**, MAX_CONCURRENT 1
   (mantiene un nodo caído ~5 min para dar tiempo a Nagios).
2. `Launch test` y **mientras corre** abre Nagios
   `http://localhost:8088` → vista *Service Detail*.
3. Recarga hasta ver el servicio del nodo caído en **CRITICAL**
   (espera hasta ~5–10 min: intervalo de comprobación de Nagios).
   → captura `T25-nagios-1.png`.
4. Cuando el run termine y el servicio vuelva a **OK**, captura
   `T25-nagios-2.png`.
5. Pega en EVIDENCIAS (T25) el listado de servicios que cambiaron de estado
   (o una nota de lo que Nagios mostró y cuánto tardó en detectarlo).

Hallazgo esperado y que debes anotar: Nagios **solo comprueba** (no notifica a
nadie: `architecture.cfg` no define `contact_groups` ni
`notification_interval`). No hace falta que lo arregles, solo documéntalo.

## T26 — Captura global de History

Al terminar todo: en el panel, sección **History**, con todos los runs
visibles → captura `T26-history-1.png`.

**CP-B5 final** (CP genérico): el sistema debe quedar como al principio.

---

## Después de todo

1. CP final completo → pégalo en `EVIDENCIAS.md` (CP-B5).
2. Comprueba que `docs/tests/evidencias/img/` contiene **todos** los PNG con
   el nombre exacto de la plantilla.
3. Revisa `EVIDENCIAS.md`: ningún bloque de captura vacío sin nota
   "no ejecutada" (si no haces una prueba, anótalo; mejor un N/A explícito
   que un hueco).
4. Parada ordenada del conjunto según `docs/START-DOWN.md`.
