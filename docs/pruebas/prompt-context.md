# Contexto para continuar la redacción del informe final

Copia y pega lo siguiente en una nueva sesión de agente:

---

## Contexto del proyecto

Proyecto académico `distributedsystems` (repo local, rama `main`): una **tienda online de tres capas** desplegada con **Docker Compose en un solo host** (29 contenedores: presentación con HAProxy + VIPs Keepalived + 3 Nginx, aplicación con HAProxy + 3 APIs Node.js, datos con Galera de 3 nodos + `galera-proxy`, replica set MongoDB de 3 miembros, Redis de 3 nodos + 3 Sentinels, y Nagios), más un **laboratorio de resiliencia (`resilience-lab/`)** con panel web en `http://localhost:8090` (ApacheBench, Siege, JMeter, Chaos Monkey).

**Objetivo final**: entregar un conjunto de documentos en **español, Markdown**, con la **arquitectura del sistema** y **todas las pruebas ejecutadas con sus resultados y evidencias**. El usuario los copiará manualmente al **Wiki del repo en GitHub** y luego los borrará del código; así que los archivos en el repo son andamiaje temporal de redacción.

**Decisiones ya tomadas (no reabrir)**:
- Se documenta y prueba **solo el entorno actual (Compose, un host)**; Docker Swarm y otros planes (fases A0–A7 de `docs/PROJECT-CONTEXT.md`) solo como "trabajo futuro/limitación".
- Idioma: **español**. Umbrales de aceptación: los de `resilience-lab/TEST-PLAN.md` (**p95 < 200 ms**, **disponibilidad ≥ 99.9%** en baseline; **≥ 99%** durante inyección de fallos). Si no se cumplen, se documenta como hallazgo, no se oculta.
- Estructura de entrega: **varios documentos separados por tema** + un **documento central (`docs/INFORME-WIKI.md`)** que resume y enlaza a los demás.
- **Ningún test fallido se "arregla" en silencio**: se identifica, se explica y se propone corrección al usuario antes de redactar el resultado como válido.

## Documentos clave (léelos todos antes de escribir)

1. **`docs/pruebas/00-INSTRUCCIONES-PANEL.md`** — procedimiento completo de las pruebas ejecutadas. Define las **26 pruebas T00–T26** organizadas en **bloques**:
   - **B0** línea base (T00, checkpoint CP-B0)
   - **B1** rendimiento (T01–T07, presets ab/Siege/JMeter)
   - **B2** failovers de presentación/aplicación (T08–T13, Chaos Monkey con `TARGETS`)
   - **B3** failovers de datos: Galera, Mongo, Redis/Sentinel (T14–T19)
   - **B4** Chaos Engineering (T20–T24, incluido compuesto)
   - **B5** observabilidad/Nagios (T25–T26)
   Cada prueba indica: parámetros exactos del panel, **qué se esperaba** y el nombre de sus capturas.
2. **`docs/tests/EVIDENCIAS.md`** — **la fuente de resultados**. El usuario la fue rellenando con: salidas de checkpoints (salud, `wsrep_cluster_size`, estado del replica set, quorum de Sentinel, VIPs), respuestas HTTP, notas de Nagios, nombres de capturas y, cuando los pegó, los **JSON de métricas de cada run** (`/api/runs/<id>`).
3. Otros documentos de contexto: `docs/PROJECT-CONTEXT.md` (historial y alcance), `resilience-lab/TEST-PLAN.md` (matriz original de pruebas), `docs/estado.md`, `docs/tests/context`, `DATA-HA.md`, `README.md` (diagrama Mermaid fuente), `docs/START-DOWN.md`.

## Reglas de trabajo para esta sesión

- **NO abras ni visualices las capturas PNG** de `docs/tests/evidencias/img/` (33 archivos con nombre fijo `TNN-...-N.png`). No gastes tokens en imágenes: **todo lo que necesitas saber está descrito en texto** en `docs/tests/EVIDENCIAS.md` (y lo que no está, pregunta al usuario).
- **Si un resultado no fue el esperado, el usuario lo habrá escrito tal cual en `EVIDENCIAS.md`** (en el bloque de esa prueba, en "Incidencias" o en los checkpoints). Trátalo como hallazgo real del sistema.
- **Antes de generar cualquier documento final**, recorre `EVIDENCIAS.md` prueba por prueba y:
  1. Detecta **todas las pruebas cuyo resultado no coincide con lo esperado** en `00-INSTRUCCIONES-PANEL.md` (o con los umbrales de `TEST-PLAN.md`).
  2. Detecta **pruebas sin ejecutar** (marcadas `NO EJECUTADA` o con huecos vacíos) y **bloques de evidencia vacíos**.
  3. **Preséntame la lista completa de desviaciones y dudas**, y ayúdame a **corregirlas o a reejecutarlas** (dándome el procedimiento exacto) **antes** de redactar el informe definitivo. Solo cuando todo esté resuelto o justificado, escribe los documentos finales.
- Respeta la terminología y numeración de pruebas (T00–T26, bloques B0–B5, checkpoints CP-Bx): la cruzan todos los documentos.
- No modifiques `docker-compose.yml`, `resilience-lab/`, `nagios/`, `haproxy/`, `keepalived/`, `ESTRATEGIA-HA-DR.md` ni `ToDo.md`.
- No ejecutes pruebas destructivas tú: las pruebas las ejecuta el usuario siguiendo `00-INSTRUCCIONES-PANEL.md`.

## Entregables que debes producir (una vez validados los resultados)

| Archivo | Contenido |
|---|---|
| `docs/INFORME-WIKI.md` | Documento central: resumen ejecutivo, arquitectura en una página, matriz global de pruebas con estado y resultados, hallazgos, conclusiones, enlaces al resto. Es el que irá al Wiki. |
| `docs/ARQUITECTURA.md` | Topología por capas, flujo de una petición, tabla de servicios/imágenes, IaC, modelo de redundancia y SPOFs, diagrama (fuente Mermaid en `README.md`; el usuario exportará el JPG). |
| `docs/pruebas/01-BASELINE-RENDIMIENTO.md` | Resultados de B0 y B1 (T00–T07) contra los umbrales. |
| `docs/pruebas/02-FAILOVER-PRESENTACION-APLICACION.md` | Resultados de B2 (T08–T13). |
| `docs/pruebas/03-FAILOVER-DATOS.md` | Resultados de B3 (T14–T19). |
| `docs/pruebas/04-CHAOS-ENGINEERING.md` | Resultados de B4 (T20–T24). |
| `docs/pruebas/05-OBSERVABILIDAD.md` | Resultados de B5 (T25–T26), incluyendo el hallazgo de que Nagios solo comprueba y no notifica. |
| `docs/tests/matriz-pruebas.md` | Matriz maestra: ID, objetivo, hipótesis, umbral, estado (ejecutada/NO ejecutada/N-A), enlace a procedimiento y a evidencia. |

Cada documento de prueba debe incluir: objetivo, hipótesis, procedimiento (referencia a `00-INSTRUCCIONES-PANEL.md`), **resultado real con las cifras de `EVIDENCIAS.md`**, capturas referenciadas por nombre (`docs/tests/evidencias/img/...`), análisis vs. umbral y conclusiones. Incluye también los **límites del entorno** (todo en un host: no se demuestra HA ante pérdida del host; Nagios sin notificaciones; check de Keepalived solo TCP) y el **trabajo futuro** (Swarm, Prometheus/Grafana, Pumba/Toxiproxy).

---