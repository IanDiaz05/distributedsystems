# B0 y B1 — Línea base y rendimiento (T00–T07)

> Resultados de los bloques **B0 (línea base)** y **B1 (rendimiento)** de la
> campaña descrita en [`00-INSTRUCCIONES-PANEL.md`](00-INSTRUCCIONES-PANEL.md),
> con los datos recogidos en [`../tests/EVIDENCIAS.md`](../tests/EVIDENCIAS.md).
> Índice global de la campaña: [`../tests/matriz-pruebas.md`](../tests/matriz-pruebas.md).
> Resto de bloques: [B2](02-FAILOVER-PRESENTACION-APLICACION.md) ·
> [B3](03-FAILOVER-DATOS.md) · [B4](04-CHAOS-ENGINEERING.md) ·
> [B5](05-OBSERVABILIDAD.md).

---

## 1. Alcance y criterios de aceptación

| Criterio | Umbral (de `resilience-lab/TEST-PLAN.md`) | Ámbito |
|---|---|---|
| Latencia | **p95 < 200 ms** | Baseline (sin fallos inyectados) |
| Disponibilidad | **≥ 99,9 %** | Baseline |
| Disponibilidad bajo fallo | ≥ 99 % | Bloques B2–B4 (no cubiertos aquí) |

- **Pruebas cubiertas**: CP-B0, T00, CP-B1, T01–T07 y CP-B1 final.
- **Herramientas**: comprobaciones manuales (curl, `docker compose`, clientes de
  Galera/Mongo/Redis) y el panel del laboratorio (`http://localhost:8090`).
- **Fecha de ejecución**: 26 de octubre de 2026 (corridas del panel entre 00:03
  y 01:41 UTC).
- Todo se ejecutó **sin fallos inyectados** y sobre el mismo host que ejecuta el
  laboratorio.

---

## 2. Bloque B0 — Línea base

### CP-B0 — Checkpoint de referencia

Se ejecutaron las cinco comprobaciones completas antes de cualquier prueba. Salida
íntegra en [`../tests/CP-B0.md`](../tests/CP-B0.md); resumen:

| Comprobación | Esperado | Obtenido |
|---|---|---|
| `docker compose ps -a` | Contenedores `Up` (`healthy` los de datos) | 32 servicios: **29 `Up`** + 3 trabajos de inicialización `Exited (0)` (`catalog-init`, `mongodb-init`, `mongodb-keyfile`) ✅ |
| `GET /api/health` | `{"status":"ok","cache":"available"}` | ✅ igual |
| 3 × `x-request-trace` | Tres nodos distintos (round-robin) | `webnode2→app2`, `webnode3→app3`, `webnode1→app1` ✅ |
| Galera | `wsrep_cluster_size = 3`, `Synced` | ✅ |
| Replica set Mongo | 1 PRIMARY + 2 SECONDARY | `mongodb` PRIMARY, `mongodb2/3` SECONDARY ✅ |
| Redis + Sentinel | quorum `OK`, master `ip = redis`, `role:master` | `OK 3 usable Sentinels`, quorum 2, `num-slaves 2`, `role:master` ✅ |
| VIPs Keepalived | VIP en el master de cada capa | `172.30.0.250` y `172.31.0.250` en sus masters ✅ |

**Conclusión CP-B0**: estado de referencia conforme; todos los indicadores de
redundancia (quorums, réplicas, VIPs) están en su posición esperada.

### T00 — Salud y round-robin (sin panel)

- **Objetivo**: comprobar la tienda, Nagios y el balanceo round-robin en frío.
- **Hipótesis**: todo responde y las tres peticiones consecutivas recorren nodos
  distintos en ambas capas.
- **Procedimiento**: [T00 §](00-INSTRUCCIONES-PANEL.md).

**Resultado** (salida pegada en `EVIDENCIAS.md`):

```text
GET /api/health  →  {"status":"ok","cache":"available"}

x-request-trace: presentation-lb-master -> webnode2 -> application-lb-master -> app2
x-request-trace: presentation-lb-master -> webnode3 -> application-lb-master -> app3
x-request-trace: presentation-lb-master -> webnode1 -> application-lb-master -> app1

GET /api/products/cheapest         → lista JSON de productos ordenada por precio
GET /api/products/ST-001/reviews   → {"sku":"ST-001","reviews":[…]}
```

- **Capturas**:
  - Tienda: ![T00 — tienda](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T00-salud-1.png)
  - Nagios (Service Detail, sin CRITICAL): ![T00 — Nagios](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T00-salud-2.png)
- **Análisis**: ✅ las tres trazas recorren `webnode1/2/3` y `app1/2/3`, lo que
  demuestra el round-robin en la capa de presentación **y** en la de aplicación.
  Nagios sin incidentes en CRITICAL.
- **Conclusión**: línea base funcional completa; sirve de referencia para todos
  los bloques siguientes.

---

## 3. Bloque B1 — Rendimiento

### CP-B1 — Checkpoint previo

`docker compose ps -a` idéntico al CP-B0 y `GET /api/health` OK. *Nota*: en este
checkpoint se registraron solo `ps` y health; las tres trazas se confirmaron en la
nota final de T07 ("ejecuté el checkpoint y todo sigue correcto antes y después
de las pruebas"). Checkpoint final del bloque dado por válido con esa nota.

### Resumen global de métricas del bloque

| Prueba | Herramienta | Parámetros | Throughput | Latencia media | p95 | p99 | Fallos | Disponibilidad |
|---|---|---|---|---|---|---|---|---|
| T01 | ab | 100 req / conc 5 | 4644,25 req/s | 1,077 ms | **1 ms** | 3 ms | 0 | 100 % |
| T02 | ab | 5000 req / conc 50 | 4846,22 req/s | 10,317 ms | **16 ms** | 25 ms | 0 | 100 % |
| T03-a | ab | 20000 req / conc **200** | 4472,16 req/s | 44,721 ms | **58 ms** | 66 ms | 0 | 100 % |
| T03-b | ab | 20000 req / conc **500** | 5103,67 req/s | 97,969 ms | **120 ms** | 132 ms | 0 | 100 % |
| T03-c | ab | 20000 req / conc **1000** | 5092,91 req/s | 196,352 ms | **225 ms** | 269 ms | 0 | 100 % |
| T04 | Siege | conc 50 / 60 s / 3 URL | 1806,44 trans/s | 30 ms (media) | — | — | 0 | **100,0 %** |
| T05 | JMeter | 50 hilos / ramp-up 10 / 60 s | 1563,64 req/s | 29,3 ms | **102 ms** | 191 ms | 0 | 100 % |
| T06 | JMeter | 200 hilos / ramp-up 30 / 90 s | 1667,19 req/s | 99,9 ms | **342 ms** | 669 ms | 0 | 100 % |
| T07 (run 00:57:31) | ab | 5000 req / conc 50 / cheapest | 2336,84 req/s | 21,396 ms | 35 ms | 43 ms | 0 | 100 % |
| T07 (run 00:58:18) | ab | 5000 req / conc 50 / cheapest | 2519,27 req/s | 19,847 ms | 32 ms | 39 ms | 0 | 100 % |

### T01 — ab Smoke (¿responde la tienda?)

- **Objetivo / hipótesis**: validar el camino con 5 usuarios simultáneos;
  `Failed requests: 0` y `Non-2xx responses: 0`.
- **Procedimiento**: [T01 §](00-INSTRUCCIONES-PANEL.md) — preset `Smoke`,
  `Target URL: http://presentation-entry/`, timeout 30 s, sin keep-alive.
- **Resultado** (run `20261026-000356-f0b9`): 100 peticiones, **0 fallos**,
  **0 respuestas non-2xx**, 4644,25 req/s, media **1,077 ms**, p50 1 ms,
  **p95 1 ms**, p99 3 ms, tiempo total 0,022 s.
- **Captura**: ![T01 — ab Smoke](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T01-ab-smoke-1.png)
- **Análisis vs. umbral**: ✅ p95 1 ms ≪ 200 ms; disponibilidad efectiva 100 %.
- **Conclusión**: el camino completo de la petición funciona bajo carga mínima.

### T02 — ab Load (tráfico esperado)

- **Objetivo**: tráfico nominal, comparando con T01.
- **Procedimiento**: [T02 §](00-INSTRUCCIONES-PANEL.md) — preset `Load`.
- **Resultado** (run `20261026-001026-3920`): 5000 peticiones, **0 fallos**,
  4846,22 req/s, media **10,317 ms**, p95 **16 ms**, p99 25 ms, total 1,032 s.
- **Captura**: ![T02 — ab Load](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T02-ab-load-1.png)
- **Análisis**: ✅ al pasar de 5 a 50 concurrencia la media sube de 1,1 a 10,3 ms
  y el p95 de 1 a 16 ms, pero **el throughput se mantiene** (4644 → 4846 req/s):
  la capa de presentación aún no está ni cerca de su techo. Cero fallos.
- **Conclusión**: cumple con holgura el umbral de 200 ms en tráfico nominal.

### T03 — ab Stress (buscar el primer cuello de botella)

- **Objetivo**: subir la concurrencia hasta ver fallos o disparo de latencia.
- **Hipótesis**: en algún punto aparecerán `Failed requests`/`Non-2xx` o el p95
  se disparará; ese punto es la saturación.
- **Procedimiento**: [T03 §](00-INSTRUCCIONES-PANEL.md). Se ejecutaron **tres
  corridas** (preset `Stress` + ampliaciones) porque las dos primeras no
  alcanzaron saturación:

| Corrida | Concurrencia | Requests | Throughput | Media | **p95** | p99 | Fallos | Captura |
|---|---|---|---|---|---|---|---|---|
| 1 (`…001117-5fee`) | 200 | 20 000 | 4472,16 req/s | 44,72 ms | **58 ms** | 66 ms | 0 | ![T03 corrida 1](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T03-ab-stress-1.png) |
| 2 (`…013503-efdc`) | 500 | 20 000 | 5103,67 req/s | 97,97 ms | **120 ms** | 132 ms | 0 | ![T03 corrida 2](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T03-ab-stress-2.png) |
| 3 (`…014118-9bc8`) | 1000 | 20 000 | 5092,91 req/s | 196,35 ms | **225 ms** | 269 ms | 0 | ![T03 corrida 3](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T03-ab-stress-3.png) |

- **Análisis**:
  1. **Cero errores en las tres corridas** (ni `Failed requests` ni `Non-2xx`).
  2. El **throughput se estanca en ≈ 5100 req/s** a partir de 500 de concurrencia:
     es el techo de la capa de presentación (HAProxy + Nginx estático en un host).
  3. La latencia crece de forma casi lineal con la concurrencia (capacidad fija),
     y **el p95 cruza el umbral de 200 ms entre 500 y 1000** de concurrencia.
- **Conclusión**: el **primer cuello de botella es de capacidad, no de
  errores**: la saturación se expresa como cola (latencia) mucho antes de que
  aparezca ningún fallo. El punto de referencia del umbral está en
  **concurrencia ≈ 1000** (p95 225 ms con 0 fallos). Baseline (T01/T02) muy por
  debajo del umbral.

### T04 — Siege Load (multi-URL con usuarios simulados)

- **Objetivo**: medir disponibilidad con 50 usuarios simulados sobre 3 URLs
  durante 60 s en modo benchmark.
- **Procedimiento**: [T04 §](00-INSTRUCCIONES-PANEL.md).
- **Resultado** (run `20261026-001300-ff8c`): **108 838 transacciones**,
  **`Availability %` = 100,0**, 0 fallidas, 1806,44 trans/s, 2,42 MB/s,
  respuesta media 0,03 s, **respuesta más larga 0,14 s**, concurrencia media
  47,38.
- **Captura**: ![T04 — Siege Load](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T04-siege-load-1.png)
- **Análisis vs. umbral**: ✅ 100 % ≥ 99,9 % (margen: ninguna transacción fallida
  en ~109 000).
- **Conclusión**: disponibilidad de baseline confirmada sobre el camino completo
  (estática + `/api/health` + catálogo).

### T05 — JMeter Load (informe completo)

- **Objetivo**: carga sostenida de 60 s con informe de percentiles.
- **Hipótesis**: `Error % = 0` y p95 < 200 ms.
- **Procedimiento**: [T05 §](00-INSTRUCCIONES-PANEL.md) — preset `Load`,
  rutas `/`, `/api/health`, `/api/products/cheapest`.
- **Resultado** (run `20261026-001624-b96d`): **93 651 muestras, 0 errores
  (0,0 %)**, 1563,64 req/s, media 29,3 ms, máx 823 ms,
  **p50 18 · p90 66 · p95 102 · p99 191 ms**.

  | Ruta | Muestras | Erros | Media |
  |---|---|---|---|
  | `GET /` | 31 226 | 0 | 9,8 ms |
  | `GET /api/health` | 31 221 | 0 | 40,1 ms |
  | `GET /api/products/cheapest` | 31 204 | 0 | 38,0 ms |

- **Capturas**:
  - Panel: ![T05 — JMeter Load panel](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T05-jmeter-load-1.png)
  - Informe HTML: ![T05 — JMeter informe](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T05-jmeter-load-2.png)
- **Análisis vs. umbral**: ✅ p95 **102 ms < 200 ms** (51 % del presupuesto) y
  ✅ p99 191 ms también por debajo del umbral; errores 0 % → disponibilidad 100 %.
  Dato de interés: las peticiones a la API cuestan ~30 ms más que la página
  estática: es el precio de recorrer las tres capas (LB → Nginx → LB → API →
  datos).
- **Conclusión**: **prueba principal de aceptación de baseline: cumple**.

### T06 — JMeter Stress

- **Objetivo**: 200 hilos durante 90 s para ver por dónde empieza a romper.
- **Procedimiento**: [T06 §](00-INSTRUCCIONES-PANEL.md).
- **Resultado** (run `20261026-004542-59da`): **149 975 muestras, 0 errores
  (0,0 %)**, 1667,19 req/s, media 99,9 ms, máx 1398 ms,
  **p50 61 · p90 234 · p95 342 · p99 669 ms**.

  | Ruta | Muestras | Erros | Media |
  |---|---|---|---|
  | `GET /` | 50 030 | 0 | 32,0 ms |
  | `GET /api/health` | 50 022 | 0 | 134,1 ms |
  | `GET /api/products/cheapest` | 49 923 | 0 | 133,7 ms |

- **Capturas**:
  - Panel: ![T06 — JMeter Stress panel](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T06-jmeter-stress-1.png)
  - Informe HTML: ![T06 — JMeter informe](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T06-jmeter-stress-2.png)
- **Análisis vs. umbral**: ⚠️ **p95 342 ms supera los 200 ms**, pero en un test
  de *stress* diseñado para superarlos: el umbral de p95 < 200 ms aplica al
  baseline (T01–T05), no aquí. Con 0 errores, la conclusión es que **el primer
  síntoma de saturación es la latencia, no los fallos** — misma lectura que la
  del operador en `EVIDENCIAS.md` ("no hay errores pero la latencia empieza a
  crecer bastante").
- **Conclusión**: hallazgo esperado del stress; la capa de datos y la de
  aplicación **no rompen** a 200 hilos, solo encolan.

### T07 — Efecto de la caché (con y sin Redis)

- **Objetivo**: comparar el rendimiento de `/api/products/cheapest` con la caché
  caliente frente a recién limpiada.
- **Hipótesis**: el run tras limpiar (miss → Galera) debe ser más lento que el
  run con caché caliente.
- **Procedimiento**: [T07 §](00-INSTRUCCIONES-PANEL.md) — dos corridas `ab`
  Load sobre `http://presentation-entry/api/products/cheapest` con `POST
  /api/cache/clear` entre medias.

**Cronología verificada** (logs de Nginx de `web1/web2/web3`, que registran cada
`POST /api/cache/clear` con su tamaño de respuesta, más `/api/runs` del panel):

| Hora (UTC, 26-oct) | Evento | Dato |
|---|---|---|
| 00:51:43 | corrida auxiliar `…005143-9afb` | 2370,87 req/s · media 21,09 ms · p95 51 ms |
| 00:53:24 → 00:54:08 | 4 × `POST /api/cache/clear` | `false`, `true`, `false`, `true` |
| 00:54:28 | corrida auxiliar `…005428-c156` | 2460,18 req/s · media 20,32 ms · p95 34 ms |
| 00:57:07 → 00:57:21 | clears (`false`, `false`, **`true`**, `false`×5) | se repuebla con un GET y se vuelve a limpiar, según el procedimiento |
| **00:57:31** | **corrida 1 de la evidencia** `…005731-9071` | 2336,84 req/s · media 21,40 ms · **p95 35 ms** · arrancó con caché **vacía** (clear exitoso 17 s antes) |
| 00:58:14 | `POST /api/cache/clear` → `true` | borra la clave repoblada por la corrida anterior |
| **00:58:18** | **corrida 2 de la evidencia** `…005818-3869` | 2519,27 req/s · media 19,85 ms · **p95 32 ms** · arrancó con caché **vacía** (clear exitoso 4 s antes) |

*Validación del signo del clear*: la respuesta es
`{"cacheKey":…,"cacheEntryRemoved":<bool>}`; `false` ocupa **un byte más** que
`true`, así que en el log Nginx **74 B = `true`** y **75 B = `false`**. Se
comprueba en pares consecutivos (un `true` seguido 1 s después de un `false`:
segunda limpieza sin entrada).

**Resultados** (runs pegados en `EVIDENCIAS.md`; etiquetas A/B **invertidas**
respecto al orden real de ejecución):

| Run | Hora | Requests/s | Media | p95 | p99 | Fallos |
|---|---|---|---|---|---|---|
| `…005731-9071` (ejecutado 1º) | 00:57:31 | 2336,84 | 21,396 ms | 35 ms | 43 ms | 0 |
| `…005818-3869` (ejecutado 2º) | 00:58:18 | 2519,27 | 19,847 ms | 32 ms | 39 ms | 0 |

- **Capturas**:
  - Corrida 1: ![T07 — caché 1](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T07-cachefx-1.png)
  - Corrida 2: ![T07 — caché 2](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T07-cachefx-2.png)
- **Análisis**:
  1. ⚠️ **Desviación de procedimiento**: ninguna de las dos corridas (ni las dos
     auxiliares) se ejecutó con caché caliente; **las cuatro fueron de caché
     fría**, cada una tras un clear exitoso o tras expirar el TTL de 60 s. Por
     tanto el A/B "caliente vs frío" **no quedó aislado**.
  2. La diferencia entre corridas (2336–2519 req/s, ±3,7 %; 19,8–21,4 ms de
     media; p95 32–35 ms) está **dentro del ruido entre corridas**: con TTL de
     60 s y una sola clave, el run "frío" se recalienta con su **primera**
     petición, y el coste extra del miss se reparte entre 5000 peticiones
     (≈ 0,3 % del total).
  3. No hay diferencias de disponibilidad: 0 fallos en las cuatro corridas.
- **Conclusión**: bajo carga sostenida de 5000 peticiones **el efecto de la
  caché no es medible con este método** (está enmascarado por el propio
  autocalentamiento y por el ruido). El beneficio real de la caché solo es
  observable **petición a petición**.
- **Corrección propuesta (pendiente de ejecución)**: medir el mismo endpoint en
  frío y en caliente con tiempos de una sola petición y añadir el resultado a
  este bloque (5 min, no destructivo salvo el clear de la caché, que es
  descartable por diseño):

  ```bash
  # 1) frío: limpiar y medir la primera petición
  curl -s -X POST http://localhost/api/cache/clear; echo     # debe devolver true
  curl -s -o /dev/null -w 'frío:   %{time_total}s\n' http://localhost/api/products/cheapest
  # 2) caliente: repetir la misma petición
  for i in 1 2 3; do curl -s -o /dev/null -w 'caliente: %{time_total}s\n' http://localhost/api/products/cheapest; done
  # 3) repetir el bloque 1-2 tres veces para evitar un valor aislado
  ```

  Esperado: la petición en frío (Redis → `galera-proxy` → Galera → escritura en
  Redis) claramente superior a la caliente (solo Redis). Si lo ejecutas, pega las
  salidas en el bloque T07 de `EVIDENCIAS.md` y actualizo esta sección.

---

## 4. Resultado global contra los umbrales

| Criterio | Umbral | Dónde se mide | Resultado | Estado |
|---|---|---|---|---|
| Latencia p95 (baseline) | < 200 ms | T05 JMeter (camino completo de 3 capas) | **102 ms** | ✅ Cumple |
| Latencia p95 (baseline) | < 200 ms | T02 ab (presentación) | **16 ms** | ✅ Cumple |
| Latencia p99 (baseline) | < 200 ms (referencia) | T05 JMeter | **191 ms** | ✅ Cumple (margen estrecho) |
| Disponibilidad | ≥ 99,9 % | T04 Siege | **100,0 %** | ✅ Cumple |
| Disponibilidad | ≥ 99,9 % | T05 JMeter (0 errores / 93 651) | **100 %** | ✅ Cumple |
| Fallos | 0 | T01, T02, T03, T07 (ab) | **0 en todas** | ✅ Cumple |
| Latencia en stress | fuera del baseline | T06 JMeter (200 hilos) | p95 **342 ms**, 0 errores | ⚠️ Hallazgo esperado: la latencia es el primer síntoma |
| Punto de saturación | informativo | T03 (3 corridas) | techo ≈ 5100 req/s; p95 > 200 ms en conc. ~1000 | ✅ Documentado |

**Veredicto del bloque B0/B1: la línea baseline y el tráfico nominal CUMPLEN
todos los umbrales de aceptación** (p95 < 200 ms y disponibilidad ≥ 99,9 %), con
dos hallazgos documentados (T06 y T07) que no invalidan la aceptación.

---

## 5. Hallazgos

1. **Capacidad de la capa de presentación ≈ 5100 req/s** (T03): el throughput se
   estanca y la latencia pasa a ser el síntoma; el p95 cruza 200 ms con ~1000
   peticiones concurrentes, **sin ningún error HTTP**.
2. **T06 — el primer síntoma de saturación es la latencia**: a 200 hilos, p95
   342 ms y p99 669 ms con **0 errores**; las rutas de API suben de ~40 a ~134 ms
   de media. La arquitectura degrada encolando, no fallando.
3. **T07 — desviación de procedimiento**: las cuatro corridas fueron de caché
   fría (verificado en logs de Nginx) y las etiquetas A/B de la evidencia están
   invertidas; el efecto de la caché no es medible bajo carga sostenida y queda
   propuesta una medición petición a petición.
4. **Las pruebas T01–T03 miden solo la capa de presentación** (objetivo
   `http://presentation-entry/`, página estática): sus p95 de 1–58 ms no
   representan el camino completo. El camino de 3 capas lo miden T04, T05 y T06
   (y T07 sobre el endpoint de catálogo).
5. **El camino de API cuesta ~30 ms más que la estática** (T05: 9,8 ms `/` frente
   a 38–40 ms `/api/*`): es la suma de HAProxy + Nginx + HAProxy + API + datos.
6. **Registro auxiliar**: el panel contiene tres runs que no se usan como
   evidencia (JMeter idéntico a T05 a las 00:33 y dos corridas `ab` previas a
   T07); están anotados en la sección de Incidencias de `EVIDENCIAS.md`.

---

## 6. Límites del entorno (aplican a todo el informe)

- **Todo en un solo host**: la redundancia demostrada es de proceso, no de
  máquina. **No se demuestra HA ante la pérdida del host** ni del motor Docker.
- **SPOFs presentes desde la línea base**: `presentation-entry` (puerto 80) y
  `galera-proxy` (entrada SQL); ver [`../ARQUITECTURA.md`](../ARQUITECTURA.md).
- **Nagios solo comprueba, no notifica** (`architecture.cfg` sin
  `contact_groups` ni `notification_interval`) y su comprobación de Keepalived es
  **solo TCP**, sin validar el estado VRRP. Se desarrolla en B5.
- **El laboratorio corre en el mismo host** que el sistema medido: sus números
  (y el propio `docker stats`, no registrado por ser opcional) incluyen esa
  carga.
- `ab` se ejecutó **sin keep-alive** (`KEEPALIVE: false`), así que sus cifras
  incluyen el coste de establecer conexión en cada petición.
- Los **percentiles de ab** son enteros (milisegundos redondeados) frente a los
  de JMeter; al comparar, usar la misma herramienta.

---

## 7. Trabajo futuro derivado de este bloque

- **Medir el efecto de la caché petición a petición** (corrección de T07) y,
  si se quiere aislamiento total, ampliar T07 a un test con y sin Redis completo.
- **Pruebas por capa** (`Capacity per layer` del `TEST-PLAN.md`): medir web, app
  y base de datos por separado para confirmar dónde está el techo de 5100 req/s.
- **Spike y Soak** (previstos en el plan, sin preset en el panel): JMeter con
  ramp-up agresivo y sesiones de horas.
- **Recursos por contenedor** (`docker stats`/cAdvisor) para correlacionar la
  curva de T03 con CPU/RAM.
- **Prometheus + Grafana** para conservar gráficas de cada experimento.
