# Distributed three-tier store demo

The stack serves a static storefront through three Nginx presentation nodes. Its
Node.js application tier queries a MariaDB Galera cluster for the ten cheapest
products, caches that list in Redis, and stores product reviews in MongoDB.
HAProxy instances distribute requests within each tier, and Keepalived provides
a master/backup virtual IP for each HAProxy pair.

Data availability now uses a three-member MongoDB replica set, three Redis nodes
with three Sentinels, and a Galera-aware SQL proxy. Redis is disposable cache;
catalog reads bypass it during outages. See [DATA-HA.md](./DATA-HA.md) for routing,
connection budgets, existing-volume precautions and pending live acceptance tests.

## Architecture

```mermaid
flowchart LR
    browser[Browser]

    subgraph edge["Presentation tier · edge network"]
        entry["HAProxy presentation-entry<br/>host port 80"]
        plbM["HAProxy presentation master"]
        plbB["HAProxy presentation backup"]
        pka["Keepalived VRRP pair<br/>presentation VIP 172.30.0.250"]
        web1["Nginx webnode1"]
        web2["Nginx webnode2"]
        web3["Nginx webnode3"]
        plbM --- pka
        plbB --- pka
        plbM --> web1
        plbM --> web2
        plbM --> web3
        plbB -. failover .-> web1
        plbB -. failover .-> web2
        plbB -. failover .-> web3
    end

    subgraph appnet["Application tier · internal application network"]
        albM["HAProxy application master"]
        albB["HAProxy application backup"]
        aka["Keepalived VRRP pair<br/>application VIP 172.31.0.250"]
        app1["API app1"]
        app2["API app2"]
        app3["API app3"]
        albM --- aka
        albB --- aka
        albM --> app1
        albM --> app2
        albM --> app3
        albB -. failover .-> app1
        albB -. failover .-> app2
        albB -. failover .-> app3
    end

    subgraph data["Data tier · internal database network"]
        redis[("Redis master + two replicas<br/>disposable catalog cache")]
        sentinels["Three Redis Sentinels<br/>master discovery / failover"]
        sqlproxy["galera-proxy<br/>cluster-aware health checks"]
        galera1[("MariaDB Galera node 1")]
        galera2[("MariaDB Galera node 2")]
        galera3[("MariaDB Galera node 3")]
        mongo[("MongoDB store-rs<br/>three data-bearing members")]
        sentinels --> redis
        sqlproxy --> galera1
        sqlproxy -. failover .-> galera2
        sqlproxy -. failover .-> galera3
        galera1 <--> galera2
        galera2 <--> galera3
        galera3 <--> galera1
    end

    browser -->|"HTTP :80"| entry
    entry -->|"presentation VIP"| pka
    web1 -->|"API via VIP"| aka
    web2 -->|"API via VIP"| aka
    web3 -->|"API via VIP"| aka
    app1 -->|"cache lookup / invalidate"| redis
    app2 -->|"cache lookup / invalidate"| redis
    app3 -->|"cache lookup / invalidate"| redis
    app1 -->|"cache miss / bypass"| sqlproxy
    app2 -->|"cache miss / bypass"| sqlproxy
    app3 -->|"cache miss / bypass"| sqlproxy
    app1 -->|"discover cache master"| sentinels
    app2 -->|"discover cache master"| sentinels
    app3 -->|"discover cache master"| sentinels
    app1 -->|"read/write reviews"| mongo
    app2 -->|"read/write reviews"| mongo
    app3 -->|"read/write reviews"| mongo
```

Product-list requests check Redis first; a cache miss queries MariaDB and then
populates Redis. Review requests use MongoDB, with MariaDB used to verify the
product before a review is inserted. In this single-host Compose setup, host
port 80 is published by `presentation-entry`, which forwards to the presentation
VIP. This entry container is itself a single point of failure.

## Run locally

1. Copy `.env.example` to `.env` and replace the example passwords.
2. Start the stack with `docker compose up --build`.
3. Open `http://localhost/` for the storefront and
   `http://localhost:8088/` for Nagios.

The product endpoint is `http://localhost/api/products/cheapest`; it returns
JSON sorted by ascending price. The storefront calls this endpoint and renders
the returned products. Schema creation and sample data insertion are
idempotently performed by `catalog-init` through the Galera proxy, after the
MongoDB replica-set initialization job succeeds. Read the existing-data precautions
in [DATA-HA.md](./DATA-HA.md) before applying this topology to populated volumes.

The storefront also displays a live request pipeline for its product and
review API requests. The API's `X-Request-Trace` response header records the
presentation load balancer, selected web node, application load balancer,
application node, and the actual data stores touched by that request.
The storefront API explorer menu can query `/`, `/health`,
`/products/cheapest`, and `/products/ST-001/reviews`.

Use the storefront's API explorer menu to query the product, review, service
information, and health endpoints. Its **Clear Redis catalog cache** button
calls `POST /api/cache/clear`, which deletes only the cheapest-products cache
entry; the next catalog request refills it from MariaDB.

The application uses Redis to cache the cheapest-products response for 60
seconds. MongoDB stores product reviews: use
`GET /api/products/ST-001/reviews` to read reviews or send JSON such as
`{"reviewer":"Taylor","rating":5,"comment":"Great bag."}` to
`POST /api/products/ST-001/reviews` to add one. The initialization service
creates the review index and inserts sample reviews idempotently. MongoDB and
Redis are private to the database network and are not published on host ports.

## Load-balancer failover

The presentation VIP is `172.30.0.250` and the application VIP is
`172.31.0.250`. Each Keepalived pair shares its HAProxy container's network
namespace, uses unicast VRRP, and tracks the local HAProxy listener. Application
requests from Nginx use the floating application VIP.

Compose publishes host port 80 on `presentation-entry`, which targets the floating
presentation VIP. The entry container and the Compose host remain single points
of failure even when both Keepalived pairs and data replication are configured.
