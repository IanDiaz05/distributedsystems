# Bloque 5 — Observabilidad

**Objetivo:** observar la detección de fallos por Nagios y conservar una vista global del historial de ejecuciones del laboratorio.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 5.

## Resultados y evidencias

### T25 — Nagios detecta un fallo

Durante la prueba, `web1` fue el primer servicio que apareció como DOWN/CRITICAL. La nota de ejecución estima que Nagios tardó un par de minutos en detectarlo. Después de recuperarse `web1`, `web2` también estuvo detenido durante un tiempo y volvió sin problemas. La interfaz indicó una recarga cada 90 segundos. No se registró un tiempo exacto ni se adjuntó un JSON del run, así que el retraso es una observación aproximada y no una medida de MTTR.

![Nagios durante el fallo](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T25-nagios-1.png)

![Nagios tras la recuperación](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T25-nagios-2.png)

También se tomó una tercera captura del experimento en Chaos Monkey, que contextualiza la inyección del fallo observada desde Nagios.

![Ejecución del fallo en Chaos Monkey](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T25-nagios-3.png)

### T26 — History global del panel

Se capturó la sección History del panel al finalizar la campaña para dejar constancia visual de los runs ejecutados. No se acompañó de métricas JSON independientes; los resultados numéricos de cada run están descritos en sus pruebas respectivas.

![Historial global de ejecuciones](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T26-history-1.png)

## Comparación técnica de evidencia JSON

| Prueba | Métricas JSON registradas |
|---|---|
| T25 — Nagios | No se adjuntó JSON; la evidencia disponible es observacional y fotográfica. |
| T26 — History | No se adjuntó JSON de métricas para esta captura. |

## Análisis

Nagios detectó cambios de estado, aunque el tiempo anotado fue de unos minutos y no se midió con precisión. **Nagios solo comprueba: no tiene notificaciones configuradas.** History permite revisar los runs, pero no tiene métricas independientes en la evidencia escrita. El laboratorio se ejecuta en un único host y el check de Keepalived solo comprueba TCP; no demuestra alta disponibilidad ante pérdida del host. Como trabajo futuro se proponen Swarm, Prometheus/Grafana y Pumba/Toxiproxy.
