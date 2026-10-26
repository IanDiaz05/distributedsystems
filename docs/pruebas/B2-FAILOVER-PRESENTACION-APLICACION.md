# Bloque 2 — Failovers de presentación y aplicación

**Objetivo:** observar el comportamiento del servicio al detener balanceadores o nodos web y de aplicación.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 2. Las pruebas usan Chaos Monkey y sondas a `/api/health`; se resumen las métricas efectivamente registradas, incluidas las desviaciones.

## Resultados y evidencias

### T08 — Failover LB de presentación

El experimento inyectó tres paradas sobre el balanceador de presentación master, con eventos de restauración y reinicio de Keepalived. Durante el run, el panel registró tres sondas fallidas de 94 y disponibilidad de 96,81%. La caída máxima informada fue de 1 segundo. Este valor quedó por debajo de la disponibilidad cercana al 100% esperada.

![T08 — Sondas, línea temporal y eventos de Chaos](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T08-lb-presentacion-1.png)

### T09 — Failover LB de aplicación

Se realizaron tres paradas y restauraciones del LB. Las sondas a la API no fallaron y la disponibilidad fue 100%. Los eventos identifican el servicio detenido como `application-lb-backup`, no el master previsto en la descripción de la prueba; por eso el resultado demuestra continuidad ante la parada del backup, pero no permite afirmar que se haya probado el failover del master.

![T09 — Sondas, línea temporal y eventos de Chaos](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T09-lb-aplicacion-1.png)

### T10 — Un nodo web fuera

Chaos Monkey detuvo y restauró `web1` en tres ocasiones. Hubo seis sondas fallidas de 88 y la disponibilidad informada fue 93,18%, por debajo de la expectativa de servicio cercano al 100%.

![T10 — Detención de web1](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T10-web1-1.png)

### T11 — Dos nodos web fuera

El run registró tres paradas en total: dos de `web1` y una de `web2`, con restauración entre eventos. Hubo siete sondas fallidas de 87 y disponibilidad de 91,95%. Los eventos son secuenciales, de modo que no prueban que dos nodos web permanecieran detenidos simultáneamente.

![T11 — Eventos del experimento con nodos web](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T11-web12-1.png)

### T12 — Un nodo de aplicación fuera

Se detuvo y restauró `app1` tres veces. El panel contabilizó siete sondas fallidas de 87, disponibilidad de 91,95% y caída máxima de 1 segundo; por tanto, las sondas no reflejaron la continuidad esperada.

![T12 — Detención de app1](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T12-app1-1.png)

### T13 — Ambos LB de presentación (negativo, opcional)

Aunque se configuraron ambos balanceadores como víctimas, el run informó cero sondas fallidas y 100% de disponibilidad. Los eventos registran detenciones y restauraciones en secuencia, no una ventana donde los dos estuvieran caídos a la vez. La evidencia no demuestra la caída total esperada en este test negativo.

![T13 — Eventos del experimento de los LB](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T13-lb-ambos-1.png)

## Comparación técnica de métricas JSON

| Prueba | Sondas enviadas | Sondas fallidas | Disponibilidad | Caída máxima |
|---|---:|---:|---:|---:|
| T08 — LB presentación | 94 | 3 | 96,81% | 1 s |
| T09 — LB aplicación (backup detenido) | 101 | 0 | 100% | 0 s |
| T10 — web1 | 88 | 6 | 93,18% | 1 s |
| T11 — dos nodos web configurados | 87 | 7 | 91,95% | 1 s |
| T12 — app1 | 87 | 7 | 91,95% | 1 s |
| T13 — ambos LB configurados | 99 | 0 | 100% | 0 s |

## Análisis

T09 mantuvo el servicio durante la parada del balanceador de respaldo. En cambio, T08 y T10–T12 registraron sondas fallidas y disponibilidad menor a la esperada. T11 y T13 no acreditan el escenario simultáneo pretendido según la secuencia de eventos. Estos resultados no deben presentarse como failover transparente. El despliegue en un único host y el check de Keepalived limitado a TCP restringen el alcance de lo demostrado.
