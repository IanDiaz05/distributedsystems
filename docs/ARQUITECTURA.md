# Tienda de tres capas sobre Docker Compose

> Documento de la entrega para el Wiki del repositorio `IanDiaz05/distributedsystems`.
> Compañeros de esta entrega:
> [`INFORME-WIKI.md`](INFORME-WIKI.md) ·
> [`tests/matriz-pruebas.md`](tests/matriz-pruebas.md) ·
> [`pruebas/01-BASELINE-RENDIMIENTO.md`](pruebas/01-BASELINE-RENDIMIENTO.md) ·
> [`pruebas/02-FAILOVER-PRESENTACION-APLICACION.md`](pruebas/02-FAILOVER-PRESENTACION-APLICACION.md) ·
> [`pruebas/03-FAILOVER-DATOS.md`](pruebas/03-FAILOVER-DATOS.md) ·
> [`pruebas/04-CHAOS-ENGINEERING.md`](pruebas/04-CHAOS-ENGINEERING.md) ·
> [`pruebas/05-OBSERVABILIDAD.md`](pruebas/05-OBSERVABILIDAD.md)

---

## 1. Visión general

Es **una tienda online de tres capas** (presentación, aplicación, datos) desplegada
como un único proyecto de **Docker Compose en un solo host**. El proyecto
`distributed-three-tier` define **32 servicios**: **29 contenedores en ejecución**
más **3 trabajos de inicialización** que terminan con estado `Exited (0)`
(`catalog-init`, `mongodb-init`, `mongodb-keyfile`).

El objetivo académico es demostrar **redundancia a nivel de proceso y failover
detectable**, no alta disponibilidad del host: cada componente crítico aparece
duplicado o triplicado dentro del mismo motor Docker, con mecanismos de detección
y conmutación (VIP VRRP, health checks de HAProxy, quorum de Galera, mayoría de
MongoDB, quorum de Sentinel).

Además del stack principal existen dos piezas auxiliares:

| Pieza | Puerto | Función |
|---|---|---|
| `nagios` (servicio del stack) | `8088 → 80` | Comprobaciones de estado de todos los servicios |
| `resilience-lab/` (proyecto Compose separado) | `8090` | Panel de pruebas: ApacheBench, Siege, JMeter y Chaos Monkey. Se conecta a la red `distributed-three-tier_edge` |

---

## 2. Diagrama de Arquitectura

```mermaid
flowchart TB
    cliente["Navegador / cliente HTTP"]

    subgraph PRESENT["Capa de presentación · red edge 172.30.0.0/24"]
        entry["⚠ presentation-entry<br/>HAProxy · publica el puerto 80 del host<br/>punto de entrada único"]
        vipP(["VIP presentación 172.30.0.250<br/>Keepalived VRRP (master + backup)"])
        plbM["presentation-lb-master<br/>HAProxy · 172.30.0.11"]
        plbB["presentation-lb-backup<br/>HAProxy · 172.30.0.12"]
        web1["web1 · Nginx<br/>webnode1"]
        web2["web2 · Nginx<br/>webnode2"]
        web3["web3 · Nginx<br/>webnode3"]
    end

    subgraph APPNET["Capa de aplicación · red application 172.31.0.0/24 (interna)"]
        vipA(["VIP aplicación 172.31.0.250<br/>Keepalived VRRP (master + backup)"])
        albM["application-lb-master<br/>HAProxy · 172.31.0.11"]
        albB["application-lb-backup<br/>HAProxy · 172.31.0.12"]
        app1["API app1<br/>Node.js stateless"]
        app2["API app2<br/>Node.js stateless"]
        app3["API app3<br/>Node.js stateless"]
    end

    subgraph DATA["Capa de datos · red database (interna) · 3 × réplicas por almacén"]
        subgraph SQL["Catálogo · MariaDB Galera"]
            sqlproxy["⚠ galera-proxy<br/>HAProxy SQL · health check cada 3 s<br/>preferencia: galera1"]
            g1["galera1<br/>(bootstrap · preferente)"]
            g2["galera2"]
            g3["galera3"]
        end

        subgraph MONGO["Reseñas · MongoDB replica set store-rs"]
            mp["mongodb · PRIMARY<br/>lecturas fuertes"]
            ms2["mongodb2 · SECONDARY"]
            ms3["mongodb3 · SECONDARY"]
        end

        subgraph CACHE["Caché · Redis + Sentinel (descartable)"]
            redM["redis · MASTER<br/>catálogo, TTL 60 s"]
            redS2["redis2 · réplica"]
            redS3["redis3 · réplica"]
            sents["3 × Redis Sentinel<br/>quorum 2 · descubrimiento de master"]
        end
    end

    nagios["Nagios · :8088<br/>solo comprueba (no notifica)"]

    ley["<b>Leyenda</b><br/>───→ tráfico real<br/>- - → conmutación / respaldo<br/>◄──► replicación<br/>⚠ punto único de fallo (SPOF)<br/>round-robin: cada petición a un nodo distinto"]

    cliente -->|"HTTP :80"| entry
    entry -->|"reenvía a la VIP"| vipP
    vipP -->|"VRRP: master activo"| plbM
    vipP -.->|"VRRP: el backup toma la VIP si el master cae (≈2–4 s)"| plbB

    plbM -->|"round-robin + health check"| web1
    plbM -->|"round-robin"| web2
    plbM -->|"round-robin"| web3
    plbB -.->|"respaldo del balanceo"| web1
    plbB -.-> web2
    plbB -.-> web3

    web1 & web2 & web3 -->|"proxy de /api hacia la VIP de aplicación"| vipA
    vipA -->|"VRRP: master activo"| albM
    vipA -.->|"VRRP: failover al backup"| albB

    albM -->|"round-robin + health check /health"| app1
    albM -->|"round-robin"| app2
    albM -->|"round-robin"| app3
    albB -.->|"respaldo del balanceo"| app1
    albB -.-> app2
    albB -.-> app3

    app1 & app2 & app3 -->|"caché del catálogo"| redM
    app1 & app2 & app3 -->|"descubrimiento de master"| sents
    app1 & app2 & app3 -->|"SELECT / INSERT del catálogo"| sqlproxy
    app1 & app2 & app3 -->|"reseñas: lectura en primario, escritura majority"| mp

    sqlproxy -->|"3 nodos, umbral: Primary + Synced"| g1
    sqlproxy -.->|"failover a nodo sano"| g2
    sqlproxy -.->|"failover a nodo sano"| g3
    g1 <-->|"replicación Galera · quorum 2/3"| g2
    g2 <--> g3
    g3 <--> g1

    mp -->|"replicación · mayoría 2/3"| ms2
    mp -->|"replicación"| ms3

    redM -->|"replicación asíncrona"| redS2
    redM --> redS3
    sents -.->|"monitorizan y promueven al master"| redM

    nagios -.->|"comprobaciones"| PRESENT
    nagios -.->|"comprobaciones"| APPNET
    nagios -.->|"comprobaciones"| DATA

    ley -.-> PRESENT

    classDef spof fill:#fff1f0,stroke:#cf1322,stroke-width:2px;
    classDef note fill:#fffbe6,stroke:#d4b106,stroke-dasharray: 5 5;
    class entry,sqlproxy spof;
    class ley note;
```
---


## 3. Infraestructura como código (IaC)

Todo el sistema es reproducible a partir de archivos versionados; no hay
configuración manual dentro de los contenedores.

| Archivo / carpeta | Qué controla |
|---|---|
| `docker-compose.yml` | Los 32 servicios, 3 redes, 13 volúmenes, healthchecks y dependencias de arranque |
| `.env` (desde `.env.example`) | Credenciales y parámetros (fuera del control de versiones) |
| `haproxy/*.cfg` | 5 balanceadores: entry, presentación maestro/respaldo, aplicación maestro/respaldo |
| `database/galera-proxy/` | Imagen y script de comprobación SQL externa de Galera |
| `keepalived/` | Dockerfile + configuración VRRP de cada par (master/backup, presentación/aplicación) |
| `web/nginx.conf`, `web/site1-3/` | Configuración y contenidos de los 3 Nginx |
| `application/` | API Node.js, `init-db.js`, pruebas `node --test application/data-ha.test.js` |
| `database/catalog.sql` | Esquema y datos de muestra del catálogo |
| `mongodb/init-replica.js` | Inicialización idempotente del replica set |
| `redis/start-node.sh`, `redis/start-sentinel.sh` | Arranque con detección de rol master/réplica/sentinel |
| `nagios/architecture.cfg` | Comprobaciones de Nagios (sin notificaciones) |
| `resilience-lab/` | Proyecto Compose del laboratorio de pruebas |
| `DATA-HA.md`, `docs/START-DOWN.md` | Decisiones de disponibilidad de datos y arranque/parada ordenada |

---

## 4. Modelo de redundancia

| Componente | Mecanismo | Qué tolera | Qué **no** tolera |
|---|---|---|---|
| Balanceadores (×2 por capa) | VIP VRRP + health checks HAProxy | Caída del HAProxy maestro (VIP al backup en pocos segundos) | Caída de los dos LB a la vez; pérdida del host |
| Nginx (×3) | Round-robin con health check; `X-Request-Trace` lo demuestra | 1 o 2 nodos caídos (T10/T11) | Pérdida de los tres; saturación (ver curva de T03) |
| APIs (×3) | Estado stateless detrás del LB | 1 o 2 APIs caídas (T12) | — |
| Galera (×3) | Quorum 2/3 + `galera-proxy` con comprobación SQL cada 3 s | 1 nodo caído con quorum conservado (T14/T15) | 2 nodos caídos (pierde quorum); caída del propio `galera-proxy` (SPOF) |
| MongoDB (×3) | Mayoría 2/3, elección automática de primario | Caída del primario con elección (T16) | 2 miembros caídos: sin primario, escrituras fallan visiblemente (T17) |
| Redis (×3) + Sentinel (×3) | Quorum 2, promoción automática | Caída del master (T18) o de un Sentinel (T19) | Pérdida total de la caché es aceptable por diseño: es descartable |
| Nagios (×1) | Comprobaciones periódicas | — | Es único y **no notifica**; solo comprueba (T25) |


