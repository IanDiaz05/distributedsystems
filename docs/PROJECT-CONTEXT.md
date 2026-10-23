# PROJECT CONTEXT — Catálogo tres capas: HA/DR en Docker Swarm

> **Propósito de este documento**: permitir que cualquier agente de IA o
> persona retome el proyecto sin haber participado en la conversación previa.
> Es autocontenido. Si eres un agente: **lee todo antes de proponer nada**,
> respeta las secciones "Reglas no negociables" y "Decisiones ya tomadas",
> y no reabras discusiones cerradas salvo que el usuario lo pida.

## Metadata del documento

- Repo: `git@github:IanDiaz05/distributedsystems.git` (rama `main`)
- Commit base: `aaf0087735a6c7147af47ccd062c343c1a0e477b`
- Autor original: IanDiaz05
- Última actualización: 2026-10-22
- Fase actual: **A1 lista para lanzar** (ver §11)
- Estado: contrato de decisiones (`docs/contracts.md`) generado, pendiente de rellenar §2, §5, §6, §7 (no bloquean A1)

---

## 1. Resumen del proyecto

Proyecto académico de práctica (no producción). Se parte de un catálogo
de tienda online de tres capas corriendo en Docker Compose de un solo host.
Se quiere migrar a un **Docker Swarm de dos hosts LAN** (un manager + un
worker) para obtener **alta disponibilidad de servicios** y **recuperación
automática de contenedores sin estado**, con decisiones explícitas de quorum
para las bases de datos, observabilidad con OpenTelemetry, seguridad y
runbooks, y una matriz de pruebas de resiliencia verificable.

**Lo que NO se pretende** (ver §6): alta disponibilidad del control-plane
Swarm, recuperación ante pérdida de un host físico, replica set de Mongo con
elección tras pérdida de nodo, ni HA de Redis. La práctica se centra en
**resiliencia a nivel de contenedor y servicio**.

## 2. Stack actual (Compose de un solo host)

Imagen y rol de cada servicio en `docker-compose.yml`:

| Capa | Servicio(s) | Imagen | Notas |
|---|---|---|---|
| Presentación | `web1`, `web2`, `web3` | `nginx:alpine` | 3 réplicas con `site1/2/3/index.html` (idénticos), `catalog.js`, `catalog.css` |
| LB presentación | `presentation-lb-master`, `presentation-lb-backup` | `haproxy:3.2-alpine` | Round-robin a web1-3, headers `X-Presentation-LB` |
| Entrada | `presentation-entry` | `haproxy:3.2-alpine` | **Publica `80:80`** — SPOF real |
| VIP presentación | `presentation-keepalived-master`, `presentation-keepalived-backup` | custom Alpine | VRRP `172.30.0.250` |
| Aplicación | `app1`, `app2`, `app3` | Node 22 (build) | `index.js` sirve `/products/cheapest`, `/products/{sku}/reviews` (GET/POST), `/health`, `/cache/clear` |
| LB aplicación | `application-lb-master`, `application-lb-backup` | `haproxy:3.2-alpine` | `option httpchk GET /health`, headers `X-Application-LB` |
| VIP aplicación | `application-keepalived-master`, `application-keepalived-backup` | custom Alpine | VRRP `172.31.0.250` |
| Catálogo DB | `galera1`, `galera2`, `galera3` | `bitnamilegacy/mariadb-galera:11.4.7-debian-12-r3` | Galera 3 nodos, `galera1` es bootstrap y **destino único de la app** |
| Reseñas | `mongodb` | `mongo:8` | Standalone, usuario `root` para la app |
| Cache | `redis` | `redis:7-alpine` | Standalone, sin auth, TTL 60s |
| Init | `catalog-init` | build `./application` | Ejecuta `init-db.js` una vez |
| Monitoreo | `nagios` | `jasonrivers/nagios:latest` | **Sin `contact_groups` ni `notification_interval`** — solo define checks |
| Lab resiliencia | `ab`, `siege`, `jmeter`, `chaosmonkey`, `dashboard` | variados | `resilience-lab/`, usa `docker.sock`, Compose propio |

### Diagrama de flujo de una petición (hoy)

```
Browser → presentation-entry:80 (SPOF)
       → presentation VIP 172.30.0.250
       → presentation-lb-master/backup
       → web1/2/3 (Nginx)
       → application VIP 172.31.0.250
       → application-lb-master/backup
       → app1/2/3 (Node)
       ├─ /products/cheapest → Redis (hit) o galera1 (miss) → Redis (set 60s)
       └─ /products/{sku}/reviews → Mongo
```

## 3. Objetivo técnico (documentos fuente)

Los documentos `ESTRATEGIA-HA-DR.md` y `ToDo.md` del repo definen el plan
completo. Los resumo aquí para agentes que no los lean:

- Migrar a Swarm multi-nodo (manager + worker).
- Retirar puntos únicos de entrada (`presentation-entry`, VIPs).
- Sustituir `DB_HOST=galera1` por proxy DB-aware.
- Definir si Redis es cache descartable (sí, decisión tomada) o persistente.
- Mongo: standalone + backup o replica set (sin tercer dominio → standalone).
- Observabilidad con OTel, sin `X-Request-Trace`.
- Seguridad: usuario Mongo de mínimo privilegio, secretos, TLS, auth, rate limiting.
- Migraciones versionadas.
- Runbooks operativos.
- Matriz de pruebas de resiliencia verificable.

## 4. Entorno físico (DECIDIDO)

| Campo | Manager (`fedora`) | Worker (`debian`) |
|---|---|---|
| Tipo | Laptop física | Laptop física |
| SO | Fedora 44 (KDE) | Debian 13 trixie |
| Kernel | 7.2.11 | 6.12.113 |
| CPU | i5-8365U, 8 hilos | i5-1135G7, 8 hilos |
| RAM | 15 GiB (~8.3 GiB disponibles) | 15 GiB (~10 GiB disponibles) |
| Disco | 151 GiB libres | 382 GiB libres |
| Docker | 29.9.2, overlayfs, cgroup v2 | 29.9.2, overlayfs, cgroup v2 |
| NTP | Sincronizado (systemd-timesyncd) | Sincronizado (systemd-timesyncd) |
| Firewall | firewalld activo | Ninguno |
| Interfaz LAN | `enp0s31f6` 192.168.101.117/24 | `wlp1s0` (WiFi) 192.168.0.136/24 |
| Hostname | `fedora` | `debian` |

**Contexto de red**:
- En casa: subredes distintas, **WireGuard aún no configurado**. Cuando se
  active, proporcionará conectividad entre ambas. MTU efectivo ~1420.
- En el aula (presentación): ambas laptops en la **misma WiFi**, sin WG.
  Hay cierta pérdida de paquetes, aceptable para práctica.

**Decisión MTU**: `1350` en `/etc/docker/daemon.json` de ambos hosts
**antes** de `swarm init`. Cubre WG y WiFi sin reconfigurar.

## 5. Ciclo de vida del sistema

- Las laptops se usan para desarrollo durante días (encendido/apagado
  frecuente).
- Se apagan al trasladarse al aula.
- En el aula arrancan y se levanta el sistema para presentación.
- **Todos los scripts de operación deben ser idempotentes.**
- No hay servicio ni puerto ocupado fuera del proyecto.

## 6. Alcance explícito (DECIDIDO)

### Dentro del alcance

- Resiliencia a nivel de **contenedor y servicio** (kill, stop, pause, scale, update).
- Replicación de web y API (2 réplicas, spread).
- Galera 3 nodos en 2 hosts (`max_replicas_per_node: 2`).
- Mongo standalone con constraint a `debian` (preserva volumen local).
- Redis standalone como **cache descartable**.
- Ingress por **routing mesh + IPs de nodo** (Opción A).
- Registry local `registry:2` en el manager (`<manager-ip>:5000`, HTTP).
- Secretos Swarm desde archivos locales (`docker/secrets/*.txt`).
- Health check `liveness` (`/ping`) separado de `readiness` (`/health`).
- Degradación: Redis caído no tumba la API; Mongo caído degrada reseñas.
- Backup/restore verificado en entorno aislado.
- Runbooks documentados (aunque no todos se ejecuten).

### Fuera del alcance (no se prueba, solo se documenta)

- Recuperación ante pérdida del **host manager** o **worker** físico.
- `--force-new-cluster` automatizado.
- Replica set de MongoDB con quórum real.
- HA de Redis o persistencia.
- Keepalived/VRRP dentro de overlay Swarm.
- Migración de datos entre nodos.
- TLS en registry.
- Auth de API en producción (sí se planifica en A6, no en A1).

**Regla explícita**: no se "tumban" máquinas completas. Solo contenedores
o servicios de Docker. El runbook de recuperación ante pérdida de host se
documenta pero **no forma parte de la matriz de aceptación**.

## 7. Decisiones ya tomadas (ADRs)

| ID | Decisión | Alternativas descartadas | Consecuencia |
|---|---|---|---|
| ADR-001 | **Docker Swarm** (no K8s, no Nomad) | K8s, Nomad, gestionado | Curva baja; control-plane requiere quorum |
| ADR-002 | **1 manager (`fedora`) + 1 worker (`debian`)** | 2 managers | Caída del manager = intervención manual |
| ADR-003 | **Ingress Opción A**: routing mesh + IPs de nodo | VIP externa (B), router con health checks (C) | Requiere retirar `presentation-entry`, VIPs y Keepalived |
| ADR-004 | **MongoDB standalone** + backup + degradación de reseñas | Replica set con árbitro | Reseñas no disponibles al perder Mongo |
| ADR-005 | **Galera con 3 nodos**, `max_replicas_per_node: 2` | Split en servicios separados, árbitro externo | Pierde quorum si caen 2 nodos; aceptado |
| ADR-006 | **Redis = cache descartable** | Persistencia, HA | Degradación a MariaDB si cae |
| ADR-007 | **Alcance = servicio/contenedor**, no host físico | Incluir host-loss | A1/A7 más simples; runbook documentado |
| ADR-008 | **Registry local `registry:2`** en manager, HTTP sin TLS | GHCR, Docker Hub privado | Solo LAN, aceptado para lab |
| ADR-009 | **Docker Swarm secrets** desde archivos locales | Vault, SOPS, `.env` | Archivos en `docker/secrets/` fuera de git |

## 8. Hallazgos técnicos del estado actual

Estos hallazgos del análisis del código **deben ser considerados por
cualquier agente que toque el repo**, para no reintroducir problemas:

### Hallazgos del `docker-compose.yml` y configuración

- **H1** `presentation-entry` publica `80:80` en un único contenedor → SPOF
  de entrada. El VIP no mueve la publicación de Compose.
- **H2** `DB_HOST: galera1` en `app1/2/3` y `catalog-init` → falla si cae
  ese nodo.
- **H3** `depends_on` con `condition: service_healthy` no funciona en Swarm.
- **H4** `network_mode: "service:..."` en Keepalived no soportado en Swarm.
- **H5** `build:` en app y keepalived → `docker stack deploy` no construye.
- **H6** `ipv4_address` fija por `ipam` en redes `edge`/`application` → no
  aplica a overlay Swarm.
- **H7** Bind mounts del repo (`./web/...`, `./haproxy/...`) no viajan con
  la tarea a otro nodo.
- **H8** Mongo y Redis standalone; Mongo usa `root` para la app.
- **H9** `/health` hace `Promise.all([pool.query, mongo.ping, redis.ping])`.
  Si Redis o Mongo fallan, HAProxy retira **todas** las réplicas de app.
  **No hay degradación elegante real**.
- **H10** `catalog-init` depende de `service_healthy` de 3 servicios.
- **H11** Nagios en la misma pila → cae con el host observado.
- **H12** Lab resiliencia usa `docker.sock` y Compose local → no prueba Swarm.
- **H13** `X-Request-Trace` propio (header + UI en `catalog.js`).
- **H14** Pool MySQL fijo `connectionLimit: 10` por réplica.
- **H15** Cache key única `store:products:cheapest`, TTL 60s, sin stampede protection.
- **H16** `.env` con credenciales (root MARIADB, root MONGO, NAGIOSADMIN).

### Hallazgos adicionales (del snapshot de configuración)

- **N1** `nagios/architecture.cfg` sin `contact_groups` ni `notification_interval` → **no notifica a nadie**.
- **N2** `resilience-lab/dashboard/app.py` solo parsea salidas de herramientas; no scrapea Docker/HAProxy/Nagios.
- **N3** `web/nginx.conf` hardcodea `proxy_pass http://172.31.0.250:8080/` → rompe en Swarm y es SPOF silencioso.
- **N4** Ningún HAProxy tiene `stats socket`/`stats uri` → no se puede alimentar Prometheus/HAProxy-exporter.
- **N5** `PROBE_URL` del chaosmonkey y `DEFAULT_TARGET` del dashboard apuntan a `presentation-entry` → **métricas sesgadas por el SPOF**.
- **N6** `chaosmonkey.py` protege `presentation-entry`, pero `TEST-PLAN.md` lo lista como escenario.
- **N7** `keepalived/check-haproxy.sh` usa `nc -z -w 1` (TCP-only) → "HAProxy hangs but container stays up" no dispara `weight -20`.
- **N8** `keepalived/*.conf` usan `interface eth0` + IPs de red Compose (172.30.0.11/12, 172.31.0.11/12) → no sobreviven a Swarm.
- **N9** `catalog-init` lee `./database/catalog.sql` desde bind mount → hay que hornearlo en la imagen.
- **N10** `catalog.sql` sin índice en `price`; la query `ORDER BY price ASC, id ASC LIMIT 10` hace full scan.
- **N11** `.env.example` tiene 5 passwords, pero la app usa `MONGO_ROOT` para autenticarse → en A6 crear `store_app`.
- **N12** `chaosmonkey.py` reinicia keepalived después de reiniciar LB → lógica solo de Compose, se elimina en A7.
- **N13** `web/nginx.conf` inyecta `X-Web-Node $hostname`; en Swarm `$hostname` es el de la tarea.
- **N14** `dashboard/app.py` hace `docker exec` a `lab-ab`, `lab-siege`, etc., con `container_name` fijos → no funciona en Swarm.

## 9. Roadmap de fases (agentes)

Trabajo dividido en 8 unidades. Cada una tiene un **prompt de agente**
asociado. Se ejecutan en orden.

| # | Fase | Estado | Entregable principal |
|---|---|---|---|
| A0 | Contratos y preparación | **COMPLETADO** (documento generado, §2/§5/§6/§7 pendientes de rellenar) | `docs/contracts.md` |
| A1 | Empaquetado de imágenes + stack Swarm base + registry | **LISTO PARA LANZAR** (prompt en §11) | `docker/`, `web/Dockerfile`, `application/Dockerfile`, `stack.yml.tmpl`, `docs/runbooks/00-*` y `01-*` |
| A2 | Validación de ingreso + retiro de artefactos legacy | Pendiente | Retiro de `presentation-entry`, VIPs, Keepalived; Nginx usa Swarm DNS |
| A3 | Proxy MariaDB + retiro de `galera1` | Pendiente | Proxy DB-aware, `DB_HOST` corregido, pool dimensionado |
| A4 | Datos: Mongo replica set / Redis descartable + backups | Pendiente | Topología Mongo, Redis cache descartable con degradación, backups verificados |
| A5 | Observabilidad OTel + sustitución de trazas propias | Pendiente | Colector OTel, instrumentación, retiro de `X-Request-Trace` |
| A6 | Seguridad y operación | Pendiente | Usuario Mongo least-privilege, ACL Redis, secretos, TLS, auth, migraciones, runbooks |
| A7 | Laboratorio de fallos Swarm + aceptación | Pendiente | Experimentos adaptados a Swarm, matriz ejecutada con evidencia |

## 10. Estructura del repositorio (actual)

```
.
├── application/           # Node.js API
│   ├── Dockerfile
│   ├── index.js
│   ├── init-db.js
│   └── package.json
├── database/
│   └── catalog.sql        # schema + 12 productos
├── docker-compose.yml     # dev local, se conserva
├── docs/
│   ├── contracts.md       # generado en A0, parcialmente relleno
│   └── PROJECT-CONTEXT.md # ESTE documento
├── haproxy/               # 7 archivos .cfg, se retiran en A2
├── keepalived/            # 4 .conf, Dockerfile, script; se retiran en A2
├── nagios/
│   └── architecture.cfg   # sin contact_groups ni notification_interval
├── resilience-lab/        # lab con docker.sock; se adapta en A7
├── web/
│   ├── catalog.css, catalog.js, nginx.conf
│   └── site1/, site2/, site3/   # idénticos
├── ESTRATEGIA-HA-DR.md    # documento fuente (no modificar)
├── ToDo.md                # documento fuente (no modificar)
├── tree.md
├── README.md
└── .env.example           # credenciales de laboratorio
```

## 11. Fase A1 — Estado y delta

### Prompt A1 (completo) — listo para pegar en el agente

El prompt original está en la conversación previa y consta de:

- **Fase 1 — Documentación**:
  - Rellenar `docs/contracts.md` §1, §3, §4, §8, §10, §12 con las decisiones.
  - Crear `docs/runbooks/00-preflight-laptops.md` (suspend, NTP, firewall, `/etc/hosts`, WG).
  - Crear `docs/runbooks/01-swarm-operations.md` (init, join, deploy, stop, start, destroy, verificar).
- **Fase 2 — Registry local**:
  - `docker/registry-compose.yml` (`registry:2`, HTTP, volumen `./registry-data`, `REGISTRY_STORAGE_DELETE_ENABLED=true`).
  - `docker/swarm-init.sh` (idempotente: `daemon.json` con `{"mtu": 1350}`, `swarm init`, `join-token`, `registry up`, verificación).
  - `docker/swarm-join.sh` (idempotente: `daemon.json` MTU, `swarm join`).
  - `docker/swarm-deploy.sh` (detecta IP, genera `stack.yml` desde `.tmpl`, verifica registry, `stack deploy`).
- **Fase 3 — Imágenes**:
  - `web/Dockerfile`: base `nginx:alpine`, hornea `nginx.conf`, `catalog.js`, `catalog.css`, `site1/index.html`.
  - `web/nginx.conf`: cambiar `proxy_pass` a `http://api:8080/` con `resolver 127.0.0.11 valid=10s ipv6=off;` y variable dinámica (obligatorio en Swarm).
  - `application/Dockerfile`: añadir `COPY database/catalog.sql ./database/catalog.sql`.
  - `application/index.js`: añadir endpoint `/ping` **antes** de `/health` (liveness para Swarm).
  - `application/index.js` y `init-db.js`: helper `required(name)` que soporte `<NAME>_FILE`.
- **Fase 4 — Stack**:
  - `stack.yml.tmpl` con `__MANAGER_IP__`, todos los servicios, secretos externos, `mode: replicated-job` para `catalog-init`.
- **Fase 5 — Build/push**:
  - `docker/build-and-push.sh` (build + push a `$IP:5000/store-web:latest` y `:store-api:latest`).

### Delta crítico sobre el prompt original

Aplicar estas modificaciones al prompt A1 antes de lanzarlo (surgidas del
requisito de **no tumbar hosts**):

#### D1 — Galera como servicio único

**No** dividir en `galera-manager` + `galera-worker`. Usar un solo servicio:

```yaml
  galera:
    image: bitnamilegacy/mariadb-galera:11.4.7-debian-12-r3
    networks: [database]
    environment:
      MARIADB_ROOT_PASSWORD_FILE: /run/secrets/mariadb_root_password
      MARIADB_GALERA_MARIABACKUP_PASSWORD_FILE: /run/secrets/mariadb_backup_password
      MARIADB_DATABASE: ${CATALOG_DB_NAME:-store}
      MARIADB_USER: ${CATALOG_DB_USER:-store_app}
      MARIADB_PASSWORD_FILE: /run/secrets/catalog_db_password
      MARIADB_GALERA_CLUSTER_NAME: store-cluster
      MARIADB_GALERA_CLUSTER_ADDRESS: gcomm://tasks.galera
      MARIADB_GALERA_FORCE_SAFETOBOOTSTRAP: "yes"
    secrets: [mariadb_root_password, mariadb_backup_password, catalog_db_password]
    volumes: [galera-data:/bitnami/mariadb]
    healthcheck:
      test: ["CMD-SHELL", "mariadb-admin ping -h 127.0.0.1 -u root -p$$(cat /run/secrets/mariadb_root_password)"]
      interval: 10s
      timeout: 5s
      retries: 12
      start_period: 120s
    deploy:
      replicas: 3
      placement:
        max_replicas_per_node: 2
      update_config:
        order: start-first
        parallelism: 1
        delay: 15s
        failure_action: rollback
      restart_policy:
        condition: on-failure
        delay: 10s
        max_attempts: 5
      resources:
        limits: { memory: 1G }
        reservations: { memory: 256M }
```

#### D2 — MongoDB con constraint a `debian`

Preserva el volumen local en caso de reschedule:

```yaml
  mongodb:
    # ... igual ...
    deploy:
      replicas: 1
      placement:
        constraints: [node.hostname == debian]
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
      resources:
        limits: { memory: 1G }
```

#### D3 — Redis sin constraint

```yaml
  redis:
    # ... igual ...
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 5
      resources:
        limits: { memory: 256M }
```

#### D4 — `contracts.md` actualizado con el nuevo alcance

En **§9 Alcance**, añadir la exclusión:

```
- [x] Recuperación ante pérdida de host físico (manager o worker).
      Solo se prueba a nivel de contenedor y servicio.
```

En **§10 Riesgos residuales**, añadir:

```
| Pérdida de un host físico | Fuera de alcance. Swarm pierde quorum o capacidad. | Aceptado. Runbook documentado, no ejecutado. |
| Reschedule con volumen local a otro nodo | Pérdida de datos locales (Mongo) o SST forzado (Galera). | Constraint Mongo a `debian`; SST aceptado en Galera. |
```

En **§2 Por tipo de fallo**, marcar `Worker completo` y `Manager (2 hosts)` como `N/A (fuera de alcance) / No probado`.

Añadir **ADR-007** (alcance = servicio/contenedor, no host) como `DECIDIDO`.

#### D5 — Runbook 01 con nota de alcance

Añadir al inicio de `docs/runbooks/01-swarm-operations.md`:

```
> **Alcance**: la pérdida de host NO se prueba. Solo se prueba resiliencia
> a nivel de contenedor y servicio. Las secciones de "recuperación manual
> del manager" son solo documentación, no forman parte de la matriz de
> aceptación.
```

### Criterios de aceptación de A1 (consolidados)

- [ ] `docs/contracts.md` §1, §3, §4, §8, §10, §12 con estado `DECIDIDO`; §2, §5, §6, §7 quedan `PENDIENTE`.
- [ ] Existen `docs/runbooks/00-preflight-laptops.md` y `docs/runbooks/01-swarm-operations.md`.
- [ ] Existe `docker/registry-compose.yml` y los scripts `docker/swarm-init.sh`, `docker/swarm-join.sh`, `docker/swarm-deploy.sh`, `docker/swarm-secrets.sh`, `docker/build-and-push.sh` (con `chmod +x`).
- [ ] Existe `web/Dockerfile`; `web/nginx.conf` usa `api:8080` con `resolver` dinámico.
- [ ] `application/Dockerfile` hornea `database/catalog.sql`; `index.js` y `init-db.js` soportan `*_FILE`.
- [ ] Existe `stack.yml.tmpl` con `__MANAGER_IP__`, `galera` con `replicas: 3` + `max_replicas_per_node: 2`, `mongodb` con constraint a `debian`, `redis` sin constraint, `catalog-init` con `mode: replicated-job`.
- [ ] `.gitignore` incluye `docker/secrets/*.txt`, `docker/registry-data/`, `stack.yml`.
- [ ] Existe `docker/secrets/README.md`.
- [ ] `shellcheck` pasa en todos los `.sh` (o excepciones justificadas).
- [ ] `docker compose -f docker/registry-compose.yml config` valida.
- [ ] El agente imprime un checklist de despliegue con comandos exactos en orden.

### Checklist de despliegue (después de A1)

1. **En manager (`fedora`)**:
   ```bash
   ./docker/swarm-init.sh
   ```
   → Anota el `join-token` que imprime.

2. **En worker (`debian`)**:
   ```bash
   ./docker/swarm-join.sh <token> <manager-ip>
   ```

3. **En manager**: crear archivos en `docker/secrets/` con los valores reales:
   ```bash
   # Al menos:
   # mariadb_root_password.txt
   # mariadb_backup_password.txt
   # catalog_db_password.txt
   # mongo_root_password.txt
   ./docker/swarm-secrets.sh
   ```

4. **En manager**: build y push:
   ```bash
   ./docker/build-and-push.sh
   ```

5. **En manager**: deploy:
   ```bash
   ./docker/swarm-deploy.sh
   ```

6. **Verificación**:
   ```bash
   docker node ls                     # 1 manager, 1 worker
   docker service ls                  # web(2), api(2), galera(3), mongo(1), redis(1)
   docker stack ps store              # catalog-init completado
   curl http://<ip-manager>/          # storefront responde
   curl http://<ip-worker>/           # storefront responde (routing mesh)
   ```

## 12. Estrategia técnica para A1 (rationale)

### Por qué MTU 1350

- WG en casa: path MTU ~1420. Overlay VXLAN necesita ~50 bytes de overhead
  → 1370 máximo. 1350 deja margen.
- WiFi en aula: MTU estándar 1500, pero pérdida de paquetes ocasional.
  1350 también funciona.
- **Debe configurarse en `/etc/docker/daemon.json` antes de `swarm init`**:
  el ingress network hereda el MTU y no se puede cambiar sin recrear el swarm.

### Por qué `mode: replicated-job` para `catalog-init`

- En Compose era `restart: "no"` + `depends_on: service_healthy`. En Swarm
  no existe `depends_on` ni reinicio-único.
- `mode: replicated-job` ejecuta una vez y termina; Swarm no lo reinicia si
  termina bien. Si falla, `restart_policy` lo reintenta hasta `max_attempts`.
- Debe correr **después** de que `galera` y `mongodb` estén sanos. No hay
  dependencia automática en Swarm, así que el script `swarm-deploy.sh` hace
  un `loop` de espera.

### Por qué `resolver 127.0.0.11` en Nginx

- Swarm reasigna IPs de tarea al reprogramar. Un `proxy_pass` con nombre
  DNS estático cachea la IP.
- `resolver 127.0.0.11` es el DNS interno de Docker; `valid=10s` refresca.
- `proxy_pass $variable;` obliga a Nginx a resolver por request.

### Por qué `api:8080` en Nginx

- Routing mesh interno de Swarm: cualquier servicio en la misma overlay
  resuelve `api` a la VIP del servicio `api` (que balancea entre réplicas).
- Funciona con `application` overlay `internal: true`.

### Por qué secretos como archivos

- `docker secret create <name> <file>` es estándar Swarm.
- Los servicios montan `/run/secrets/<name>`.
- `required(name)` en Node debe leer primero `<NAME>_FILE`.
- `.env` en el repo queda **solo para dev local de Compose**.

### Por qué `catalog-init` con `placement: node.role == manager`

- El manager tiene la imagen ya buildeada (registry local). El worker la
  descarga del registry al ejecutar el job, así que técnicamente podría
  correr en cualquiera, pero fijarlo al manager acelera y evita descargas
  innecesarias.

## 13. Reglas no negociables para cualquier agente

1. **No modificar** `ESTRATEGIA-HA-DR.md`, `ToDo.md`, `tree.md`,
   `docker-compose.yml` (dev local), `nagios/`, `keepalived/`, `haproxy/`,
   `resilience-lab/` en A1. Se retiran/adaptan en fases posteriores.
2. **No añadir** TLS, auth de API, OTel, Prometheus, sustitución de
   `X-Request-Trace` en A1. Eso es A5/A6.
3. **No cambiar** la lógica de negocio de `index.js` (`/products/cheapest`,
   `/reviews`, `/cache/clear`). Solo añadir `/ping` y el helper `*_FILE`.
4. **No cambiar** `/health` en `index.js` (eso es A5). Solo añadir `/ping`.
5. **No inventar** IPs, hostnames, passwords ni versiones. Leer del entorno
   o de `contracts.md`.
6. **No escribir secretos reales en el repo.** Solo archivos `.txt` en
   `docker/secrets/` (ignorados por git).
7. **No ejecutar** `docker swarm init`, `docker stack deploy`, ni builds
   durante A1. A1 **solo genera archivos y scripts**.
8. **No prometer** HA de control-plane ni recuperación ante pérdida de host.
   Está fuera de alcance (ADR-007).
9. **No tocar** el puerto 80 si hay algo escuchando. El usuario confirmó
   que no hay conflicto, pero verificar antes de publicar.
10. **Idempotencia**: todos los scripts deben poder ejecutarse dos veces sin
    romper nada (especialmente `swarm-init.sh` y `swarm-join.sh`).

## 14. Cómo retomar la conversación con otro agente

Si abres este proyecto en un nuevo chat de IA, pega esto:

```
Contexto: proyecto de catálogo tres capas migrando de Compose (1 host) a
Docker Swarm (2 hosts LAN). Estoy en la fase A1 (empaquetado de imágenes +
stack Swarm base + registry local). He adjuntado el documento de contexto
completo del proyecto.

Necesito: [describe lo que necesitas].

Restricciones: respeta las "Reglas no negociables" (§13) y las "Decisiones
ya tomadas" (§7) del documento de contexto. Si algo no está en el documento
y es crítico, pregúntame antes de asumir.
```

## 15. Próximos pasos inmediatos

1. **Lanzar A1** con el prompt completo + delta D1–D5 (ver §11).
2. **Revisar el diff** que devuelva el agente:
   - Prioridad de revisión: `docker/swarm-init.sh` (no debe pisar
     `daemon.json` sin avisar), `stack.yml.tmpl` (constraints y health
     checks), `web/nginx.conf` (resolver dinámico).
3. **Ejecutar el checklist de despliegue** (§11) en el orden indicado.
4. **Reportar errores** (probables): galera no forma cluster por
   `FORCE_SAFETOBOOTSTRAP`, MTU insuficiente entre contenedores, secretos
   no montados.
5. **Al estabilizar**, lanzar **A2** (validación de ingress + retiro de
   `presentation-entry`, VIPs y Keepalived).

## 16. Anexo: archivos fuente de referencia

Documentos del repo que contienen el plan completo (leer si hace falta):

- `ESTRATEGIA-HA-DR.md` — estrategia de 5 fases, matriz de pruebas, cobertura
  del ToDo, condiciones para declarar objetivo cumplido.
- `ToDo.md` — lista de requisitos atómicos.
- `README.md` — descripción del estado actual de la app.
- `resilience-lab/TEST-PLAN.md` — plan de pruebas original (contiene umbrales
  de ejemplo: p95 < 200 ms, availability >= 99.9%; **no son contractuales**,
  esperan decisión del usuario).
- `docs/contracts.md` — documento vivo de decisiones (generado en A0).
- `docs/agent-input/config-snapshot.md` — snapshot completo de configuración
  (obtenido del agente en A0).

## 17. Glosario

- **Manager / Worker**: nodos de Swarm.
- **Routing mesh**: publicación de puerto en todas las IPs de nodo de Swarm.
- **Overlay network**: red virtual sobre la red física, VXLAN.
- **Replicated-job**: modo de deploy que ejecuta N veces y termina; usado
  para migraciones e init.
- **`max_replicas_per_node`**: limita cuántas réplicas del mismo servicio
  van a un nodo.
- **`resolver 127.0.0.11`**: DNS interno de Docker; refresca la IP de
  servicios reprogramados.
- **`configs`** (Swarm): archivos de solo lectura versionados, distribuidos
  a las tareas.
- **`secrets`** (Swarm): como configs, pero cifrados en reposo y montados
  en `/run/secrets/`.
- **MTU**: tamaño máximo de paquete. Crítico para VXLAN sobre WG/WiFi.
- **`FORCE_SAFETOBOOTSTRAP`**: variable de Bitnami MariaDB Galera que
  permite que el primer nodo en arrancar haga bootstrap sin configuración
  manual.