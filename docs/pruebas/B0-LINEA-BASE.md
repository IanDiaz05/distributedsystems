# Bloque 0 — Línea base

**Objetivo:** comprobar que la tienda está operativa antes de inyectar fallos y que el balanceo distribuye las peticiones.

**Procedimiento:** [00-INSTRUCCIONES-PANEL.md](./00-INSTRUCCIONES-PANEL.md), bloque 0. El checkpoint CP-B0 se omite aquí porque no se registraron incidencias, según lo indicado por el autor.

## T00 — Salud y round-robin

Se consultó la portada de la tienda y el endpoint de salud, y se repitieron solicitudes para observar las cabeceras de trazabilidad. La API indicó estado correcto y caché disponible. Las cabeceras `X-Request-Trace` recorrieron `webnode2`, `webnode3` y `webnode1`, y también rotaron las APIs `app1`, `app2` y `app3`. Las consultas al catálogo y a las reseñas devolvieron contenido. En Nagios se capturó la vista Service Detail sin estados CRITICAL.

![Tienda online](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T00-salud-1.png)

![Estado inicial de Nagios](https://raw.githubusercontent.com/IanDiaz05/distributedsystems/main/docs/tests/evidencias/img/T00-salud-2.png)

## Comparación técnica de la evidencia JSON

| Dato registrado | Resultado |
|---|---|
| `status` de `/api/health` | `ok` |
| `cache` de `/api/health` | `available` |

## Análisis

La ruta de usuario, la API y las consultas básicas de catálogo y reseñas estaban disponibles. La rotación observada confirma el balanceo en la capa web y de aplicación. Es una línea base funcional en Compose sobre un único host; no demuestra tolerancia a la pérdida del host.
