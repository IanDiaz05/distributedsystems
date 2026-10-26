# Bloque 1 — Rendimiento

**Objetivo:** medir la respuesta bajo carga y estrés con ApacheBench, Siege y JMeter, y comparar la carga del catálogo antes y después de limpiar la caché.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 1. Criterios de referencia del plan: p95 < 200 ms y disponibilidad ≥ 99,9% en baseline.

## Resultados y evidencias

### T01 — ab Smoke

Se enviaron 100 solicitudes con concurrencia 5. Las 100 se completaron sin fallos ni respuestas no-2xx; la latencia media fue 1,077 ms y el p95 1 ms. La captura muestra los datos de salida y los percentiles.

![T01 — ApacheBench Smoke](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T01-ab-smoke-1.png)

### T02 — ab Load

Con 5.000 solicitudes y concurrencia 50, no hubo fallos ni respuestas no-2xx. El rendimiento fue 4.846,22 solicitudes por segundo, con latencia media de 10,317 ms y p95 de 16 ms.

![T02 — ApacheBench Load](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T02-ab-load-1.png)

### T03 — ab Stress

La prueba elevó la carga a 20.000 solicitudes y concurrencia 200. Todas terminaron sin fallos ni respuestas no-2xx. Frente a T02, bajó el throughput y aumentó la latencia: el p95 pasó de 16 a 58 ms, aunque permaneció por debajo de 200 ms.

![T03 — ApacheBench Stress](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T03-ab-stress-1.png)

### T04 — Siege Load

Siege simuló 50 usuarios durante 60 segundos sobre la página, el endpoint de salud y el catálogo. Registró 108.838 transacciones correctas, cero fallidas y disponibilidad de 100%. El tiempo medio de respuesta fue 0,03 s.

![T04 — Siege Load](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T04-siege-load-1.png)

### T05 — JMeter Load

JMeter probó tres rutas con 50 hilos durante 60 segundos. Completó 93.651 muestras sin errores. El p95 fue 102 ms y p99 191 ms, dentro del umbral p95 de 200 ms. Las capturas incluyen el panel con la tabla por solicitud y el informe HTML.

![T05 — Panel de resultados JMeter](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T05-jmeter-load-1.png)

![T05 — Informe HTML JMeter](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T05-jmeter-load-2.png)

### T06 — JMeter Stress

Con 200 hilos y 90 segundos de duración, se registraron 149.975 muestras y cero errores. La latencia p95 subió a 342 ms, p99 a 669 ms y el máximo a 1.398 ms. La evidencia apunta a latencia creciente bajo estrés, no a errores de respuesta.

![T06 — Panel de resultados JMeter](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T06-jmeter-stress-1.png)

![T06 — Informe HTML JMeter](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T06-jmeter-stress-2.png)

### T07 — Efecto de la caché

Se compararon dos ejecuciones del mismo test de ApacheBench. Según la aclaración del autor, el run A (`20261026-005818-3869`) se ejecutó antes de limpiar la caché y representa caché caliente. El run B (`20261026-005731-9071`) se ejecutó después de la limpieza y requirió cargar los datos de nuevo. A registró mayor throughput y menor latencia media y p95. La respuesta del comando de limpieza no quedó copiada en la evidencia.

![T07 — Run A, caché caliente](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T07-cachefx-1.png)

![T07 — Run B, después de limpiar caché](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T07-cachefx-2.png)

## Comparación técnica de métricas JSON

| Prueba / run | Peticiones, transacciones o muestras | Fallos / errores | Rendimiento | Latencia / disponibilidad |
|---|---:|---:|---:|---|
| T01 ab Smoke | 100 completadas | 0 fallidas; 0 no-2xx | 4.644,25 req/s | Media 1,077 ms; p95 1 ms |
| T02 ab Load | 5.000 completadas | 0 fallidas; 0 no-2xx | 4.846,22 req/s | Media 10,317 ms; p95 16 ms |
| T03 ab Stress | 20.000 completadas | 0 fallidas; 0 no-2xx | 4.472,16 req/s | Media 44,721 ms; p95 58 ms |
| T04 Siege | 108.838 transacciones | 0 fallidas | 1.806,44 transacciones/s | Disponibilidad 100%; media 0,03 s |
| T05 JMeter Load | 93.651 muestras | 0; error 0% | 1.563,64 req/s | p95 102 ms; p99 191 ms |
| T06 JMeter Stress | 149.975 muestras | 0; error 0% | 1.667,19 req/s | p95 342 ms; p99 669 ms; máximo 1.398 ms |
| T07 run A caliente | 5.000 completadas | 0 fallidas; 0 no-2xx | 2.519,27 req/s | Media 19,847 ms; p95 32 ms |
| T07 run B tras limpieza | 5.000 completadas | 0 fallidas; 0 no-2xx | 2.336,84 req/s | Media 21,396 ms; p95 35 ms |

## Análisis

T01–T05 se mantuvieron por debajo de 200 ms de p95 en las métricas disponibles y Siege informó 100% de disponibilidad. T06 superó el umbral de latencia bajo estrés, sin registrar errores. T07 muestra una mejora modesta con caché caliente; la identificación de A y B se basa en la aclaración del autor, ya que las marcas temporales de los IDs aparecen en orden inverso y no se conservó la respuesta de limpieza.
