# Contratos y decisiones — HA/DR en Docker Swarm

> Documento vivo. Cada sección tiene estado: `PENDIENTE`, `DECIDIDO` o `BLOQUEADO`.
> Un agente de código NO debe pasar a la fase A1 mientras alguna sección marcada como
> `BLOQUEANTE` siga en `PENDIENTE`.

## Metadata
- Repo: git@github:IanDiaz05/distributedsystems.git (fetch)
- Branch: main
- Commit base: aaf0087735a6c7147af47ccd062c343c1a0e477b
- Fecha: 2026-10-22T20:13:47-05:00
- Autor del documento: IanDiaz05

---

## 0. Resumen ejecutivo (1 párrafo)

El proyecto migra el catálogo de tres capas `distributed-three-tier`, hoy definido para Docker Compose de un solo host, a un Swarm de dos hosts LAN: un manager y un worker. El objetivo es obtener alta disponibilidad de servicios y recuperación parcial, reconociendo que dos hosts no proporcionan un tercer dominio de fallo ni alta disponibilidad del control-plane. El alcance es acordar topología, ingreso, datos, seguridad, observabilidad y operación para las fases A1–A7; los valores operativos aún pendientes deben confirmarse antes de avanzar.

---

## 1. Entorno físico (BLOQUEANTE para A1)

**Estado:** PENDIENTE

| Campo | Manager | Worker |
|---|---|---|
| Tipo (físico/VM/mixto) | <!-- FILL --> | <!-- FILL --> |
| SO y versión | <!-- FILL --> | <!-- FILL --> |
| Docker Engine | <!-- FILL --> | <!-- FILL --> |
| CPU (cores) | <!-- FILL --> | <!-- FILL --> |
| RAM (GiB) | <!-- FILL --> | <!-- FILL --> |
| Disco libre (GiB) | <!-- FILL --> | <!-- FILL --> |
| IP LAN estable | <!-- FILL --> | <!-- FILL --> |
| Hostname DNS | <!-- FILL --> | <!-- FILL --> |
| NTP/chrony activo | <!-- FILL --> | <!-- FILL --> |

### Decisiones derivadas
- **Registry**: <!-- FILL: gestor, URL, TLS, quién publica -->
- **DNS interno LAN**: <!-- FILL: sí/no, dominio -->
- **VRRP en router/LAN**: <!-- FILL: sí/no, fabricante/modelo -->
- **Tercer equipo para monitoreo/backup externo**: <!-- FILL: sí/no, descripción -->

---

## 2. SLO / RTO / RPO (BLOQUEANTE para A4, A7)

**Estado:** PENDIENTE

| Servicio | SLO disponibilidad | RTO | RPO | Fuente de verdad |
|---|---|---|---|---|
| Catálogo (productos) | <!-- FILL --> | <!-- FILL --> | <!-- FILL --> | MariaDB |
| Reseñas | <!-- FILL --> | <!-- FILL --> | <!-- FILL --> | MongoDB |
| Cache (Redis) | <!-- FILL --> | <!-- FILL --> | N/A | Descartable |
| Presentación / ingreso | <!-- FILL --> | <!-- FILL --> | N/A | Nginx/HAProxy |
| API | <!-- FILL --> | <!-- FILL --> | N/A | Node |

### Por tipo de fallo
| Fallo | RTO aceptable | ¿Automático o manual? |
|---|---|---|
| Contenedor individual | <!-- FILL --> | Swarm (auto) |
| Worker completo | N/A (fuera de alcance) | No probado |
| Manager (2 hosts) | N/A (fuera de alcance) | No probado; runbook documentado |
| Redis | <!-- FILL --> | Degradación auto |
| MongoDB | <!-- FILL --> | <!-- FILL --> |
| MariaDB con quorum | <!-- FILL --> | <!-- FILL --> |
| MariaDB sin quorum | <!-- FILL --> | Manual |
| Pérdida de LAN | <!-- FILL --> | Manual |
| Restore de backup | <!-- FILL --> | Manual |

---

## 3. Topología de Swarm (BLOQUEANTE para A1)

**Estado:** PENDIENTE

- **Nodos**: manager en `<host>`, worker en `<host>`.
- **Servicios de aplicación en manager**: <!-- FILL: no / sí, solo emergencia -->
- **Puertos de Swarm** (TCP 2377, TCP/UDP 7946, UDP 4789) abiertos entre hosts: <!-- FILL: sí/no, firewall -->
- **Sufijos de red overlay**: <!-- FILL: edge/app/data o reutilizar nombres -->
- **Ubicación de secretos Swarm**: <!-- FILL -->
- **Ubicación de configs Swarm**: <!-- FILL -->

---

## 4. Decisión de ingreso (BLOQUEANTE para A2)

**Estado:** PENDIENTE

Marcar UNA opción y documentar la justificación:

- [ ] **Opción A — Routing mesh + IPs de nodo**: publicar el puerto en el stack Swarm; los clientes LAN usan una de las dos IPs. Se documenta cómo descubrirlas. Se retira `presentation-entry` y el VIP de `presentation-*`.
- [ ] **Opción B — VIP externa (HAProxy/Keepalived fuera de overlay)**: instalar HAProxy+Keepalived en los hosts (no en contenedores) apuntando a las IPs de nodo publicadas por Swarm. Requiere VRRP soportado en la LAN.
- [ ] **Opción C — Balanceador de red/router**: el router LAN hace health checks a las IPs de nodo. Requiere que el router lo soporte.

**Justificación**: <!-- FILL -->
**Impacto en A2**: <!-- FILL -->

---

## 5. Decisión de datos (BLOQUEANTE para A3, A4)

**Estado:** PENDIENTE

### 5.1 MariaDB Galera
- **Nodos objetivo**: <!-- FILL: 3 -->
- **Colocación**: <!-- FILL: X en manager, Y en worker -->
- **Quorum con 2 hosts**: al caer el host con 2 nodos, quorum=1 de 3 → **no hay quorum**. <!-- FILL: ¿se acepta? ¿árbitro externo? -->
- **Proxy DB-aware**: <!-- FILL: HAProxy TCP + check_galera_status, ProxySQL, MaxScale, endpoint gestionado -->
- **Retiro de `DB_HOST=galera1`**: sí, en A3.
- **Bootstrap tras pérdida total**: <!-- FILL: procedimiento, quién decide -->
- **Backup/restore**: <!-- FILL: herramienta, frecuencia, off-host destino, verificación -->

### 5.2 MongoDB
- **Modo**: <!-- FILL: standalone + backup + degradación explícita / replica set -->
- **Justificación** (con 2 hosts no hay tercer dominio de fallo): <!-- FILL -->
- **Usuario app**: `store_app` (mínimo privilegio) separado de root. <!-- FILL: sí/no, en A6 -->
- **Backup/restore**: <!-- FILL -->

### 5.3 Redis
- [ ] Confirmado: **cache descartable**. <!-- FILL: sí/no -->
- **Degradación esperada**: la API responde desde MariaDB, cache se repuebla. La ausencia de Redis **no** debe producir 5xx. <!-- FILL: sí/no -->
- **Protección**: ACL/requirepass en red privada, endpoint `/cache/clear` limitado a `store:products:cheapest`. <!-- FILL: sí/no -->

---

## 6. Seguridad y secretos (BLOQUEANTE para A6)

**Estado:** PENDIENTE

- **Docker secrets Swarm** para: `MARIADB_ROOT_PASSWORD`, `MARIADB_BACKUP_PASSWORD`, `CATALOG_DB_PASSWORD`, `MONGO_ROOT_PASSWORD`, `MONGO_APP_PASSWORD`, `NAGIOSADMIN_PASSWORD`. <!-- FILL: sí/no -->
- **Usuario Mongo de app**: `store_app` con `readWrite` solo sobre `store_reviews`. <!-- FILL: sí/no -->
- **TLS en ingreso**: <!-- FILL: sí/no, quién emite, cómo se renueva -->
- **Auth de API**: <!-- FILL: modelo (API key, JWT, mTLS, ninguna) -->
- **Rate limiting**: <!-- FILL: en HAProxy / en Nginx / en API -->
- **`.env` y `.env.example`**: `gitignore` ya cubre `.env`; `.env.example` se mantiene sin valores reales. <!-- FILL: sí/no -->

---

## 7. Observabilidad (BLOQUEANTE para A5)

**Estado:** PENDIENTE

- **OTel Collector**: <!-- FILL: dónde corre, si es externo a los 2 hosts -->
- **Backend de trazas**: <!-- FILL: Jaeger/Tempo/otro -->
- **Métricas**: <!-- FILL: Prometheus + exporters (HAProxy, mysqld, node, cadvisor) -->
- **Logs**: <!-- FILL: Loki / otro, retención -->
- **Dashboards**: <!-- FILL: Grafana, quién los mantiene -->
- **Alertas**: <!-- FILL: Alertmanager / Nagios reformado, destinatario real -->
- **Migración de `X-Request-Trace`**: <!-- FILL: fase de corte, cómo se convive -->
- **Nagios**: <!-- FILL: se mantiene / se sustituye. Si se mantiene, añadir contact_groups y notification_interval -->

---

## 8. CI/CD y flujo de cambios (BLOQUEANTE para A1)

**Estado:** PENDIENTE

- **Rama principal**: <!-- FILL -->
- **Convención de commits**: <!-- FILL: Conventional Commits / otro -->
- **CI**: <!-- FILL: GitHub Actions / GitLab CI / ninguno -->
- **`docker stack deploy`**: <!-- FILL: desde CI o solo operador humano -->
- **Pre-commit / lint**: <!-- FILL: sí/no, herramientas -->

---

## 9. Alcance explícito de lo que NO se va a hacer

**Estado:** PENDIENTE

Marcar lo que **NO** entra en el alcance de este proyecto y por qué:

- [x] Recuperación ante pérdida de host físico (manager o worker). Solo se prueba a nivel de contenedor y servicio.
- [ ] HA de control-plane Swarm ante pérdida del manager (requiere tercer dominio).
- [ ] Replica set de MongoDB con elección tras pérdida de nodo (requiere tercer dominio).
- [ ] Galera con quorum tras pérdida del host con 2 nodos (requiere árbitro externo).
- [ ] `--force-new-cluster` automatizado (riesgo de split-brain).
- [ ] Keepalived/VRRP dentro de overlay Swarm.
- [ ] HA de Redis (persistencia o cluster).
- [ ] Persistencia de datos en volúmenes locales entre nodos.

**Justificación de cada exclusión**: <!-- FILL -->

---

## 10. Riesgos residuales aceptados

**Estado:** PENDIENTE

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Pérdida de un host físico (manager o worker) | Fuera de alcance: sin tercer dominio de fallo, Swarm pierde quorum o capacidad. | Aceptado. Runbook documentado, no ejecutado. |
| Reschedule de tarea con volumen local a otro nodo | Pérdida de datos locales (Mongo) o SST forzado (Galera). | Constraints en `stack.yml` para Mongo; SST aceptado para Galera. |

---

## 11. Trazabilidad de requisitos

Mapa entre los ítems del `ToDo.md` y las fases del plan A0–A7. Los puntos agrupados en una fila se indican juntos en la primera columna; las cuatro líneas de `Suggested implementation order` corresponden al orden de las fases indicadas y no son requisitos adicionales.

| Ítem del ToDo | Fase que lo cubre | Estado |
|---|---|---|
| Move beyond single-host Compose | A1, A2 | PENDIENTE |
| Route external traffic through LB | A2 | PENDIENTE |
| Service discovery, health routing, restarts, scaling | A1 | PENDIENTE |
| Keep Compose as local dev | A1 | PENDIENTE |
| Revisit Keepalived VIPs and presentation port | A2 | PENDIENTE |
| MongoDB managed/replica set | A4 | PENDIENTE |
| Redis managed/HA; Redis disposable cache decision | A0 §5.3, A4 | PENDIENTE |
| MariaDB monitoring and backup/restore | A4, A5 | PENDIENTE |
| Test restore regularly | A7 | PENDIENTE |
| Stop `DB_HOST=galera1` | A3 | PENDIENTE |
| DB-aware proxy | A3 | PENDIENTE |
| Read/write routing | A3 | PENDIENTE |
| Pool limits vs replicas | A3 | PENDIENTE |
| Cache keys/TTL/invalidation | A4 | PENDIENTE |
| Invalidate affected cache entries on catalog changes | A4 | PENDIENTE |
| Stampede protection | A4 | PENDIENTE |
| Cache-clear scoped | A4 | PENDIENTE |
| OpenTelemetry instrumentation | A5 | PENDIENTE |
| Central logs/metrics/traces | A5 | PENDIENTE |
| Dashboards and alerts | A5 | PENDIENTE |
| Replace custom trace headers/UI; review current trace UI and service wiring | A5 | PENDIENTE |
| Mongo least-privilege | A6 | PENDIENTE |
| Redis protected | A6 | PENDIENTE |
| Secrets outside env files | A6 | PENDIENTE |
| TLS at ingress | A6 | PENDIENTE |
| API auth + rate limiting | A6 | PENDIENTE |
| Database migrations | A6 | PENDIENTE |
| Operational runbooks | A6 | PENDIENTE |

---

## 12. Registro de decisiones (ADR-style)

Cada decisión numerada, con fecha, contexto, alternativas y consecuencia:

| ID | Fecha | Decisión | Alternativas | Consecuencia | Estado |
|---|---|---|---|---|---|
| ADR-001 | <!-- FILL --> | Usar Docker Swarm (no K8s) | K8s, Nomad, gestionado | Curva baja, pero control-plane requiere quorum | PENDIENTE |
| ADR-002 | <!-- FILL --> | 1 manager + 1 worker | 2 managers | Caída del manager = intervención manual | PENDIENTE |
| ADR-003 | <!-- FILL --> | <!-- FILL: decisión de ingreso §4 --> | Opciones A/B/C | <!-- FILL --> | PENDIENTE |
| ADR-004 | <!-- FILL --> | <!-- FILL: decisión Mongo §5.2 --> | <!-- FILL --> | <!-- FILL --> | PENDIENTE |
| ADR-005 | <!-- FILL --> | <!-- FILL: decisión Galera §5.1 --> | <!-- FILL --> | <!-- FILL --> | PENDIENTE |
| ADR-006 | <!-- FILL --> | Redis descartable | Persistente / HA | <!-- FILL --> | PENDIENTE |
| ADR-007 | <fecha> | Alcance de resiliencia = servicio/contenedor, no host | Incluir host-loss testing | Simplifica A1/A7; host-loss queda como runbook documentado | DECIDIDO |