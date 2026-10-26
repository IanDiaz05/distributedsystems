# Bloque 4 — Chaos Engineering

**Objetivo:** comparar la disponibilidad observada durante fallos controlados, tanto individuales como concurrentes, y validar el modo de simulación sin impacto.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 4. Criterio indicado para los experimentos: disponibilidad ≥ 99%.

## Resultados y evidencias

### T20 — Dry run

El modo de simulación registró tres pares de eventos con sufijos `(dry-run)` para servicios como MongoDB y Redis. No se reportaron sondas fallidas y la disponibilidad fue 100%. No se pegó la salida de `docker compose ps`; la captura y los eventos del panel son la evidencia disponible de que el experimento se ejecutó como simulación.

![T20 — Eventos de dry run](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T20-chaos-dryrun-1.png)

### T21 — Chaos grupo `web`

El experimento detuvo `web3` tres veces. Seis sondas fallaron de un total de 88, lo que dejó disponibilidad de 93,18%. El resultado no alcanzó el objetivo de 99%, aunque la caída máxima resumida fue de 1 segundo.

![T21 — Chaos en el grupo web](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T21-chaos-web-1.png)

### T22 — Chaos grupo `app`

Chaos Monkey detuvo `app1` dos veces y `app3` una vez. Se registraron ocho fallos de sonda de un total de 85 y disponibilidad de 90,59%, por debajo del objetivo de 99%.

![T22 — Chaos en el grupo app](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T22-chaos-app-1.png)

### T23 — Chaos grupo `mongodb`

Se detuvieron miembros MongoDB de uno en uno. El panel registró cero sondas fallidas y 100% de disponibilidad. Sin embargo, la sonda solo consulta `/api/health`, por lo que el run no confirma por sí solo lecturas o escrituras correctas en la base de datos.

![T23 — Chaos en el grupo MongoDB](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T23-chaos-mongo-1.png)

### T24 — Compuesto: carga y fallos

Siege se ejecutó a la vez que Chaos Monkey detenía instancias del grupo `app`. La prueba de carga completó 62.321 transacciones y registró 317 fallidas, con disponibilidad de 99,49%. El run de Chaos inyectó nueve fallos y sus sondas de `/api/health` fallaron 13 veces de 103, con disponibilidad de 87,38%. Las dos cifras miden aspectos distintos: transacciones de usuario en Siege y salud del endpoint en Chaos.

![T24 — Resultado de Siege](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T24-compuesto-1.png)

![T24 — Resultado de Chaos Monkey](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T24-compuesto-2.png)

## Comparación técnica de métricas JSON

| Prueba | Fallos inyectados | Muestras / transacciones | Fallos de sonda o transacción | Disponibilidad |
|---|---:|---:|---:|---:|
| T20 — dry run | 3 | 101 sondas | 0 | 100% |
| T21 — web | 3 | 88 sondas | 6 | 93,18% |
| T22 — app | 3 | 85 sondas | 8 | 90,59% |
| T23 — MongoDB | 3 | 105 sondas | 0 | 100% |
| T24 — Siege | N/A | 62.321 transacciones correctas | 317 transacciones fallidas | 99,49% |
| T24 — Chaos | 9 | 103 sondas | 13 | 87,38% |

## Análisis

El dry run no mostró fallos. T21 y T22 no alcanzaron 99% de disponibilidad. T23 mantuvo la sonda HTTP, pero no prueba operaciones de datos. En T24, Siege supera el umbral por poco, mientras las sondas del panel registran una disponibilidad menor; ambas métricas deben conservarse por medir aspectos distintos. No se probaron particiones de red ni fallos de recursos: Pumba/Toxiproxy y Prometheus/Grafana quedan como trabajo futuro. Swarm también está fuera del alcance actual.
