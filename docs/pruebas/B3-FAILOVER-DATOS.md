# Bloque 3 — Failovers de datos

**Objetivo:** comprobar la continuidad de servicio ante la detención de miembros de Galera, MongoDB, Redis y Sentinel.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 3. Las sondas del panel consultan `/api/health`; cuando no existe una comprobación directa del almacén, se indica expresamente.

## Resultados y evidencias

### T14 — Galera `galera2` fuera

Se detuvo `galera2` tres veces. Durante la detención se comprobó un tamaño de clúster de 2; después de restaurarlo volvió a 3. El panel registró cero sondas fallidas, disponibilidad de 100% y latencia media de sonda de 3,8 ms.

![T14 — Failover de galera2](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T14-galera2-1.png)

### T15 — Galera `galera1` fuera

La evidencia del panel registra 14 sondas fallidas de 89, disponibilidad de 84,27% y caída máxima de 8 segundos. Además, `galera1` no se reincorporó automáticamente después de detenerse; la incidencia describe que fue necesario recuperarlo con un override temporal para que se uniera al clúster existente, sin forzar un bootstrap. El run contiene `TARGETS=galera1` aunque el grupo indicado sea `web`, por lo que la víctima efectiva fue el servicio explícito.

![T15 — Failover de galera1](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T15-galera1-1.png)

### T16 — Primario de MongoDB fuera

Antes del experimento, `mongodb` constaba como PRIMARY y los otros dos miembros como SECONDARY. Después, `mongodb2` era PRIMARY. El panel registró cero sondas fallidas y disponibilidad de 100%, de modo que la elección quedó acompañada por continuidad de la sonda HTTP.

![T16 — Elección de nuevo primario MongoDB](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T16-mongo-primario-1.png)

### T17 — Mayoría de MongoDB caída

El experimento detuvo `mongodb` y `mongodb2`. Hubo tres sondas HTTP fallidas de 125 y disponibilidad de 97,6%, con una caída máxima de 3 segundos. Después de la restauración, el estado registrado muestra a `mongodb3` como PRIMARY. Aunque se anotó que el panel indicaba tres pruebas fallidas, no se observó un error visible en su consola. La sonda era `/api/health`: no consta que se intentara escribir una reseña durante la pérdida de mayoría, por lo que el fallo de escritura esperado no está demostrado directamente.

![T17 — Caída de mayoría MongoDB](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T17-mongo-mayoria-1.png)

### T18 — Master de Redis fuera

Se detuvo y restauró `redis` varias veces. El panel registró cero sondas fallidas y 100% de disponibilidad. La nota de la evidencia dice que los checks posteriores estaban en orden, pero no copia el master reportado por Sentinel mientras el servicio estaba detenido; no es posible confirmar con ese dato qué réplica fue promovida durante el fallo.

![T18 — Failover de Redis](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T18-redis-master-1.png)

### T19 — Sentinel fuera

El servicio `redis-sentinel1` se detuvo y restauró en tres ocasiones. Las 101 sondas del run fueron correctas y la disponibilidad fue de 100%. El comando `ckquorum` copiado después reportó tres Sentinels utilizables; no quedó guardada la salida mientras uno estaba detenido.

![T19 — Detención de un Sentinel](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T19-sentinel-1.png)

## Comparación técnica de métricas JSON

| Prueba | Sondas enviadas | Sondas fallidas | Disponibilidad | Dato técnico adicional |
|---|---:|---:|---:|---|
| T14 — `galera2` | 101 | 0 | 100% | Latencia media 3,8 ms |
| T15 — `galera1` | 89 | 14 | 84,27% | Caída máxima 8 s; latencia media 3,1 ms |
| T16 — Mongo PRIMARY | 105 | 0 | 100% | Latencia media 3,6 ms |
| T17 — mayoría MongoDB | 125 | 3 | 97,6% | Caída máxima 3 s; latencia media 11,3 ms |
| T18 — Redis master | 131 | 0 | 100% | Latencia media 4,4 ms |
| T19 — Sentinel | 101 | 0 | 100% | Latencia media 4,0 ms |

## Análisis

T14 y T16 respaldan la continuidad de la sonda ante la caída de un miembro, con reingreso de Galera y elección de primario MongoDB. T15 es un hallazgo: la disponibilidad cayó y `galera1` necesitó recuperación manual. T17 muestra pérdida de probes, pero no documenta directamente el fallo de una escritura. T18 y T19 no conservan evidencia del rol o quorum durante la inyección. Los nodos comparten un solo host y `galera-proxy` sigue siendo un punto único de fallo.
