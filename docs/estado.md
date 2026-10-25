Voy a contrastar el último commit con el estado actual del árbol y leer el ToDo, la documentación de arquitectura y las instrucciones del laboratorio; no ejecutaré el proyecto ni comandos que modifiquen archivos.

## Resumen

Revisé el último commit: **`641b580f026e798561bd547fab8b24f8cb626cf6`**, “Implementación de mejoras en el proyecto” (23 de octubre de 2026). El árbol de trabajo no mostró cambios pendientes. No ejecuté el proyecto, pruebas ni comandos que alteren archivos o servicios.

Este proyecto es una **demostración local de una arquitectura web de tres capas**:

- Tres Nginx sirven la tienda; HAProxy distribuye el tráfico y Keepalived administra VIPs de presentación y aplicación.
- Tres APIs Node.js consultan el catálogo MariaDB Galera, leen y escriben reseñas en MongoDB y usan Redis como caché descartable.
- Un proxy HAProxy para Galera selecciona nodos que pasan comprobaciones de estado.
- Nagios monitorea la infraestructura.
- El laboratorio de resiliencia incluye ApacheBench, Siege, JMeter y Chaos Monkey.

Aunque hay varios contenedores y réplicas, **la topología actual sigue viviendo en un solo host Docker Compose**. No ofrece alta disponibilidad ante la pérdida del host ni equivale todavía a un sistema distribuido entre nodos.

## ToDo: qué está marcado y qué falta

En `ToDo.md`, están marcados como completados:

- Configurar un replica set MongoDB de tres miembros.
- Configurar Redis con réplicas y Sentinel, y definirlo como caché prescindible.
- Dejar de conectar la API directamente a `galera1`; usar `galera-proxy`.
- Definir el enrutamiento SQL y revisar los límites de conexiones.

**Eso acredita que existe configuración en el repositorio, no que se haya aceptado mediante pruebas reales.** La documentación reconoce que las elecciones y los failovers todavía están pendientes; véase `DATA-HA.md`.

Pendiente según el mismo ToDo:

1. **Distribuir la aplicación entre hosts:** usar un orquestador o plataforma multinodo, un balanceador externo/ingress y escalado, descubrimiento y reinicios gestionados. Revisar los VIPs y el puerto publicado, que no dan alta disponibilidad del host.
2. **MariaDB:** definir monitorización y copias de respaldo/restauración, e **ir probando la restauración**. No basta con tener volúmenes.
3. **Caché:** prevenir cache stampedes e invalidar entradas afectadas cuando cambie el catálogo. La aplicación tiene una clave y TTL para la consulta actual, y el borrado está limitado a esa clave; sin embargo, el ToDo aún no marca esas tareas como hechas. No encontré una API de escritura para el catálogo.
4. **Observabilidad de producción:** instrumentar trazas OpenTelemetry, centralizar métricas/logs/trazas y crear alertas y dashboards. Nagios existe, pero no cubre por sí solo esa observabilidad; las cabeceras de traza actuales no son trazas distribuidas.
5. **Seguridad y operación:** cuenta MongoDB de mínimo privilegio, gestionar secretos fuera de archivos de ejemplo/versionados, TLS en la entrada, autenticación y rate limiting de API, migraciones y procedimientos operativos/de recuperación. La API usa las credenciales del usuario root de MongoDB configurado.
6. **Aceptación operativa:** probar en un entorno descartable el failover de MongoDB, Redis Sentinel y Galera, además de reinicios y recuperación.

## Instrucciones para iniciar Compose y el laboratorio

**Estos son pasos para que los ejecutes tú cuando decidas comenzar; no los ejecuté.** Antes de usar datos que te importen, lee las precauciones sobre volúmenes existentes en `DATA-HA.md`. Recomiendo hacer las primeras pruebas en un entorno descartable. El ejemplo de entorno contiene contraseñas de muestra y debe reemplazarse; asegúrate también de que los puertos 80, 8088 y 8090 estén disponibles.

Desde la raíz del repositorio:

```sh
cp .env.example .env
```

Edita `.env` y reemplaza las contraseñas de ejemplo. Luego inicia el stack principal:

```sh
docker compose up -d --build
```

Cuando esté iniciado, las direcciones documentadas son:

- Tienda: `http://localhost/`
- Nagios: `http://localhost:8088/` — usuario `nagiosadmin`; contraseña definida en `NAGIOSADMIN_PASSWORD` de `.env`.

En una segunda terminal, inicia el laboratorio:

```sh
cd resilience-lab
docker compose up -d --build
```

Abre `http://localhost:8090/`. El laboratorio se conecta a la red `distributed-three-tier_edge` y apunta por defecto a `http://presentation-entry`. Si personalizas el nombre del proyecto principal, tendrás que configurar `TARGET_PROJECT` para que coincida.

### Orden sugerido de pruebas

1. Antes de inyectar fallos, comprueba en el dashboard el **Smoke** de ApacheBench o JMeter. El endpoint de salud que usa el plan y el dashboard es `http://presentation-entry/api/health`; Nginx quita el prefijo `/api` al enviar la petición a la API.
2. Haz una prueba de carga y anota latencia, percentiles, throughput y errores. Contrasta también recursos de los contenedores y salud de las capas según `resilience-lab/TEST-PLAN.md`.
3. Para Chaos Monkey, empieza con **Dry run**; luego prueba un grupo y un fallo controlado por vez. El dashboard y Chaos Monkey tienen acceso al socket de Docker, así que pueden detener contenedores: úsalo únicamente en una máquina y datos que puedas perder.
4. Deja para una fase posterior los ensayos que afectan mayoría de MongoDB, recuperación de Galera o fallos combinados. El plan espera esos fallos bajo carga constante y requiere registrar interrupción y solicitudes fallidas.

## Correcciones que conviene documentar

- `CAMBIOS_IMPLEMENTADOS.md` parece conservar una instantánea previa: menciona otro HEAD (`10c8832…`) y cambios “todavía sin confirmar”, pero el último commit actual (`641b580…`) ya incluye ese documento y los cambios descritos. Conviene actualizar esas referencias para que no presenten el estado histórico como el actual.
- `resilience-lab/TEST-PLAN.md` es más amplio que lo que ejecuta el dashboard. El laboratorio apunta por defecto a la entrada de presentación; las pruebas directas de cada capa requieren instrucciones y conectividad específicas. Además, la API no ofrece una operación para escribir el catálogo, así que la prueba de “escribir en un nodo Galera y leer en los demás” necesita un procedimiento SQL controlado documentado.
- El plan propone pruebas **Spike** y **Soak de varias horas**, pero los presets visibles del dashboard son Smoke/Load/Stress; su duración máxima configurada es de una hora. Conviene añadir esos escenarios como presets/procedimientos o aclarar que se ejecutan con otra herramienta.
- En `ToDo.md`, revisar las casillas de caché: ya existe una clave/TTL para la consulta actual y el borrado se limita a esa clave, pero sigue faltando la protección contra stampede. También sería útil aclarar que los checks de HA describen implementación, no aceptación operativa.
- La instrucción de conservar Compose como entorno local aparece sin marcar, aunque README y laboratorio ya describen ese uso.

Esta revisión fue solo documental: no hice esas correcciones ni arranqué servicios o pruebas.