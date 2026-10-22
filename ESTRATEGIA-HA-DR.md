# Estrategia de implementación de alta disponibilidad y DR

## Propósito y alcance

Este documento convierte todos los puntos de [ToDo.md](./ToDo.md) en una
estrategia implementable para el proyecto de catálogo de tres capas. El objetivo
es ejecutar contenedores en al menos dos equipos de la misma LAN, detectar
fallos, recuperar automáticamente los servicios sin estado y probar escenarios
de desastre (DR) de forma repetible.

La plataforma propuesta para el laboratorio es Docker Swarm: mantiene el
desarrollo local con Docker Compose y permite desplegar servicios en varios
nodos sin introducir Kubernetes. Esta elección no implica que dos equipos
puedan proporcionar alta disponibilidad completa para el plano de control ni
para todos los datos.

## Resumen del proyecto actual

La aplicación ofrece un catálogo estático servido por Nginx, una API Node.js,
MariaDB Galera para el catálogo, MongoDB para reseñas y Redis para cache. Hay
varios Nginx, API y HAProxy, dos pares Keepalived, Nagios y un laboratorio de
carga/caos. Sin embargo, `docker-compose.yml` levanta esos contenedores en un
único host: el número de réplicas no equivale a redundancia entre equipos.

Limitaciones relevantes observadas:

- `presentation-entry` publica el puerto 80 en un contenedor único y es un
  punto de fallo del acceso externo.
- Keepalived usa direcciones fijas y VRRP entre contenedores. No debe
  trasladarse sin cambios a redes overlay de Swarm; Docker tampoco mueve la
  publicación de un puerto de Compose junto con una VIP.
- Las instancias de aplicación usan `DB_HOST=galera1`; perder ese nodo rompe
  consultas aunque otras instancias Galera sigan activas.
- MongoDB y Redis son instancias únicas. Las réplicas de API tampoco eliminan
  esos puntos únicos.
- Los volúmenes nombrados y bind mounts actuales pertenecen al host local; una
  tarea reprogramada en otro equipo no obtiene automáticamente esos datos ni
  los archivos de configuración del repositorio.
- Nagios se ejecuta dentro de la misma pila que debe vigilar. Puede quedar
  inaccesible junto con el equipo afectado.
- El laboratorio de caos usa `docker.sock` y el proyecto Compose local. Sus
  experimentos actuales no prueban reprogramación de servicios Swarm entre
  hosts.

## Decisión crítica: lo que permiten dos equipos

Docker Swarm requiere quorum de managers para tomar decisiones de
orquestación. Con dos managers, la mayoría es dos: si se pierde cualquiera,
el manager restante no conserva quorum. Con un manager y un worker, la caída
del worker se puede tolerar, pero la caída del host manager impide que el
clúster programe tareas o se recupere por sí solo. Ejecutar un manager en cada
host no resuelve esto.

Por tanto, **con solo dos equipos físicos no se puede garantizar recuperación
automática ante la pérdida de cualquiera de ellos** manteniendo un plano de
control Swarm disponible. Tampoco se deben prometer failover automático y
consistencia de las bases de datos ante la pérdida arbitraria de un host sin
un tercer dominio de fallo o un servicio externo que aporte quorum.

### Modalidad recomendada para el entorno disponible

1. Formar un Swarm con **un manager dedicado y un worker**; ubicar el manager en
   el equipo más estable. No desplegar servicios de aplicación en el manager
   salvo que se necesite capacidad de emergencia.
2. Distribuir las réplicas sin estado entre ambos hosts y fijar un mínimo de
   dos réplicas por servicio crítico. El Swarm reprogramará una tarea si cae
   un contenedor, siempre que haya un manager operativo y capacidad disponible.
3. Aceptar explícitamente que la caída del host manager es un incidente de
   control-plane: alertar y documentar recuperación manual del manager. No
   automatizar `--force-new-cluster` como sustituto de quorum; una promoción
   incorrecta puede crear dos clústeres y causar split-brain.
4. Usar volúmenes replicados por la propia base de datos y copias de seguridad
   fuera de ambos hosts. No confiar en volúmenes locales para recuperación
   entre nodos.
5. Para cumplir el requisito estricto de recuperación automática también ante
   la pérdida del manager, cambiar una premisa: incorporar un tercer manager
   en un tercer dominio de fallo, o usar un plano de control/servicio gestionado
   externo. Una VM o testigo que esté alojado en uno de los dos hosts no es un
   tercer dominio de fallo.

La solución de dos equipos sigue siendo adecuada para ensayar recuperación de
contenedores, caída de procesos, fallos de servicios y pérdida del worker,
pero debe etiquetarse como **HA de servicios con recuperación parcial**, no
como DR completo ante la pérdida de cualquier equipo.

## Arquitectura objetivo

### Plano de acceso y servicios sin estado

- Crear un Swarm con nodos anunciados mediante direcciones LAN estables,
  firewall limitado a la LAN y puertos de Swarm habilitados entre hosts
  (TCP/UDP 7946 y UDP 4789; TCP 2377 hacia el manager).
- Publicar la aplicación mediante el routing mesh de Swarm en el puerto
  acordado. Cada IP de nodo puede recibir tráfico para el puerto publicado.
- Si se requiere una única IP estable para clientes LAN, ejecutar el balanceo
  de entrada fuera de la red overlay: un balanceador de red/router con health
  checks, o HAProxy/Keepalived en los hosts con VRRP soportado por la LAN. La
  VIP debe configurarse y probarse en la interfaz física; no reutilizar la VIP
  actual dentro de la overlay. Si el router no soporta failover, documentar
  explícitamente cómo descubrir/acceder a cada IP de nodo.
- Desplegar Nginx/web y API como servicios replicados, con health checks,
  política de reinicio, actualización gradual y rollback. Mantenerlos sin
  estado local. Añadir constraints/placement solo para requisitos reales y
  evitar fijar todas las réplicas a un mismo host.
- Los cambios de configuración deben estar versionados como configuración
  Docker/archivos de imagen; no montar rutas relativas del repositorio en los
  servicios desplegados.

### Plano de datos

- Mantener MariaDB como servicio distribuido solo después de definir su
  colocación, quorum, bootstrap inicial, proxy de acceso y recuperación. No
  asumir que tres contenedores en dos hosts equivalen a tres dominios de fallo.
- Sustituir `galera1` como endpoint de aplicación por un servicio de proxy
  consciente de MariaDB/Galera, o un endpoint gestionado. El proxy debe
  comprobar estado de los nodos y enrutar escrituras a nodos aptos. Definir
  explícitamente si las lecturas se dirigen a cualquier nodo sincronizado o
  solo al primario elegido. Ajustar límites de conexiones del proxy, pool API
  y número de réplicas conjuntamente.
- Configurar MongoDB como replica set solo si se cuenta con suficientes votos y
  dominios de fallo para elegir primario durante los fallos previstos. Un
  replica set de dos miembros no garantiza elección tras la caída de uno; un
  árbitro en uno de los dos hosts tampoco sobrevive a la pérdida de ese host.
  Si no se añade un tercer dominio, documentar la indisponibilidad esperada y
  priorizar backup/restauración verificada o un servicio externo.
- Decidir Redis como **cache descartable** para el catálogo. En ese modo, una
  caída puede vaciar/inutilizar la cache sin pérdida de datos de negocio; la
  API degrada a MariaDB y vuelve a poblar el cache. Solo añadir persistencia o
  HA de Redis si el requisito cambia y se define RPO/RTO para su contenido.
- Definir almacenamiento persistente por servicio. Los datos locales no se
  comparten entre nodos. La replicación propia de la base de datos debe ser el
  mecanismo primario de continuidad; mantener backups cifrados fuera de ambos
  hosts y hacer pruebas de restauración regulares.
- Separar tareas de inicialización/migración de las réplicas de la API:
  ejecutarlas una vez, de forma controlada e idempotente, antes de desplegar o
  actualizar la aplicación.

### Salud, monitoreo y telemetría

- Definir health checks distintos para **liveness** (el proceso puede seguir
  funcionando) y **readiness** (la instancia puede atender tráfico). Una caída
  de una dependencia no debe provocar reinicios en bucle de todas las réplicas.
- Mantener Nagios durante la transición o sustituirlo de forma planificada por
  Prometheus/Grafana y exporters; monitorizar también ambos hosts desde una
  ubicación independiente de los servicios monitorizados. Añadir alertas para
  host/nodo Swarm, quorum del manager, disponibilidad de réplicas, HAProxy,
  base de datos, cache, uso de disco, CPU y memoria.
- Centralizar logs con etiquetas de host/servicio/instancia y retención
  definida; recoger métricas de infraestructura y aplicación.
- Instrumentar Nginx, API y llamadas a bases de datos con OpenTelemetry,
  exportar trazas OTLP a un colector y correlacionar por `traceparent`/W3C
  Trace Context. Sustituir gradualmente el encabezado `X-Request-Trace` y su
  UI propia en `web/catalog.js`, `application/index.js` y el wiring de
  `docker-compose.yml`; no perder los datos útiles de nodo/servicio durante la
  transición.
- Establecer umbrales y alertas accionables. Nagios/Prometheus detecta e
  informa; Swarm es quien reconcilia y reinicia las tareas, no el monitor.

## Plan de trabajo: requisitos del ToDo

### Fase 0 — Contratos y preparación

- Registrar que el objetivo inmediato son dos hosts y acordar la limitación
  del manager indicada arriba. Definir SLO, RTO y RPO por servicio y por tipo
  de fallo (proceso, contenedor, nodo, datos, LAN).
- Confirmar recursos, direcciones IP, DNS/nombre de servicio, puertos,
  firewall, sincronización de tiempo y si la LAN/router permite una VIP
  mediante VRRP.
- Clasificar cada dato como descartable o persistente y decidir quién opera
  backups, secretos y restauraciones.
- Mantener `docker-compose.yml` como entorno de desarrollo de un host y
  preparar una definición separada de producción/laboratorio Swarm. Evitar
  convertir Compose local en un archivo que prometa semánticas que Swarm no
  implementa.

### Fase 1 — Preparar y desplegar Swarm

- Construir y publicar imágenes versionadas para web, API, proxy y servicios
  auxiliares en un registry accesible desde ambos hosts; `docker stack deploy`
  no construye `build:` como Compose.
- Crear redes overlay separadas para edge, aplicación y datos; configurar
  secrets/configs Swarm y health checks compatibles con imágenes y servicios.
- Migrar los servicios sin estado primero. Definir réplicas, placement,
  actualización gradual, rollback, límites de recursos y publicación de
  puertos. Verificar que un fallo de contenedor y la caída del worker dejan
  réplicas servibles.
- Eliminar o rediseñar dependencias de Compose que no se trasladan directamente:
  `depends_on`/condiciones de salud, `network_mode: service:...`, IP estáticas,
  bind mounts del repositorio y `build:`. Usar health checks, descubrimiento
  DNS de servicios, overlay, imágenes y configuración versionada.
- Resolver el punto único de entrada con routing mesh más acceso a IPs de
  ambos nodos o con un balanceador/VIP externo probado. No anunciar
  `presentation-entry` como redundante hasta tener dos destinos de entrada
  independientes.

### Fase 2 — Base de datos y continuidad de datos

- Decidir explícitamente topología y política de recuperación de MariaDB
  Galera, MongoDB y Redis antes de migrar volúmenes. Para cada una documentar
  votos/quorum, dominios de fallo, almacenamiento, backup, restauración y
  procedimiento de bootstrap tras la pérdida total.
- Añadir el proxy/endpoint de MariaDB y retirar `DB_HOST=galera1` tanto de la
  API como de `init-db.js`. Probar consulta y escritura en las condiciones de
  failover acordadas.
- Implementar replica set/servicio gestionado para MongoDB únicamente con
  quorum de votos suficiente para los fallos objetivo; verificar escrituras y
  lecturas durante elección. Mantener backups independientes incluso con
  replicación.
- Operar Redis como cache descartable por defecto: capturar hit/miss, TTL,
  degradación ante fallo y repoblación. Añadir protección de cache stampede y
  dejar el endpoint de limpieza limitado a la clave/namespace de catálogo.
- Configurar monitoreo de MariaDB y ejecutar restauraciones de backup de forma
  periódica. La replicación no sustituye al backup.

### Fase 3 — Comportamiento y seguridad de aplicación

- Definir claves y TTL por consulta, invalidar claves afectadas al cambiar el
  catálogo y añadir protección frente a múltiples misses simultáneos.
- Mantener el endpoint de borrado restringido al cache de catálogo previsto.
- Crear un usuario de MongoDB de mínimo privilegio para la API; reservar la
  cuenta root para administración. Proteger Redis con autenticación/ACL y
  limitarlo a la red privada.
- Mantener secretos fuera del repositorio y de imágenes; usar Docker secrets
  para secretos Swarm y un mecanismo local ignorado por Git para desarrollo.
  Rotar cualquier credencial de ejemplo/default antes de exponer el servicio.
- Terminar TLS en el ingreso expuesto y proteger endpoints con autenticación y
  rate limiting cuando el modelo de acceso lo requiera.
- Introducir migraciones versionadas e idempotentes para MariaDB y MongoDB,
  ejecutadas como tarea de despliegue controlada, no por todas las réplicas.
- Definir timeouts, límites de conexiones y degradación: Redis puede fallar sin
  tumbar lecturas del catálogo; la indisponibilidad de una base de negocio debe
  producir un error visible, alertable y recuperable, no datos falsos.

### Fase 4 — Observabilidad distribuida y operación

- Añadir spans y métricas para presentación, API, consultas DB y cache con
  OpenTelemetry. Desplegar colector y backend de trazas; centralizar métricas y
  logs con capacidad de correlación.
- Sustituir la UI/headers de trazas propios sin confundir identificadores de
  instancia con trazas. Actualizar los archivos indicados en el ToDo y documentar
  cómo localizar una petición de extremo a extremo.
- Añadir dashboards y alertas para latencia/error rate, saturación, estado de
  servicios y dependencias, quorum y backups. Monitorear ambos hosts desde
  fuera del host observado cuando sea posible.
- Escribir runbooks de despliegue, rollback, pérdida de worker, pérdida del
  manager, caída de bases, recuperación de datos y caída total. Señalar qué
  pasos son automáticos y cuáles requieren operador.

### Fase 5 — Laboratorio de fallos y aceptación

- Adaptar el laboratorio de resiliencia para el contexto Swarm y el alcance
  exacto de los experimentos. Separar claramente pruebas de `docker compose`
  local de pruebas sobre el Swarm. Mantener el acceso a `docker.sock` solo en
  un entorno de laboratorio de confianza.
- Ejecutar la matriz siguiente bajo carga controlada, registrar hora de
  inyección/detección/recuperación, solicitudes fallidas, p95/p99, consistencia
  de datos y acciones manuales.
- No probar particiones Galera, bootstrap forzado ni comandos de recuperación
  destructivos fuera de datos descartables y un procedimiento revisado.

## Matriz mínima de pruebas y criterios de aceptación

| Escenario | Resultado esperado / criterio |
|---|---|
| Detener o matar una tarea web/API | El health check la excluye; Swarm recrea la tarea y el servicio continúa con las réplicas sanas. |
| Perder un contenedor HAProxy | El tráfico llega a una instancia de ingreso sana; no depende de la publicación de un contenedor desaparecido. |
| Perder el worker completo | Las tareas sin estado se reprograman en el manager si hay capacidad; se registra la capacidad reducida y el tiempo de recuperación. |
| Perder el host manager (dos nodos) | El monitoreo externo alerta; el runbook declara intervención manual. No se afirma recuperación automática Swarm ni se fuerza quorum automáticamente. |
| Perder MariaDB/Galera | El proxy retira nodos no aptos; lecturas/escrituras continúan solo si la topología conserva quorum. Validar escrituras tras failover. |
| Perder MongoDB | Revisiones se marcan degradadas o siguen disponibles si hay replica set con quorum; no aceptar escrituras ambiguas. |
| Perder Redis | Catálogo sigue leyendo de MariaDB, cache se repuebla y el servicio no devuelve 500 por ser Redis una cache descartable. |
| Perder entrada/VIP | El cliente puede alcanzar el otro nodo o el balanceador externo conmuta dentro del RTO acordado. |
| Reiniciar todos los contenedores/hosts | Seguir runbook de orden de arranque y bootstrap; verificar que no se crea un clúster DB vacío o dividido. |
| Restaurar un backup | Restaurar en entorno aislado y verificar integridad del catálogo/reseñas; medir RPO y RTO frente a los objetivos. |
| Pérdida de LAN o partición entre hosts | Alertar, evitar escrituras inseguras/split-brain y documentar el estado que conserva servicio. La resolución depende del quorum real de cada base. |
| Carga más fallo | Mantener el SLO acordado; medir disponibilidad, p95/p99, errores, saturación, tiempo de detección y de recuperación. |

Los valores exactos de RTO, RPO y SLO deben acordarse antes de convertir los
ejemplos del plan de pruebas actual (como p95 < 200 ms o disponibilidad >=
99.9%) en criterios de aceptación obligatorios.

## Requisitos del ToDo y cobertura

| Requisito del ToDo | Cómo queda cubierto |
|---|---|
| Despliegue multi-nodo en Kubernetes/servicio gestionado | Se propone Swarm multi-nodo para LAN y se conserva Compose solo para desarrollo; se hace explícita la limitación de dos hosts. |
| Balanceo externo/ingress | Routing mesh más dos IPs de nodo o balanceador/VIP externa; retirar la dependencia del `presentation-entry` único. |
| Descubrimiento, health routing, reinicios y escalado | DNS de servicios, health checks, políticas de reinicio, réplicas, placement y rolling updates Swarm. |
| Revisar Keepalived y puerto de presentación | No trasladar VRRP/IP estática del overlay; rediseñar ingreso y validar la LAN/router. |
| MongoDB gestionado o replica set | Topología Mongo documentada según votos/dominios; servicio gestionado o tercer dominio para HA completa. |
| Redis gestionado/HA y política de datos | Redis se define como cache descartable inicialmente; HA/persistencia requiere decisión y quorum adecuados. |
| Monitoreo y backup/restore de MariaDB | Métricas/alertas, backups externos, restauraciones periódicas y plan de bootstrap. |
| Enrutamiento de MariaDB no fijado a galera1 | Proxy/endpoint DB-aware; retirar referencia directa en aplicación e inicializador. |
| Routing de lectura/escritura y límites del pool | Definir semántica del proxy y dimensionar sus conexiones con el pool y réplicas API. |
| TTL, invalidación y stampede de cache | Especificado en fase 3 y validado bajo carga. |
| Limpieza de cache limitada | Mantener borrado scoped al namespace/clave de catálogo. |
| OpenTelemetry, logs, métricas, traces, dashboards y alertas | Colector/backend central, instrumentación por capa y alertas accionables externas. |
| Sustituir trazas y UI propias | Migración de `web/catalog.js`, `application/index.js` y wiring del stack a contexto W3C y spans. |
| Usuario Mongo least-privilege, Redis protegido y secretos | Usuario de aplicación dedicado, ACL/red privada, secretos Swarm/locales ignorados y rotación. |
| TLS, autenticación y rate limiting | Terminar TLS en ingreso; aplicar auth/rate limit según exposición y modelo de acceso. |
| Migraciones y documentación operativa | Migraciones controladas e idempotentes; runbooks, DR y pruebas documentados. |

## Orden de implementación recomendado

1. Acordar el límite de dos nodos, RTO/RPO, política de datos, red y acceso de
   entrada. No iniciar una migración de datos antes de tener el plan de
   recuperación.
2. Preparar imágenes/configuración Swarm y migrar primero web/API sin estado,
   health checks, entrada redundante y pruebas de pérdida de tareas/worker.
3. Añadir monitorización externa y OpenTelemetry para que los siguientes
   cambios tengan evidencia y diagnóstico.
4. Resolver el endpoint de MariaDB y su quorum; migrar/validar primero datos y
   backup en un entorno de ensayo.
5. Resolver MongoDB y decidir formalmente la condición de disponibilidad de
   reseñas bajo pérdida de nodo. Mantener Redis descartable y añadir
   degradación, invalidación y protección contra stampede.
6. Aplicar seguridad, migraciones, TLS y runbooks; realizar ensayos DR,
   restauración y pruebas compuestas bajo carga.
7. Revisar cada renglón de ToDo.md contra la matriz de cobertura y cerrar el
   requisito solo después de adjuntar resultado de prueba, no por tener
   contenedores desplegados.

## Condiciones para declarar el objetivo cumplido

- La pila se ejecuta en dos equipos LAN y el despliegue local Compose sigue
  funcionando para desarrollo.
- La caída deliberada de un contenedor sin estado se detecta y se recupera
  automáticamente con tráfico servido por una instancia sana.
- La caída del worker se recupera dentro del RTO de servicios sin estado y se
  ha medido con el laboratorio.
- La entrada no depende de un único contenedor o de una publicación de puerto
  ligada a un solo host.
- Los clientes no apuntan directamente a `galera1`; cada base tiene una
  decisión probada de quorum, consistencia, degradación y restauración.
- Se realizan y verifican backups fuera de ambos hosts; existe evidencia de
  restauración con RPO/RTO medidos.
- La caída del manager se documenta y prueba como recuperación manual en el
  diseño de dos hosts, o se añade un tercer dominio de fallo/servicio externo
  antes de afirmar recuperación automática ante esa caída.
- Alertas, logs, métricas y trazas permiten reconstruir cada experimento y
  distinguir recuperación automática de intervención humana.
