# Snapshot de configuración — extracción para agente HA/DR

## Metadata
- Repo: /home/iandi/Escritorio/distributedsystems
- Branch: main
- Commit: aaf0087735a6c7147af47ccd062c343c1a0e477b
- Generado: 2026-10-22T19:09:33-05:00
- Archivos solicitados: 31
- Archivos incluidos: 31
- Archivos faltantes: 0
- Archivos con extracto parcial (>1000 líneas): 0

## Pre-flight check

```
$ ls -la .
total 68
drwxr-xr-x. 1 iandi iandi   308 oct 22 18:45 .
drwxr-xr-x. 1 iandi iandi   514 oct 22 17:21 ..
drwxr-xr-x. 1 iandi iandi    80 oct 22 19:01 application
drwxr-xr-x. 1 iandi iandi    22 oct 22 10:59 database
-rw-r--r--. 1 iandi iandi 10973 oct 22 10:59 docker-compose.yml
-rw-r--r--. 1 iandi iandi  6148 oct 22 10:59 .DS_Store
-rw-r--r--. 1 iandi iandi   437 oct 22 10:59 .env.example
-rw-r--r--. 1 iandi iandi 21894 oct 22 11:21 ESTRATEGIA-HA-DR.md
drwxr-xr-x. 1 iandi iandi   188 oct 22 11:28 .git
-rw-r--r--. 1 iandi iandi   339 oct 22 10:59 .gitignore
drwxr-xr-x. 1 iandi iandi   286 oct 22 10:59 haproxy
drwxr-xr-x. 1 iandi iandi   240 oct 22 19:01 keepalived
drwxr-xr-x. 1 iandi iandi    32 oct 22 10:59 nagios
-rw-r--r--. 1 iandi iandi  5288 oct 22 10:59 README.md
drwxr-xr-x. 1 iandi iandi   144 oct 22 10:59 resilience-lab
-rw-r--r--. 1 iandi iandi  3157 oct 22 10:59 ToDo.md
-rw-r--r--. 1 iandi iandi  1967 oct 22 18:45 tree.md
drwxr-xr-x. 1 iandi iandi    92 oct 22 10:59 web
```

## Índice

| # | Ruta | Lenguaje | Líneas | Incluido | Notas |
|---|---|---|---:|---|---|
| 1 | haproxy/presentation-master.cfg | haproxy | 22 | sí |  |
| 2 | haproxy/presentation-backup.cfg | haproxy | 22 | sí |  |
| 3 | haproxy/presentation-entry.cfg | haproxy | 16 | sí |  |
| 4 | haproxy/application-master.cfg | haproxy | 22 | sí |  |
| 5 | haproxy/application-backup.cfg | haproxy | 22 | sí |  |
| 6 | keepalived/presentation-master.conf | ini | 35 | sí | Secreto redactado |
| 7 | keepalived/presentation-backup.conf | ini | 35 | sí | Secreto redactado |
| 8 | keepalived/application-master.conf | ini | 35 | sí | Secreto redactado |
| 9 | keepalived/application-backup.conf | ini | 35 | sí | Secreto redactado |
| 10 | keepalived/check-haproxy.sh | bash | 3 | sí |  |
| 11 | keepalived/Dockerfile | dockerfile | 12 | sí |  |
| 12 | web/nginx.conf | nginx | 26 | sí |  |
| 13 | database/catalog.sql | sql | 23 | sí |  |
| 14 | application/package.json | json | 14 | sí |  |
| 15 | web/site1/index.html | html | 41 | sí |  |
| 16 | web/catalog.css | css | 68 | sí |  |
| 17 | nagios/architecture.cfg | haproxy | 249 | sí |  |
| 18 | resilience-lab/docker-compose.yml | yaml | 62 | sí |  |
| 19 | resilience-lab/chaosmonkey/chaosmonkey.py | python | 180 | sí |  |
| 20 | resilience-lab/chaosmonkey/Dockerfile | dockerfile | 4 | sí |  |
| 21 | resilience-lab/chaosmonkey/run.sh | bash | 4 | sí |  |
| 22 | resilience-lab/dashboard/app.py | python | 343 | sí |  |
| 23 | resilience-lab/dashboard/Dockerfile | dockerfile | 7 | sí |  |
| 24 | resilience-lab/ab/run.sh | bash | 11 | sí |  |
| 25 | resilience-lab/ab/Dockerfile | dockerfile | 4 | sí |  |
| 26 | resilience-lab/jmeter/run.sh | bash | 60 | sí |  |
| 27 | resilience-lab/jmeter/Dockerfile | dockerfile | 8 | sí |  |
| 28 | resilience-lab/siege/run.sh | bash | 13 | sí |  |
| 29 | resilience-lab/siege/Dockerfile | dockerfile | 6 | sí |  |
| 30 | resilience-lab/TEST-PLAN.md | markdown | 94 | sí |  |
| 31 | .env.example | dotenv | 10 | sí | Secreto redactado |

---

## 1. `haproxy/presentation-master.cfg`

```haproxy
global
    log stdout format raw local0

defaults
    log global
    mode http
    option httplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend presentation
    bind *:80
    http-request set-header X-Presentation-LB presentation-lb-master
    default_backend websites

backend websites
    balance roundrobin
    option httpchk GET /
    server web1 web1:80 check
    server web2 web2:80 check
    server web3 web3:80 check
```

**Notas de extracción:**
- Frontend `presentation` en HTTP, bind `*:80`, default backend `websites`; no hay bloques `stats` ni `listen`.
- Backend `websites`: `balance roundrobin`; servers `web1 web1:80 check`, `web2 web2:80 check`, `web3 web3:80 check`.
- `option httpchk GET /`; no hay directivas `http-check`. Header: `X-Presentation-LB presentation-lb-master`.
- Timeouts: `timeout connect 5s`, `timeout client 30s`, `timeout server 30s`.

---

## 2. `haproxy/presentation-backup.cfg`

```haproxy
global
    log stdout format raw local0

defaults
    log global
    mode http
    option httplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend presentation
    bind *:80
    http-request set-header X-Presentation-LB presentation-lb-backup
    default_backend websites

backend websites
    balance roundrobin
    option httpchk GET /
    server web1 web1:80 check
    server web2 web2:80 check
    server web3 web3:80 check
```

**Notas de extracción:**
- Frontend `presentation` en HTTP, bind `*:80`, default backend `websites`; no hay bloques `stats` ni `listen`.
- Backend `websites`: `balance roundrobin`; servers `web1 web1:80 check`, `web2 web2:80 check`, `web3 web3:80 check`.
- `option httpchk GET /`; no hay directivas `http-check`. Header: `X-Presentation-LB presentation-lb-backup`.
- Timeouts: `timeout connect 5s`, `timeout client 30s`, `timeout server 30s`.

---

## 3. `haproxy/presentation-entry.cfg`

```haproxy
global
    log stdout format raw local0

defaults
    log global
    mode tcp
    timeout connect 3s
    timeout client 30s
    timeout server 30s

frontend entry
    bind *:80
    default_backend presentation_vip

backend presentation_vip
    server vip 172.30.0.250:80
```

**Notas de extracción:**
- Frontend `entry` en TCP, bind `*:80`, default backend `presentation_vip`; no hay bloques `stats` ni `listen`.
- Backend `presentation_vip`: server `vip 172.30.0.250:80` (sin opciones `check`); no hay directivas `balance`, `option httpchk`, `http-check` ni `http-request set-header`.
- Timeouts: `timeout connect 3s`, `timeout client 30s`, `timeout server 30s`.

---

## 4. `haproxy/application-master.cfg`

```haproxy
global
    log stdout format raw local0

defaults
    log global
    mode http
    option httplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend application
    bind *:8080
    http-request set-header X-Application-LB application-lb-master
    default_backend application_nodes

backend application_nodes
    balance roundrobin
    option httpchk GET /health
    server app1 app1:8080 check
    server app2 app2:8080 check
    server app3 app3:8080 check
```

**Notas de extracción:**
- Frontend `application` en HTTP, bind `*:8080`, default backend `application_nodes`; no hay bloques `stats` ni `listen`.
- Backend `application_nodes`: `balance roundrobin`; servers `app1 app1:8080 check`, `app2 app2:8080 check`, `app3 app3:8080 check`.
- `option httpchk GET /health`; no hay directivas `http-check`. Header: `X-Application-LB application-lb-master`.
- Timeouts: `timeout connect 5s`, `timeout client 30s`, `timeout server 30s`.

---

## 5. `haproxy/application-backup.cfg`

```haproxy
global
    log stdout format raw local0

defaults
    log global
    mode http
    option httplog
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend application
    bind *:8080
    http-request set-header X-Application-LB application-lb-backup
    default_backend application_nodes

backend application_nodes
    balance roundrobin
    option httpchk GET /health
    server app1 app1:8080 check
    server app2 app2:8080 check
    server app3 app3:8080 check
```

**Notas de extracción:**
- Frontend `application` en HTTP, bind `*:8080`, default backend `application_nodes`; no hay bloques `stats` ni `listen`.
- Backend `application_nodes`: `balance roundrobin`; servers `app1 app1:8080 check`, `app2 app2:8080 check`, `app3 app3:8080 check`.
- `option httpchk GET /health`; no hay directivas `http-check`. Header: `X-Application-LB application-lb-backup`.
- Timeouts: `timeout connect 5s`, `timeout client 30s`, `timeout server 30s`.

---

## 6. `keepalived/presentation-master.conf`

```ini
global_defs {
    router_id PRESENTATION_MASTER
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "/usr/local/bin/check-haproxy.sh 80"
    interval 2
    fall 2
    rise 2
    weight -20
}

vrrp_instance VI_PRESENTATION {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 110
    advert_int 1
    unicast_src_ip 172.30.0.11
    unicast_peer {
        172.30.0.12
    }
    authentication {
        auth_type PASS
        auth_pass <REDACTED>
    }
    virtual_ipaddress {
        172.30.0.250/24 dev eth0
    }
    track_script {
        check_haproxy
    }
}
```

**Notas de extracción:**
- `vrrp_instance VI_PRESENTATION`; `state MASTER`; `virtual_router_id 51`; `priority 110`.
- `virtual_ipaddress`: `172.30.0.250/24 dev eth0`; `unicast_src_ip 172.30.0.11`; peer `172.30.0.12`.
- `track_script`: `check_haproxy`; `vrrp_script` ejecuta `/usr/local/bin/check-haproxy.sh 80` (interval 2, fall 2, rise 2, weight -20).
- Se redactó 1 secreto en la línea 27 (`auth_pass`).

---

## 7. `keepalived/presentation-backup.conf`

```ini
global_defs {
    router_id PRESENTATION_BACKUP
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "/usr/local/bin/check-haproxy.sh 80"
    interval 2
    fall 2
    rise 2
    weight -20
}

vrrp_instance VI_PRESENTATION {
    state BACKUP
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    unicast_src_ip 172.30.0.12
    unicast_peer {
        172.30.0.11
    }
    authentication {
        auth_type PASS
        auth_pass <REDACTED>
    }
    virtual_ipaddress {
        172.30.0.250/24 dev eth0
    }
    track_script {
        check_haproxy
    }
}
```

**Notas de extracción:**
- `vrrp_instance VI_PRESENTATION`; `state BACKUP`; `virtual_router_id 51`; `priority 100`.
- `virtual_ipaddress`: `172.30.0.250/24 dev eth0`; `unicast_src_ip 172.30.0.12`; peer `172.30.0.11`.
- `track_script`: `check_haproxy`; `vrrp_script` ejecuta `/usr/local/bin/check-haproxy.sh 80` (interval 2, fall 2, rise 2, weight -20).
- Se redactó 1 secreto en la línea 27 (`auth_pass`).

---

## 8. `keepalived/application-master.conf`

```ini
global_defs {
    router_id APPLICATION_MASTER
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "/usr/local/bin/check-haproxy.sh 8080"
    interval 2
    fall 2
    rise 2
    weight -20
}

vrrp_instance VI_APPLICATION {
    state MASTER
    interface eth0
    virtual_router_id 52
    priority 110
    advert_int 1
    unicast_src_ip 172.31.0.11
    unicast_peer {
        172.31.0.12
    }
    authentication {
        auth_type PASS
        auth_pass <REDACTED>
    }
    virtual_ipaddress {
        172.31.0.250/24 dev eth0
    }
    track_script {
        check_haproxy
    }
}
```

**Notas de extracción:**
- `vrrp_instance VI_APPLICATION`; `state MASTER`; `virtual_router_id 52`; `priority 110`.
- `virtual_ipaddress`: `172.31.0.250/24 dev eth0`; `unicast_src_ip 172.31.0.11`; peer `172.31.0.12`.
- `track_script`: `check_haproxy`; `vrrp_script` ejecuta `/usr/local/bin/check-haproxy.sh 8080` (interval 2, fall 2, rise 2, weight -20).
- Se redactó 1 secreto en la línea 27 (`auth_pass`).

---

## 9. `keepalived/application-backup.conf`

```ini
global_defs {
    router_id APPLICATION_BACKUP
    enable_script_security
    script_user root
}

vrrp_script check_haproxy {
    script "/usr/local/bin/check-haproxy.sh 8080"
    interval 2
    fall 2
    rise 2
    weight -20
}

vrrp_instance VI_APPLICATION {
    state BACKUP
    interface eth0
    virtual_router_id 52
    priority 100
    advert_int 1
    unicast_src_ip 172.31.0.12
    unicast_peer {
        172.31.0.11
    }
    authentication {
        auth_type PASS
        auth_pass <REDACTED>
    }
    virtual_ipaddress {
        172.31.0.250/24 dev eth0
    }
    track_script {
        check_haproxy
    }
}
```

**Notas de extracción:**
- `vrrp_instance VI_APPLICATION`; `state BACKUP`; `virtual_router_id 52`; `priority 100`.
- `virtual_ipaddress`: `172.31.0.250/24 dev eth0`; `unicast_src_ip 172.31.0.12`; peer `172.31.0.11`.
- `track_script`: `check_haproxy`; `vrrp_script` ejecuta `/usr/local/bin/check-haproxy.sh 8080` (interval 2, fall 2, rise 2, weight -20).
- Se redactó 1 secreto en la línea 27 (`auth_pass`).

---

## 10. `keepalived/check-haproxy.sh`

```bash
#!/bin/sh

nc -z -w 1 127.0.0.1 "$1"
```

**Notas de extracción:**
- Usa `nc -z -w 1` contra `127.0.0.1` en el puerto recibido como primer argumento.

---

## 11. `keepalived/Dockerfile`

```dockerfile
FROM alpine:3.21

RUN apk add --no-cache keepalived busybox-extras

COPY check-haproxy.sh /usr/local/bin/check-haproxy.sh
RUN chmod 0755 /usr/local/bin/check-haproxy.sh

ARG KEEPALIVED_CONFIG
COPY ${KEEPALIVED_CONFIG} /etc/keepalived/keepalived.conf
RUN chmod 0644 /etc/keepalived/keepalived.conf

ENTRYPOINT ["sh", "-c", "rm -f /run/keepalived.pid /run/vrrp.pid /run/checkers.pid; exec keepalived --dont-fork --log-console --use-file=/etc/keepalived/keepalived.conf"]
```

**Notas de extracción:**
- Base `alpine:3.21`; instala keepalived y busybox-extras, copia script y configuración especificada por `KEEPALIVED_CONFIG`, y ejecuta keepalived en foreground.

---

## 12. `web/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location = /catalog.js {
        alias /usr/share/nginx/catalog.js;
    }

    location = /catalog.css {
        alias /usr/share/nginx/catalog.css;
    }

    location /api/ {
        proxy_pass http://172.31.0.250:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Presentation-LB $http_x_presentation_lb;
        proxy_set_header X-Web-Node $hostname;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

**Notas de extracción:**
- No hay bloques `upstream`.
- Locations: `= /catalog.js`, `= /catalog.css`, `/api/`, `/`.
- `proxy_pass http://172.31.0.250:8080/`; headers proxy: `Host $host`, `X-Real-IP $remote_addr`, `X-Presentation-LB $http_x_presentation_lb`, `X-Web-Node $hostname`.

---

## 13. `database/catalog.sql`

```sql
CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (price >= 0)
);

INSERT IGNORE INTO products (sku, name, description, price) VALUES
    ('ST-001', 'Cotton Tote Bag', 'Reusable natural cotton shopping bag.', 3.49),
    ('ST-002', 'Wooden Pencil Set', 'Pack of six graphite pencils.', 4.25),
    ('ST-003', 'Ceramic Mug', 'Everyday 350 ml stoneware mug.', 5.99),
    ('ST-004', 'Pocket Notebook', 'A6 ruled notebook with 96 pages.', 6.50),
    ('ST-005', 'Stainless Water Bottle', 'Reusable 500 ml bottle.', 8.75),
    ('ST-006', 'Canvas Apron', 'Durable cotton canvas kitchen apron.', 11.25),
    ('ST-007', 'Desk Plant', 'Small low-maintenance indoor plant.', 12.99),
    ('ST-008', 'Wool Blend Scarf', 'Soft midweight scarf for cool weather.', 15.50),
    ('ST-009', 'Insulated Lunch Box', 'Compact lunch box with thermal lining.', 18.00),
    ('ST-010', 'Wireless Mouse', 'Compact wireless mouse with USB receiver.', 21.99),
    ('ST-011', 'Table Lamp', 'Adjustable LED desk lamp.', 28.50),
    ('ST-012', 'Travel Backpack', 'Lightweight 20-liter day backpack.', 39.95);
```

**Notas de extracción:**
- Tabla `products`: columnas `id`, `sku`, `name`, `description`, `price`, `created_at`.
- Índices/restricciones: `id` PRIMARY KEY; `sku` UNIQUE; CHECK `price >= 0`. No hay declaraciones `CREATE INDEX` separadas.
- INSERT para `products`: 12 filas.

---

## 14. `application/package.json`

```json
{
  "name": "store-catalog-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "mongodb": "^6.17.0",
    "mysql2": "^3.14.1",
    "redis": "^5.5.6"
  }
}
```

**Notas de extracción:**
- Dependencias: `mongodb` `^6.17.0`, `mysql2` `^3.14.1`, `redis` `^5.5.6`.
- No define `engines.node`. Script: `start` = `node index.js`.

---

## 15. `web/site1/index.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Website node 1</title>
  <link rel="stylesheet" href="/catalog.css">
</head>
<body>
  <h1>Website node 1</h1>
  <section aria-labelledby="api-explorer-title">
    <h2 id="api-explorer-title">API explorer</h2>
    <label for="api-endpoint">Endpoint</label>
    <select id="api-endpoint">
      <option value="/products/cheapest">GET /products/cheapest — cheapest products</option>
      <option value="/products/ST-001/reviews">GET /products/ST-001/reviews — product reviews</option>
      <option value="/">GET / — API information</option>
      <option value="/health">GET /health — service health</option>
    </select>
    <button id="query-api" type="button">Query endpoint</button>
    <button id="clear-cache" type="button">Clear Redis catalog cache</button>
    <p id="api-result-status" role="status"></p>
    <ol id="api-trace" class="pipeline" aria-label="API explorer request pipeline"></ol>
    <pre id="api-result" aria-live="polite"></pre>
  </section>
  <section aria-labelledby="request-flow-title">
    <h2 id="request-flow-title">Live request traces</h2>
    <p>Each pipeline shows the components used by its API request.</p>
    <h3>Cheapest products</h3>
    <ol id="products-trace" class="pipeline" aria-label="Cheapest products request pipeline"></ol>
    <h3>Product reviews (ST-001)</h3>
    <ol id="reviews-trace" class="pipeline" aria-label="Product reviews request pipeline"></ol>
  </section>
  <h2>Ten cheapest products</h2>
  <p id="status">Loading products...</p>
  <ol id="products"></ol>
  <h2>Recent product reviews</h2>
  <p id="reviews-status">Loading reviews...</p>
  <ul id="reviews"></ul>
  <script src="/catalog.js" defer></script>
</body>
</html>
```

**Notas de extracción:**
- IDs DOM: `api-explorer-title` (h2, texto “API explorer”; no referenciado por `getElementById` en `catalog.js`); `api-endpoint` (select; sí); `query-api` (button, “Query endpoint”; sí); `clear-cache` (button, “Clear Redis catalog cache”; sí); `api-result-status` (p, vacío, role status; sí); `api-trace` (ol, vacío; sí); `api-result` (pre, vacío; sí); `request-flow-title` (h2, “Live request traces”; no); `products-trace` (ol, vacío; sí); `reviews-trace` (ol, vacío; sí); `status` (p, “Loading products...”; sí); `products` (ol, vacío; sí); `reviews-status` (p, “Loading reviews...”; sí); `reviews` (ul, vacío; sí).

---

## 16. `web/catalog.css`

```css
body {
  font-family: system-ui, sans-serif;
  margin: 2rem auto;
  max-width: 64rem;
  padding: 0 1rem;
}

select,
button {
  font: inherit;
  margin: 0.25rem 0.5rem 0.25rem 0;
  padding: 0.45rem 0.65rem;
}

button {
  cursor: pointer;
}

pre {
  background: #f3f5f7;
  border-radius: 0.5rem;
  overflow-x: auto;
  padding: 1rem;
}

.pipeline {
  align-items: stretch;
  display: flex;
  flex-wrap: wrap;
  gap: 1.75rem;
  list-style: none;
  margin: 0.75rem 0 1.5rem;
  padding: 0;
}

.pipeline li {
  background: #e8f1fb;
  border: 1px solid #9bb9d8;
  border-radius: 0.5rem;
  min-width: 7rem;
  padding: 0.75rem;
  position: relative;
  text-align: center;
}

.pipeline li:not(:last-child)::after {
  color: #40546a;
  content: "\2192";
  font-size: 1.4rem;
  left: calc(100% + 0.35rem);
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

@media (max-width: 38rem) {
  .pipeline {
    flex-direction: column;
    gap: 1.5rem;
  }

  .pipeline li:not(:last-child)::after {
    content: "\2193";
    left: 50%;
    top: calc(100% + 0.05rem);
    transform: translateX(-50%);
  }
}
```

**Notas de extracción:**
- Hoja de estilos con reglas generales, controles, `pre`, listas `.pipeline` y media query para anchos de hasta `38rem`.

---

## 17. `nagios/architecture.cfg`

```haproxy
define command {
    command_name check_tcp_port
    command_line $USER1$/check_tcp -H $HOSTADDRESS$ -p $ARG1$
}

define command {
    command_name check_http_port
    command_line $USER1$/check_http -H $HOSTADDRESS$ -p $ARG1$ -u /
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               presentation-lb-master
    alias                   Presentation HAProxy master
    address                 presentation-lb-master
    check_command           check_tcp_port!80
}

define service {
    use                     generic-service
    host_name               presentation-lb-master
    service_description     HTTP listener
    check_command           check_http_port!80
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               presentation-lb-backup
    alias                   Presentation HAProxy backup
    address                 presentation-lb-backup
    check_command           check_tcp_port!80
}

define service {
    use                     generic-service
    host_name               presentation-lb-backup
    service_description     HTTP listener
    check_command           check_http_port!80
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               web1
    alias                   Website node 1
    address                 web1
    check_command           check_tcp_port!80
}

define service {
    use                     generic-service
    host_name               web1
    service_description     Website HTTP
    check_command           check_http_port!80
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               web2
    alias                   Website node 2
    address                 web2
    check_command           check_tcp_port!80
}

define service {
    use                     generic-service
    host_name               web2
    service_description     Website HTTP
    check_command           check_http_port!80
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               web3
    alias                   Website node 3
    address                 web3
    check_command           check_tcp_port!80
}

define service {
    use                     generic-service
    host_name               web3
    service_description     Website HTTP
    check_command           check_http_port!80
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               application-lb-master
    alias                   Application HAProxy master
    address                 application-lb-master
    check_command           check_tcp_port!8080
}

define service {
    use                     generic-service
    host_name               application-lb-master
    service_description     Application HTTP
    check_command           check_http_port!8080
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               application-lb-backup
    alias                   Application HAProxy backup
    address                 application-lb-backup
    check_command           check_tcp_port!8080
}

define service {
    use                     generic-service
    host_name               application-lb-backup
    service_description     Application HTTP
    check_command           check_http_port!8080
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               app1
    alias                   Application node 1
    address                 app1
    check_command           check_tcp_port!8080
}

define service {
    use                     generic-service
    host_name               app1
    service_description     Application HTTP
    check_command           check_http_port!8080
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               app2
    alias                   Application node 2
    address                 app2
    check_command           check_tcp_port!8080
}

define service {
    use                     generic-service
    host_name               app2
    service_description     Application HTTP
    check_command           check_http_port!8080
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               app3
    alias                   Application node 3
    address                 app3
    check_command           check_tcp_port!8080
}

define service {
    use                     generic-service
    host_name               app3
    service_description     Application HTTP
    check_command           check_http_port!8080
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               galera1
    alias                   Galera database node 1
    address                 galera1
    check_command           check_tcp_port!3306
}

define service {
    use                     generic-service
    host_name               galera1
    service_description     MariaDB TCP
    check_command           check_tcp_port!3306
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               galera2
    alias                   Galera database node 2
    address                 galera2
    check_command           check_tcp_port!3306
}

define service {
    use                     generic-service
    host_name               galera2
    service_description     MariaDB TCP
    check_command           check_tcp_port!3306
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               galera3
    alias                   Galera database node 3
    address                 galera3
    check_command           check_tcp_port!3306
}

define service {
    use                     generic-service
    host_name               galera3
    service_description     MariaDB TCP
    check_command           check_tcp_port!3306
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               mongodb
    alias                   MongoDB product reviews
    address                 mongodb
    check_command           check_tcp_port!27017
}

define service {
    use                     generic-service
    host_name               mongodb
    service_description     MongoDB TCP
    check_command           check_tcp_port!27017
}

define host {
    use                     generic-host
    max_check_attempts      5
    host_name               redis
    alias                   Redis catalog cache
    address                 redis
    check_command           check_tcp_port!6379
}

define service {
    use                     generic-service
    host_name               redis
    service_description     Redis TCP
    check_command           check_tcp_port!6379
}
```

**Notas de extracción:**
- Comandos: `check_tcp_port` (`$USER1$/check_tcp -H $HOSTADDRESS$ -p $ARG1$`); `check_http_port` (`$USER1$/check_http -H $HOSTADDRESS$ -p $ARG1$ -u /`).
- Hosts/check_command: `presentation-lb-master` → `check_tcp_port!80`; `presentation-lb-backup` → `check_tcp_port!80`; `web1`, `web2`, `web3` → `check_tcp_port!80`; `application-lb-master`, `application-lb-backup` → `check_tcp_port!8080`; `app1`, `app2`, `app3` → `check_tcp_port!8080`; `galera1`, `galera2`, `galera3` → `check_tcp_port!3306`; `mongodb` → `check_tcp_port!27017`; `redis` → `check_tcp_port!6379`.
- Servicios/check_command/host_name: listeners HTTP de `presentation-lb-master` y `presentation-lb-backup` → `check_http_port!80`; servicio Website HTTP de `web1`, `web2`, `web3` → `check_http_port!80`; Application HTTP de los dos application LB y `app1`, `app2`, `app3` → `check_http_port!8080`; MariaDB TCP de `galera1`-`galera3` → `check_tcp_port!3306`; MongoDB TCP `mongodb` → `check_tcp_port!27017`; Redis TCP `redis` → `check_tcp_port!6379`.
- Hay 14 definiciones `host`, 14 `service` y 2 `command`. No aparecen directivas `notification_interval` ni `contact_groups`.

---

## 18. `resilience-lab/docker-compose.yml`

```yaml
name: resilience-lab

# Test tooling for the distributed-three-tier project.
# Start the main stack first (docker compose up -d in the repository root).

x-tool: &tool
  restart: unless-stopped
  command: ["sleep", "infinity"]
  volumes:
    - results:/results

services:
  ab:
    <<: *tool
    build: ./ab
    container_name: lab-ab
    networks: [edge]

  siege:
    <<: *tool
    build: ./siege
    container_name: lab-siege
    networks: [edge]

  jmeter:
    <<: *tool
    build: ./jmeter
    container_name: lab-jmeter
    networks: [edge]

  chaosmonkey:
    <<: *tool
    build: ./chaosmonkey
    container_name: lab-chaosmonkey
    environment:
      CHAOS_PROJECT: ${TARGET_PROJECT:-distributed-three-tier}
    volumes:
      - results:/results
      - /var/run/docker.sock:/var/run/docker.sock
    networks: [edge]

  dashboard:
    build: ./dashboard
    container_name: lab-dashboard
    restart: unless-stopped
    ports:
      - "${DASHBOARD_PORT:-8090}:8090"
    environment:
      DEFAULT_TARGET: ${DEFAULT_TARGET:-http://presentation-entry}
    volumes:
      - results:/results
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on: [ab, siege, jmeter, chaosmonkey]
    networks: [edge]

volumes:
  results:

networks:
  edge:
    name: ${TARGET_PROJECT:-distributed-three-tier}_edge
    external: true
```

**Notas de extracción:**
- Servicios: `ab`, `siege`, `jmeter`, `chaosmonkey`, `dashboard`; todos en la red externa `edge`, volúmenes compartidos `results` en las herramientas.
- `chaosmonkey` y `dashboard` montan `/var/run/docker.sock`; dashboard publica el puerto configurable (por defecto 8090). La red externa se llama `${TARGET_PROJECT:-distributed-three-tier}_edge`.

---

## 19. `resilience-lab/chaosmonkey/chaosmonkey.py`

```python
"""Small Chaos Monkey for the distributed-three-tier compose project.

Periodically stops/kills/pauses random containers from a target group, restores
them after DOWNTIME seconds, and probes an HTTP endpoint to measure the
availability the users would have seen. Everything is restored on exit.
"""
import json
import os
import random
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

OUT = sys.argv[1]
PROJECT = os.environ.get("CHAOS_PROJECT", "distributed-three-tier")
GROUP = os.environ.get("GROUP", "web")
TARGETS = [t.strip() for t in os.environ.get("TARGETS", "").split(",") if t.strip()]
ACTION = os.environ.get("ACTION", "stop")
INTERVAL = float(os.environ.get("INTERVAL", "20"))
DOWNTIME = float(os.environ.get("DOWNTIME", "15"))
DURATION = float(os.environ.get("DURATION", "90"))
MAX_CONCURRENT = int(os.environ.get("MAX_CONCURRENT", "1"))
PROBE_URL = os.environ.get("PROBE_URL", "http://presentation-entry/api/health")
PROBE_INTERVAL = float(os.environ.get("PROBE_INTERVAL", "1"))
DRY_RUN = os.environ.get("DRY_RUN", "false") == "true"

# Service names of the main project; the entry proxy, nagios and the init job are never touched.
GROUPS = {
    "presentation-lb": ["presentation-lb-master", "presentation-lb-backup"],
    "web": ["web1", "web2", "web3"],
    "application-lb": ["application-lb-master", "application-lb-backup"],
    "app": ["app1", "app2", "app3"],
    "galera": ["galera1", "galera2", "galera3"],
    "redis": ["redis"],
    "mongodb": ["mongodb"],
}
GROUPS["any"] = sum(GROUPS.values(), [])
PROTECTED = {"presentation-entry", "nagios", "catalog-init"}

stop_event = threading.Event()
lock = threading.Lock()
events, probes = [], []
down = {}  # container name -> (service, action, restore deadline)
started = time.time()


def log(msg):
    print(f"[{time.time() - started:6.1f}s] {msg}", flush=True)


def docker(*args):
    return subprocess.run(["docker", *args], capture_output=True, text=True)


def record(action, service, ok=True, detail=""):
    with lock:
        events.append({"t": round(time.time() - started, 1), "action": action,
                       "service": service, "ok": ok, "detail": detail})
    log(f"{action} {service} {'' if ok else 'FAILED '}{detail}")


def list_containers():
    res = docker("ps", "-a", "--filter", f"label=com.docker.compose.project={PROJECT}",
                 "--format", '{{.Names}}|{{.Label "com.docker.compose.service"}}|{{.State}}')
    found = {}
    for line in res.stdout.splitlines():
        name, service, state = line.split("|")
        found[service] = (name, state)
    return found


def restore(name, service, action):
    if DRY_RUN:
        record("restore(dry-run)", service)
        return
    res = docker("unpause", name) if action == "pause" else docker("start", name)
    record("restore", service, res.returncode == 0, res.stderr.strip())
    # keepalived shares the netns of its load balancer, so it must follow a restart
    if "-lb-" in service and action != "pause":
        r = docker("restart", name.replace("-lb-", "-keepalived-"))
        record("restart", service.replace("-lb-", "-keepalived-"), r.returncode == 0, r.stderr.strip())


def inject(name, service):
    if DRY_RUN:
        record(f"{ACTION}(dry-run)", service)
        return True
    res = docker(ACTION, name)
    record(ACTION, service, res.returncode == 0, res.stderr.strip())
    return res.returncode == 0


def prober():
    while not stop_event.is_set():
        t0 = time.time()
        status, err = 0, ""
        try:
            with urllib.request.urlopen(PROBE_URL, timeout=3) as r:
                status = r.status
        except urllib.error.HTTPError as e:
            status = e.code
        except Exception as e:  # noqa: BLE001 - any failure counts as unavailable
            err = type(e).__name__
        probes.append({"t": round(t0 - started, 1), "status": status,
                       "ms": round((time.time() - t0) * 1000), "ok": 200 <= status < 400, "err": err})
        stop_event.wait(max(0, PROBE_INTERVAL - (time.time() - t0)))


def write_summary():
    ok = [p for p in probes if p["ok"]]
    longest = cur = 0.0
    for p in probes:
        cur = cur + PROBE_INTERVAL if not p["ok"] else 0.0
        longest = max(longest, cur)
    injected = [e for e in events if e["action"].startswith(ACTION) and e["ok"]]
    summary = {
        "metrics": {
            "Faults injected": len(injected),
            "Probes sent": len(probes),
            "Probes failed": len(probes) - len(ok),
            "Availability %": round(100 * len(ok) / len(probes), 2) if probes else None,
            "Longest outage s": round(longest, 1),
            "Avg probe latency ms": round(sum(p["ms"] for p in ok) / len(ok), 1) if ok else None,
        },
        "events": events,
        "timeline": [{"t": p["t"], "ok": p["ok"], "ms": p["ms"]} for p in probes],
    }
    with open(os.path.join(OUT, "summary.json"), "w") as f:
        json.dump(summary, f)


def main():
    signal.signal(signal.SIGTERM, lambda *_: stop_event.set())
    signal.signal(signal.SIGINT, lambda *_: stop_event.set())
    pool = TARGETS or GROUPS.get(GROUP, [])
    found = list_containers()
    pool = [s for s in pool if s not in PROTECTED and s in found]
    log(f"project={PROJECT} action={ACTION} dry_run={DRY_RUN} pool={pool}")
    log(f"interval={INTERVAL}s downtime={DOWNTIME}s duration={DURATION}s probe={PROBE_URL}")
    if not pool:
        log("no matching containers; is the main stack running?")
        sys.exit(2)

    threading.Thread(target=prober, daemon=True).start()
    stop_event.wait(min(3, INTERVAL))  # healthy baseline before the first fault
    deadline = started + DURATION
    next_fault = time.time()
    try:
        while not stop_event.is_set() and time.time() < deadline:
            now = time.time()
            for name, (service, action, due) in list(down.items()):
                if now >= due:
                    restore(name, service, action)
                    del down[name]
            if now >= next_fault and len(down) < MAX_CONCURRENT:
                idle = [s for s in pool if found[s][0] not in down]
                if idle:
                    service = random.choice(idle)
                    name = found[service][0]
                    if inject(name, service):
                        down[name] = (service, ACTION, time.time() + DOWNTIME)
                next_fault = time.time() + INTERVAL
            stop_event.wait(0.5)
    finally:
        interrupted = stop_event.is_set()
        for name, (service, action, _) in list(down.items()):
            restore(name, service, action)
        if not interrupted:
            stop_event.wait(min(10, DOWNTIME))  # observe recovery
        stop_event.set()
        time.sleep(0.5)
        write_summary()
        log("done; all targets restored")


main()
```

**Notas de extracción:**
- Funciones: `log`, `docker`, `record`, `list_containers`, `restore`, `inject`, `prober`, `write_summary`, `main`.
- Targets por grupo: `presentation-lb` (presentation-lb-master/backup), `web` (web1-3), `application-lb` (application-lb-master/backup), `app` (app1-3), `galera` (galera1-3), `redis`, `mongodb`, `any` (unión de grupos); protegidos: `presentation-entry`, `nagios`, `catalog-init`. También permite lista explícita `TARGETS`.
- Comandos vía CLI `docker`: `ps -a` filtrado por label de proyecto, acción configurada (`stop`, `kill` o `pause`), restauración `start`/`unpause` y `restart` de keepalived asociado a LB después de restaurar salvo `pause`. Script Python sin referencia directa a `docker.sock`; el bind mount está en `resilience-lab/docker-compose.yml`.
- Scheduling: espera baseline hasta min(3, INTERVAL), inyecta cada `INTERVAL` mientras dure `DURATION` y `MAX_CONCURRENT` lo permita; restaura después de `DOWNTIME`, observa recuperación hasta min(10, DOWNTIME) y restaura objetivos al salir. Prober corre cada `PROBE_INTERVAL` contra `PROBE_URL`; escribe `summary.json`.

---

## 20. `resilience-lab/chaosmonkey/Dockerfile`

```dockerfile
FROM python:3.13-alpine
RUN apk add --no-cache docker-cli
COPY run.sh chaosmonkey.py /runbook/
RUN chmod 0755 /runbook/run.sh
```

**Notas de extracción:**
- Base `python:3.13-alpine`; instala `docker-cli`; copia `run.sh` y `chaosmonkey.py` a `/runbook/`.

---

## 21. `resilience-lab/chaosmonkey/run.sh`

```bash
#!/bin/sh
# Runbook: Chaos Monkey. Usage: run.sh <outdir>   (parameters come from env)
OUT=$1; mkdir -p "$OUT"; echo $$ > "$OUT/pid"
exec python3 -u /runbook/chaosmonkey.py "$OUT"
```

**Notas de extracción:**
- Crea el directorio de resultados, escribe PID y ejecuta `chaosmonkey.py`; los parámetros de ejecución provienen del entorno.

---

## 22. `resilience-lab/dashboard/app.py`

```python
"""Dashboard that launches the resilience-lab tools and shows their results."""
import csv
import json
import os
import re
import subprocess
import threading
import time
import uuid
from urllib.parse import urlparse

from flask import Flask, abort, jsonify, request, send_from_directory

RESULTS = "/results"
DEFAULT_TARGET = os.environ.get("DEFAULT_TARGET", "http://presentation-entry").rstrip("/")
app = Flask(__name__, static_folder="static", static_url_path="")
procs, lock = {}, threading.Lock()

F = lambda key, label, default, kind="text", **kw: {"key": key, "label": label, "default": default, "type": kind, **kw}  # noqa: E731

TOOLS = {
    "ab": {
        "title": "ApacheBench (ab)", "container": "lab-ab", "kind": "performance",
        "description": "Fixed number of requests against one URL. Quick throughput/latency baseline.",
        "runbook": ["Start the main stack and open this dashboard.",
                    "Run the Smoke preset to confirm the target answers (0 failed requests).",
                    "Run Load, then Stress; compare requests/s and p95/p99 across runs.",
                    "Failed requests or Non-2xx responses point to saturation: check HAProxy/Nagios."],
        "fields": [F("TARGET_URL", "Target URL", DEFAULT_TARGET + "/"),
                   F("REQUESTS", "Total requests", 1000, "number", min=1, max=1000000),
                   F("CONCURRENCY", "Concurrency", 20, "number", min=1, max=2000),
                   F("TIMEOUT", "Timeout (s)", 30, "number", min=1, max=600),
                   F("KEEPALIVE", "HTTP keep-alive", False, "bool")],
        "presets": {"Smoke": {"REQUESTS": 100, "CONCURRENCY": 5}, "Load": {"REQUESTS": 5000, "CONCURRENCY": 50},
                    "Stress": {"REQUESTS": 20000, "CONCURRENCY": 200}},
    },
    "siege": {
        "title": "Siege", "container": "lab-siege", "kind": "performance",
        "description": "Time-boxed load over a list of URLs with simulated users.",
        "runbook": ["Enter one URL per line (web pages and /api/ calls).",
                    "Run Smoke, then Load; leave benchmark mode on for max pressure or off to add think time.",
                    "Check Availability (target >= 99%) and Response time / Longest transaction.",
                    "Run it together with a Chaos Monkey run to see behaviour under failures."],
        "fields": [F("URLS", "URLs (one per line)", f"{DEFAULT_TARGET}/\n{DEFAULT_TARGET}/api/health\n{DEFAULT_TARGET}/api/products/cheapest", "textarea"),
                   F("CONCURRENCY", "Concurrent users", 20, "number", min=1, max=1000),
                   F("DURATION", "Duration (s)", 30, "number", min=1, max=3600),
                   F("BENCHMARK", "Benchmark mode (no delay)", True, "bool"),
                   F("DELAY", "Max random delay (s)", 1, "number", min=0, max=60)],
        "presets": {"Smoke": {"CONCURRENCY": 5, "DURATION": 10}, "Load": {"CONCURRENCY": 50, "DURATION": 60},
                    "Stress": {"CONCURRENCY": 200, "DURATION": 60}},
    },
    "jmeter": {
        "title": "Apache JMeter", "container": "lab-jmeter", "kind": "performance",
        "description": "Thread-group scenario with ramp-up; produces a full HTML report.",
        "runbook": ["Set the base URL and the request paths (one per line).",
                    "Pick threads, ramp-up and duration; Smoke first, then Load.",
                    "Review error %, percentiles and throughput here; open the full HTML report for graphs.",
                    "Use think time to model real users; set it to 0 for raw capacity."],
        "fields": [F("BASE_URL", "Base URL", DEFAULT_TARGET),
                   F("PATHS", "Paths (one per line)", "/\n/api/health\n/api/products/cheapest", "textarea"),
                   F("THREADS", "Threads (users)", 20, "number", min=1, max=1000),
                   F("RAMPUP", "Ramp-up (s)", 5, "number", min=0, max=600),
                   F("DURATION", "Duration (s)", 30, "number", min=1, max=3600),
                   F("THINK_MS", "Think time (ms)", 0, "number", min=0, max=60000)],
        "presets": {"Smoke": {"THREADS": 5, "DURATION": 15}, "Load": {"THREADS": 50, "RAMPUP": 10, "DURATION": 60},
                    "Stress": {"THREADS": 200, "RAMPUP": 30, "DURATION": 90}},
    },
    "chaosmonkey": {
        "title": "Chaos Monkey", "container": "lab-chaosmonkey", "kind": "resilience",
        "description": "Randomly stops/kills/pauses project containers and measures user-visible availability.",
        "runbook": ["Start with Dry run to see which containers would be hit.",
                    "Pick a group: presentation-lb tests the VRRP failover, web/app test pool redundancy, galera/redis/mongodb test the data tier.",
                    "Optionally start Siege/JMeter in parallel for load while faults are injected.",
                    "Expect availability near 100% for redundant groups; compare Longest outage with the Keepalived/health-check timers.",
                    "All targets are restored automatically at the end or when stopped."],
        "fields": [F("GROUP", "Target group", "web", "select",
                     options=["web", "app", "presentation-lb", "application-lb", "galera", "redis", "mongodb", "any"]),
                   F("TARGETS", "Explicit services (comma separated, overrides group)", "", "text", required=False),
                   F("ACTION", "Fault", "stop", "select", options=["stop", "kill", "pause"]),
                   F("INTERVAL", "Seconds between faults", 20, "number", min=1, max=3600),
                   F("DOWNTIME", "Seconds a victim stays down", 15, "number", min=1, max=3600),
                   F("DURATION", "Total duration (s)", 90, "number", min=5, max=7200),
                   F("MAX_CONCURRENT", "Max victims at once", 1, "number", min=1, max=5),
                   F("PROBE_URL", "Availability probe URL", DEFAULT_TARGET + "/api/health"),
                   F("DRY_RUN", "Dry run (do not touch containers)", False, "bool")],
        "presets": {"Gentle": {"INTERVAL": 30, "DOWNTIME": 15, "DURATION": 90},
                    "Aggressive": {"INTERVAL": 10, "DOWNTIME": 20, "DURATION": 120, "MAX_CONCURRENT": 2},
                    "LB failover": {"GROUP": "presentation-lb", "INTERVAL": 30, "DOWNTIME": 20, "DURATION": 90}},
    },
}


def clean_params(tool, raw):
    params = {}
    for f in TOOLS[tool]["fields"]:
        v = raw.get(f["key"], f["default"])
        if f["type"] == "number":
            try:
                v = float(v)
            except (TypeError, ValueError):
                raise ValueError(f"{f['label']} must be a number")
            if not f["min"] <= v <= f["max"]:
                raise ValueError(f"{f['label']} must be between {f['min']} and {f['max']}")
            v = str(int(v)) if v == int(v) else str(v)
        elif f["type"] == "bool":
            v = "true" if v in (True, "true", "on", 1) else "false"
        elif f["type"] == "select":
            if v not in f["options"]:
                raise ValueError(f"{f['label']} is invalid")
        else:
            v = str(v).strip()
            if not v and f.get("required", True):
                raise ValueError(f"{f['label']} is required")
            if f["key"] in ("TARGET_URL", "PROBE_URL", "BASE_URL") and not re.match(r"^https?://[^\s]+$", v):
                raise ValueError(f"{f['label']} must be an http(s) URL")
            if f["key"] == "TARGETS" and v and not re.match(r"^[\w.,\- ]+$", v):
                raise ValueError("Explicit services contain invalid characters")
            if f["key"] in ("URLS",) and any(not re.match(r"^https?://\S+$", u.strip()) for u in v.splitlines() if u.strip()):
                raise ValueError("Every URL must start with http:// or https://")
            if f["key"] == "PATHS" and any(not u.strip().startswith("/") for u in v.splitlines() if u.strip()):
                raise ValueError("Every path must start with /")
        params[f["key"]] = v
    if tool == "jmeter":
        u = urlparse(params.pop("BASE_URL"))
        params["PROTOCOL"] = u.scheme
        params["HOST"] = u.hostname
        params["PORT"] = str(u.port or (443 if u.scheme == "https" else 80))
    return params


def run_dir(run_id):
    return os.path.join(RESULTS, run_id)


def read_meta(run_id):
    try:
        with open(os.path.join(run_dir(run_id), "meta.json")) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_meta(meta):
    path = os.path.join(run_dir(meta["id"]), "meta.json")
    with open(path + ".tmp", "w") as f:
        json.dump(meta, f)
    os.replace(path + ".tmp", path)


def execute(meta, params):
    tool = TOOLS[meta["tool"]]
    out = run_dir(meta["id"])
    cmd = ["docker", "exec"]
    for k, v in params.items():
        cmd += ["-e", f"{k}={v}"]
    cmd += [tool["container"], f"/runbook/run.sh", out]
    with open(os.path.join(out, "console.log"), "w") as log:
        proc = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT)
        with lock:
            procs[meta["id"]] = proc
        code = proc.wait()
    with lock:
        procs.pop(meta["id"], None)
    meta = read_meta(meta["id"])
    meta["finished"] = time.time()
    if meta["status"] == "stopping":
        meta["status"] = "stopped"
    else:
        meta["status"] = "finished" if code == 0 else "failed"
    meta["exit_code"] = code
    try:
        meta["summary"] = build_summary(meta)
    except Exception as e:  # noqa: BLE001 - never lose a run because of a parser bug
        meta["summary"] = {"metrics": {}, "error": f"could not parse results: {e}"}
    write_meta(meta)


# ---- result parsers -------------------------------------------------------

def num(s):
    return float(s.replace(",", ""))


def parse_ab(text, out):
    m = {}
    patterns = {
        "Requests/s": r"Requests per second:\s+([\d.]+)",
        "Mean latency ms": r"Time per request:\s+([\d.]+) \[ms\] \(mean\)\n",
        "Completed requests": r"Complete requests:\s+(\d+)",
        "Failed requests": r"Failed requests:\s+(\d+)",
        "Non-2xx responses": r"Non-2xx responses:\s+(\d+)",
        "Transfer rate KB/s": r"Transfer rate:\s+([\d.]+)",
        "Total time s": r"Time taken for tests:\s+([\d.]+)",
    }
    for label, pat in patterns.items():
        r = re.search(pat, text)
        m[label] = num(r.group(1)) if r else (0 if label == "Non-2xx responses" else None)
    pct = {f"p{p}": num(v) for p, v in re.findall(r"^\s+(\d+)%\s+(\d+)", text, re.M)}
    return {"metrics": m, "percentiles": pct, "unit": "ms"}


def parse_siege(text, out):
    labels = {"Transactions": "Transactions", "Availability": "Availability %", "Elapsed time": "Elapsed s",
              "Data transferred": "Data MB", "Response time": "Avg response s", "Transaction rate": "Transactions/s",
              "Throughput": "Throughput MB/s", "Concurrency": "Avg concurrency",
              "Successful transactions": "Successful", "Failed transactions": "Failed",
              "Longest transaction": "Longest s", "Shortest transaction": "Shortest s"}
    m = {}
    for key, val in re.findall(r"^([A-Za-z ]+):\s+([\d.,]+)", text, re.M):
        if key.strip() in labels:
            m[labels[key.strip()]] = num(val)
    return {"metrics": m}


def parse_jmeter(text, out):
    path = os.path.join(out, "results.jtl")
    rows = list(csv.DictReader(open(path))) if os.path.exists(path) else []
    if not rows:
        return {"metrics": {}, "error": "JMeter produced no samples"}
    el = sorted(int(r["elapsed"]) for r in rows)
    ts = [int(r["timeStamp"]) for r in rows]
    span = max((max(ts) + int(rows[ts.index(max(ts))]["elapsed"]) - min(ts)) / 1000, 0.001)
    errors = sum(1 for r in rows if r["success"] != "true")
    pick = lambda p: el[min(len(el) - 1, int(len(el) * p / 100))]  # noqa: E731
    per = {}
    for r in rows:
        s = per.setdefault(r["label"], {"n": 0, "err": 0, "sum": 0})
        s["n"] += 1
        s["err"] += r["success"] != "true"
        s["sum"] += int(r["elapsed"])
    return {
        "metrics": {"Samples": len(rows), "Errors": errors, "Error %": round(100 * errors / len(rows), 2),
                    "Throughput req/s": round(len(rows) / span, 2), "Avg ms": round(sum(el) / len(el), 1),
                    "Min ms": el[0], "Max ms": el[-1]},
        "percentiles": {"p50": pick(50), "p90": pick(90), "p95": pick(95), "p99": pick(99)},
        "unit": "ms",
        "table": [{"label": k, "samples": v["n"], "errors": v["err"], "avg_ms": round(v["sum"] / v["n"], 1)}
                  for k, v in per.items()],
        "report": os.path.isfile(os.path.join(out, "report", "index.html")),
    }


def build_summary(meta):
    out = run_dir(meta["id"])
    if meta["tool"] == "chaosmonkey":
        p = os.path.join(out, "summary.json")
        if os.path.exists(p):
            return json.load(open(p))
        return {"metrics": {}, "error": "no summary produced (see console log)"}
    text = open(os.path.join(out, "console.log"), errors="replace").read()
    return {"ab": parse_ab, "siege": parse_siege, "jmeter": parse_jmeter}[meta["tool"]](text, out)


# ---- API ------------------------------------------------------------------

@app.get("/api/tools")
def api_tools():
    return jsonify(TOOLS)


@app.post("/api/runs")
def api_start():
    body = request.get_json(force=True, silent=True) or {}
    tool = body.get("tool")
    if tool not in TOOLS:
        return jsonify(error="unknown tool"), 400
    try:
        params = clean_params(tool, body.get("params", {}))
    except ValueError as e:
        return jsonify(error=str(e)), 400
    run_id = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    os.makedirs(run_dir(run_id))
    meta = {"id": run_id, "tool": tool, "status": "running", "started": time.time(),
            "params": params if tool != "jmeter" else {**params}, "summary": None}
    write_meta(meta)
    threading.Thread(target=execute, args=(meta, params), daemon=True).start()
    return jsonify(meta), 202


@app.get("/api/runs")
def api_runs():
    runs = []
    for name in sorted(os.listdir(RESULTS), reverse=True):
        meta = read_meta(name)
        if meta:
            with lock:
                active = name in procs
            if meta["status"] in ("running", "stopping") and not active:
                meta["status"] = "interrupted"
            runs.append({k: meta.get(k) for k in ("id", "tool", "status", "started", "finished", "summary")})
    return jsonify(runs[:100])


@app.get("/api/runs/<run_id>")
def api_run(run_id):
    meta = read_meta(run_id) if re.fullmatch(r"[\w-]+", run_id) else None
    if not meta:
        abort(404)
    with lock:
        active = run_id in procs
    if meta["status"] in ("running", "stopping") and not active:
        meta["status"] = "interrupted"
    try:
        with open(os.path.join(run_dir(run_id), "console.log"), errors="replace") as f:
            meta["console"] = f.read()[-20000:]
    except OSError:
        meta["console"] = ""
    meta["files"] = sorted(f for f in os.listdir(run_dir(run_id)) if os.path.isfile(os.path.join(run_dir(run_id), f)))
    return jsonify(meta)


@app.post("/api/runs/<run_id>/stop")
def api_stop(run_id):
    meta = read_meta(run_id) if re.fullmatch(r"[\w-]+", run_id) else None
    with lock:
        active = run_id in procs
    if not meta or not active:
        return jsonify(error="run is not active"), 404
    meta["status"] = "stopping"
    write_meta(meta)
    container = TOOLS[meta["tool"]]["container"]
    script = f'p=$(cat {run_dir(run_id)}/pid); pkill -TERM -P "$p"; kill -TERM "$p"'
    subprocess.run(["docker", "exec", container, "sh", "-c", script], capture_output=True)
    return jsonify(meta)


@app.get("/files/<run_id>/<path:name>")
def files(run_id, name):
    if not re.fullmatch(r"[\w-]+", run_id):
        abort(404)
    resp = send_from_directory(run_dir(run_id), name)
    if request.args.get("download"):
        resp.headers["Content-Disposition"] = f'attachment; filename="{run_id}-{os.path.basename(name)}"'
    return resp


@app.get("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8090, threaded=True)
```

**Notas de extracción:**
- Endpoints: `GET /api/tools`; `POST /api/runs`; `GET /api/runs`; `GET /api/runs/<run_id>`; `POST /api/runs/<run_id>/stop`; `GET /files/<run_id>/<path:name>`; `GET /`.
- Fuentes: configuraciones declaradas en `TOOLS`; `/results` (meta.json, console.log, summary.json, results.jtl, archivos de reporte); procesos de herramientas en contenedores vía `docker exec`; los parsers derivan resultados del log/JTL/summary.
- Métricas: ab—requests/s, latencia media, requests completas/fallidas, non-2xx, transferencia, duración y percentiles; Siege—transactions, disponibilidad, elapsed, transferencia, tiempo de respuesta, transaction rate, throughput, concurrencia, éxito/fallo, transacción mayor/menor; JMeter—muestras, errores y %, throughput, avg/min/max, p50/p90/p95/p99, por etiqueta y disponibilidad del reporte; Chaos Monkey—faults, probes enviados/fallidos, disponibilidad %, longest outage y latencia media de probe.

---

## 23. `resilience-lab/dashboard/Dockerfile`

```dockerfile
FROM python:3.13-alpine
RUN apk add --no-cache docker-cli && pip install --no-cache-dir flask==3.1.*
WORKDIR /app
COPY app.py .
COPY static static
EXPOSE 8090
CMD ["python", "-u", "app.py"]
```

**Notas de extracción:**
- Base `python:3.13-alpine`; instala Flask `3.1.*`; expone `8090` y ejecuta `app.py`.

---

## 24. `resilience-lab/ab/run.sh`

```bash
#!/bin/sh
# Runbook: Apache Bench. Usage: run.sh <outdir>   (parameters come from env)
set -u
OUT=$1; mkdir -p "$OUT"; echo $$ > "$OUT/pid"
: "${TARGET_URL:=http://presentation-entry/}" "${REQUESTS:=1000}" "${CONCURRENCY:=20}" "${TIMEOUT:=30}" "${KEEPALIVE:=false}"

FLAGS="-r -l"   # -r keep going on socket errors, -l tolerate variable length bodies
[ "$KEEPALIVE" = "true" ] && FLAGS="$FLAGS -k"
echo "+ ab -n $REQUESTS -c $CONCURRENCY -s $TIMEOUT $FLAGS $TARGET_URL"
# shellcheck disable=SC2086
ab -n "$REQUESTS" -c "$CONCURRENCY" -s "$TIMEOUT" $FLAGS -e "$OUT/percentiles.csv" "$TARGET_URL"
```

**Notas de extracción:**
- Lee `TARGET_URL`, `REQUESTS`, `CONCURRENCY`, `TIMEOUT`, `KEEPALIVE`; invoca ApacheBench y guarda percentiles CSV en el directorio de resultados.

---

## 25. `resilience-lab/ab/Dockerfile`

```dockerfile
FROM alpine:3.21
RUN apk add --no-cache apache2-utils
COPY run.sh /runbook/run.sh
RUN chmod 0755 /runbook/run.sh
```

**Notas de extracción:**
- Base `alpine:3.21`; instala `apache2-utils` y copia el runbook.

---

## 26. `resilience-lab/jmeter/run.sh`

```bash
#!/bin/bash
# Runbook: JMeter. Usage: run.sh <outdir>   (parameters come from env)
set -u
OUT=$1; mkdir -p "$OUT"; echo $$ > "$OUT/pid"
: "${PROTOCOL:=http}" "${HOST:=presentation-entry}" "${PORT:=80}" "${THREADS:=20}" "${RAMPUP:=5}" \
  "${DURATION:=30}" "${THINK_MS:=0}" "${PATHS:=/}"

esc() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g'; }

PLAN="$OUT/plan.jmx"
{
cat <<XML
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3"><hashTree>
<TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Resilience lab" enabled="true">
  <boolProp name="TestPlan.functional_mode">false</boolProp>
  <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
  <elementProp name="TestPlan.user_defined_variables" elementType="Arguments"><collectionProp name="Arguments.arguments"/></elementProp>
</TestPlan><hashTree>
<ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Users" enabled="true">
  <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
  <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" enabled="true">
    <boolProp name="LoopController.continue_forever">false</boolProp>
    <intProp name="LoopController.loops">-1</intProp>
  </elementProp>
  <stringProp name="ThreadGroup.num_threads">$THREADS</stringProp>
  <stringProp name="ThreadGroup.ramp_time">$RAMPUP</stringProp>
  <boolProp name="ThreadGroup.scheduler">true</boolProp>
  <stringProp name="ThreadGroup.duration">$DURATION</stringProp>
  <stringProp name="ThreadGroup.delay"></stringProp>
  <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
</ThreadGroup><hashTree>
XML
if [ "$THINK_MS" -gt 0 ]; then cat <<XML
<ConstantTimer guiclass="ConstantTimerGui" testclass="ConstantTimer" testname="Think time" enabled="true">
  <stringProp name="ConstantTimer.delay">$THINK_MS</stringProp>
</ConstantTimer><hashTree/>
XML
fi
printf '%s\n' "$PATHS" | sed '/^[[:space:]]*$/d' | while read -r P; do
  EP=$(esc "$P")
  cat <<XML
<HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="GET $EP" enabled="true">
  <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" enabled="true"><collectionProp name="Arguments.arguments"/></elementProp>
  <stringProp name="HTTPSampler.domain">$HOST</stringProp>
  <stringProp name="HTTPSampler.port">$PORT</stringProp>
  <stringProp name="HTTPSampler.protocol">$PROTOCOL</stringProp>
  <stringProp name="HTTPSampler.path">$EP</stringProp>
  <stringProp name="HTTPSampler.method">GET</stringProp>
  <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
  <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
</HTTPSamplerProxy><hashTree/>
XML
done
echo '</hashTree></hashTree></hashTree></jmeterTestPlan>'
} > "$PLAN"

rm -rf "$OUT/report" "$OUT/results.jtl"
echo "+ jmeter -n -t plan.jmx  (threads=$THREADS ramp=${RAMPUP}s duration=${DURATION}s host=$HOST:$PORT)"
jmeter -n -t "$PLAN" -l "$OUT/results.jtl" -j "$OUT/jmeter.log" -e -o "$OUT/report" 2>&1
```

**Notas de extracción:**
- Genera plan JMX a partir de `PROTOCOL`, `HOST`, `PORT`, `THREADS`, `RAMPUP`, `DURATION`, `THINK_MS`, `PATHS`; ejecuta JMeter y produce `results.jtl` y reporte HTML.

---

## 27. `resilience-lab/jmeter/Dockerfile`

```dockerfile
FROM eclipse-temurin:17-jre-alpine
ARG JMETER_VERSION=5.6.3
RUN apk add --no-cache bash curl \
 && curl -fsSL https://archive.apache.org/dist/jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz | tar -xz -C /opt \
 && ln -s /opt/apache-jmeter-${JMETER_VERSION}/bin/jmeter /usr/local/bin/jmeter
ENV JVM_ARGS="-Xms256m -Xmx768m"
COPY run.sh /runbook/run.sh
RUN chmod 0755 /runbook/run.sh
```

**Notas de extracción:**
- Base `eclipse-temurin:17-jre-alpine`; descarga JMeter `5.6.3` por defecto y copia el runbook.

---

## 28. `resilience-lab/siege/run.sh`

```bash
#!/bin/sh
# Runbook: Siege. Usage: run.sh <outdir>   (parameters come from env)
set -u
OUT=$1; mkdir -p "$OUT"; echo $$ > "$OUT/pid"
: "${URLS:=http://presentation-entry/}" "${CONCURRENCY:=20}" "${DURATION:=30}" "${DELAY:=1}" "${BENCHMARK:=true}"

printf '%s\n' "$URLS" | sed '/^[[:space:]]*$/d' > "$OUT/urls.txt"
MODE="-d $DELAY"
[ "$BENCHMARK" = "true" ] && MODE="-b"
echo "+ siege -c $CONCURRENCY -t ${DURATION}S $MODE -f urls.txt"
cat "$OUT/urls.txt"
# siege prints its report on stderr and exits non-zero when availability is low
siege -c "$CONCURRENCY" -t "${DURATION}S" $MODE -f "$OUT/urls.txt" 2>&1
```

**Notas de extracción:**
- Lee `URLS`, `CONCURRENCY`, `DURATION`, `DELAY`, `BENCHMARK`; escribe URL list y ejecuta Siege.

---

## 29. `resilience-lab/siege/Dockerfile`

```dockerfile
FROM debian:stable-slim
RUN apt-get update && apt-get install -y --no-install-recommends siege procps \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /root/.siege && siege.config >/dev/null 2>&1 || true
COPY run.sh /runbook/run.sh
RUN chmod 0755 /runbook/run.sh
```

**Notas de extracción:**
- Base `debian:stable-slim`; instala Siege y procps; copia el runbook.

---

## 30. `resilience-lab/TEST-PLAN.md`

```markdown
# Resilience, HA, Failover and Performance Test Plan

Complete test set for the `distributed-three-tier` project, plus commonly used tools.
The lab in this folder already covers ab, Siege, JMeter and container-level Chaos Monkey faults.

## 1. Baseline and functional checks (before any fault)

- Every layer is healthy: HAProxy backends all UP, `/api/health` returns OK, Galera `wsrep_cluster_size=3`, VIPs held by their masters.
- Round-robin: the `X-Web-Node` and `X-Presentation-LB` headers rotate across web1-3.
- Data consistency: a write on one Galera node is readable on the others; cache hits and misses behave correctly.

## 2. Performance tests

| Test | Goal | Lab tool |
|---|---|---|
| Smoke | Confirm the path works with 1-5 users | ab, JMeter |
| Load | Expected traffic held for 10-30 minutes | JMeter, Siege |
| Stress | Ramp up until errors or latency climb; find the first bottleneck | ab, JMeter |
| Spike | Jump from 5 to 300 users within seconds, then recover | JMeter |
| Soak | Moderate load for hours to catch leaks and connection exhaustion | JMeter |
| Cache effect | Compare latency with and without Redis (`/cache/clear`) | JMeter |
| Capacity per layer | Test web, app and DB directly, bypassing upper layers, to locate the bottleneck | ab |

Track p50/p95/p99 latency, throughput, error rate and CPU/memory per container (`docker stats` or cAdvisor).
Use SLO-style targets, e.g. p95 < 200 ms and availability >= 99.9%.

## 3. HA and failover tests

Run each under constant load; record outage time and failed requests.

| Component | Fault | Expected result |
|---|---|---|
| Presentation LB master | stop, kill, pause | VIP moves to the backup within about 3-4 s |
| Presentation LB master | HAProxy hangs but container stays up | Keepalived check script fails, priority drops by 20, backup takes over |
| Presentation LB master | recovery | Failback without flapping |
| Application LB master | same three faults | Same, on `172.31.0.250` |
| Both LBs of one tier | stop both | Total outage, recovery on restart (negative test) |
| 1 of 3 web/app nodes | stop | HAProxy health check drops it; zero or near-zero errors |
| 2 of 3 web/app nodes | stop | Reduced capacity but still serving |
| Galera node | stop galera2 or galera3 | Cluster keeps quorum |
| Galera node | stop galera1 | **Expected to fail**: `DB_HOST=galera1` is a single point |
| Redis | stop | Graceful degradation: slower DB-only reads, no 500s |
| MongoDB | stop | Same; reviews degraded |
| Entry proxy | stop | Total outage, accepted Docker Desktop limitation |

## 4. Chaos engineering tests

Each experiment: state a steady-state hypothesis (e.g. availability >= 99% and p95 < 500 ms), inject the fault,
compare against the hypothesis, recover, record findings.

- **Container faults:** random stop/kill/pause, several victims at once (covered by the lab).
- **Network faults:** latency, jitter, packet loss, bandwidth limits, partitions between app and DB or between Galera halves (split-brain). Not yet in the lab; use Pumba or Toxiproxy.
- **Resource faults:** CPU hog, memory pressure, disk full/slow, file-descriptor exhaustion (`stress-ng`, Pumba stress).
- **Time faults:** clock skew, which affects Keepalived and Galera.
- **Dependency faults:** DB slowness without failure, exposing missing timeouts and retry storms.
- **Compound faults:** load test plus node failure plus cache flush at the same time.
- **Recovery faults:** restart the whole stack; check startup order, cold cache and Galera re-bootstrap after losing all nodes.

## 5. Observability and alerting checks

- Nagios alerts on each fault within its check interval; count missed and false alerts.
- Logs are sufficient to reconstruct the timeline.
- Record mean time to detect, mean time to recover and error budget burn per experiment.

## Gaps the tests will likely expose

- `DB_HOST=galera1` in the app is a single point of failure.
- Redis and MongoDB are single instances.
- `presentation-entry` is a single point of failure.
- Compose `restart: unless-stopped` does not restart a container that was stopped deliberately.

## Commonly used tools

| Area | Tools |
|---|---|
| HTTP load | k6 (JS scripts, CI-friendly), Locust (Python), Gatling, wrk/wrk2 (constant rate, accurate latency), vegeta, hey, bombardier, Artillery |
| Enterprise / distributed load | BlazeMeter, Tsung, NBomber, Taurus (YAML wrapper over JMeter, Gatling, etc.) |
| Chaos, containers/Docker | Pumba (kill, pause, netem, stress), Chaos Toolkit (declarative experiments), Gremlin (SaaS) |
| Chaos, Kubernetes | Chaos Mesh, LitmusChaos, Netflix Chaos Monkey / Simian Army (cloud, Spinnaker) |
| Chaos, cloud | AWS Fault Injection Service, Azure Chaos Studio |
| Network faults | Toxiproxy, tc/netem, Comcast, iptables |
| Host/resource stress | stress-ng, fio, iperf3 |
| Database | sysbench, HammerDB, mysqlslap, pgbench, YCSB, mongoperf, redis-benchmark |
| Distributed correctness | Jepsen (for databases like Galera and MongoDB) |
| Observability | Prometheus + Grafana, cAdvisor, node_exporter, Loki, Jaeger/OpenTelemetry, HAProxy stats and exporter, mysqld_exporter, Nagios/Zabbix |
| CI gating | GitHub Actions with k6 thresholds, Taurus |
| Game days | Written runbooks and blameless postmortems |

## Suggested next steps

1. Add Prometheus and Grafana (HAProxy exporter, cAdvisor) so each experiment has graphs of its hypothesis.
2. Add Pumba or Toxiproxy to the lab for latency, loss and partition experiments.
3. Add k6 or Locust for scripted, threshold-based tests that can run in CI.
4. Remove the `galera1` single point (database-aware proxy or managed endpoint) and rerun the DB failover test.
```

**Notas de extracción:**
- Escenarios de performance de la tabla: Smoke (1-5 users), Load (10-30 min), Stress, Spike (5 a 300 users), Soak (horas), Cache effect, Capacity per layer.
- Escenarios HA/failover de la tabla: fallos stop/kill/pause en presentation LB master; HAProxy hang y recuperación; mismos tres fallos en application LB master; ambos LBs detenidos; pérdida de 1 o 2 de 3 web/app nodes; fallos de galera2/3 y galera1 (esperado fallar por DB_HOST=galera1); Redis, MongoDB y entry proxy detenidos.
- Métricas: p50/p95/p99 latency, throughput, error rate, CPU/memoria por contenedor; además outage time/failed requests, Nagios detection, missed/false alerts, MTdetect, MTTR y error-budget burn.
- Umbrales/SLO expresados: ejemplo p95 < 200 ms y availability >= 99.9%; hipótesis de caos (ejemplo) availability >= 99% y p95 < 500 ms; Siege Availability target >= 99%; recuperación VIP en aproximadamente 3-4 s.

---

## 31. `.env.example`

```dotenv
# Local demonstration credentials only. Replace before deploying anywhere shared.
MARIADB_ROOT_PASSWORD=<REDACTED>
MARIADB_BACKUP_PASSWORD=<REDACTED>
CATALOG_DB_NAME=store
CATALOG_DB_USER=store_app
CATALOG_DB_PASSWORD=<REDACTED>
MONGO_DB_NAME=store_reviews
MONGO_ROOT_USERNAME=store_admin
MONGO_ROOT_PASSWORD=<REDACTED>
NAGIOSADMIN_PASSWORD=<REDACTED>
```

**Notas de extracción:**
- Nombres de variables: `MARIADB_ROOT_PASSWORD`, `MARIADB_BACKUP_PASSWORD`, `CATALOG_DB_NAME`, `CATALOG_DB_USER`, `CATALOG_DB_PASSWORD`, `MONGO_DB_NAME`, `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `NAGIOSADMIN_PASSWORD`.
- Se redactaron 5 valores de password en las líneas 2, 3, 6, 9 y 10.

---

## Archivos faltantes

| Ruta | Motivo |
|---|---|

## Archivos con extracto parcial

| Ruta | Líneas totales | Secciones extraídas |
|---|---:|---|
