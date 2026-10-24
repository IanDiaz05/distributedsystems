# Data availability: MongoDB, Redis and Galera

This implements ToDo 2.1, 2.2, 2.3 and all of section 3 for local Compose.
It adds process-level redundancy, not protection against losing the Compose host.
The code and configuration can be checked without starting any service. Actual
elections, replication and failover must be accepted separately in a disposable
environment. No migration or deployment is performed by editing these files.

## MongoDB

`mongodb`, `mongodb2` and `mongodb3` form the authenticated `store-rs` replica set.
Every member stores data; there is no arbiter. Two voting members must remain
available for majority writes and primary election. The API uses all three seed
hostnames, primary reads, majority writes, retryable writes and bounded driver
selection timeouts. A primary election can still cause temporary errors.

`mongodb-keyfile` generates the shared internal authentication key in a named
volume at deployment time. It is owned by the MongoDB image's `mongodb` user,
mode 0400, and mounted read-only in database containers. No key is committed.
Keep this volume with the database volumes; do not rotate it by deleting it.
Existing root credentials are reused; a least-privilege application account is
still a separate pending ToDo item.

`mongodb-init` initiates the set only if MongoDB reports NotYetInitialized. It
checks an existing set's identity/member hostnames without forcing reconfiguration,
then waits for one primary and two healthy secondaries before `catalog-init`.
This is a deployment initialization job, not a process to run per API replica.

### Existing MongoDB data

The original `mongodb` service and `mongodb-data` volume are deliberately retained
as the first member. Adding replication changes how that database is operated.
Before applying this topology to valuable data, take and verify an independent
backup, schedule downtime and validate the conversion on a copy. Confirm that
the configured credentials match the existing user: root environment variables
do not reset credentials in a populated volume. New members must have new,
empty volumes; initial sync replaces their local contents with replica-set data.
Do not delete volumes or force a new replica-set configuration to bypass an error.

## Redis

`redis`, `redis2` and `redis3` initially form one master and two replicas.
Three Sentinel processes monitor `catalog-cache` with quorum 2, detect failures
and promote a replica. Hostnames are announced on the internal Docker network;
no Redis or Sentinel port is published to the host. The API uses node-redis's
Sentinel discovery rather than a fixed master address, and reads only from the
master to avoid replica-lag effects immediately after invalidation.

Redis is explicitly **disposable cache**, not a system of record. RDB and AOF
are disabled. Each Redis node has a 128 MiB cache limit and allkeys-lru eviction.
Loss of all Redis contents is acceptable: a subsequent catalog request reads
MariaDB and repopulates the 60-second entry. Asynchronous Redis replication can
lose recent cache writes/deletions during failover; an old entry expires by TTL.
Do not use this configuration for sessions, orders or durable queues.

Named Redis/Sentinel volumes persist rewritten configuration (roles, current
master and Sentinel identity). Cache values are not persisted. Restarting nodes
therefore preserves the last configured topology while permitting an empty cache.
Sentinel and node configuration files must stay writable; mounting the live
configuration read-only would prevent failover configuration rewrites.

The API does not wait for Redis to start, and Redis failure does not fail
`/health`. Cache commands have a 250 ms response budget, with at most 64 pending
operations per API process; after a timeout new requests bypass cache until
outstanding operations settle. Normal concurrent cache hits remain supported.
The driver manages reconnection/topology discovery. A timed-out operation may
still complete later; this is acceptable only under the disposable-cache policy.
`POST /cache/clear` returns 503 when deletion cannot be confirmed, rather than
claiming success. Its deletion remains scoped to `store:products:cheapest`.

This network is trusted: Redis/Sentinel authentication and TLS are not introduced
here. Network isolation must be retained; do not publish these ports publicly.

## Galera routing

The API and `catalog-init` connect to `galera-proxy:3306`. This HAProxy instance
performs authenticated SQL checks against each Galera node, accepting only:

- `wsrep_cluster_status = Primary`;
- `wsrep_connected = ON` and `wsrep_ready = ON`;
- `wsrep_local_state = 4` (Synced);
- `read_only = 0`, `wsrep_on = 1` and `wsrep_desync = 0`.

The check reuses the existing catalog database user to read status, not root.
Its password is supplied through the environment, not command-line arguments.
HAProxy runs as its unprivileged image user. External checks require HAProxy's
`external-check preserve-env` and `insecure-fork-wanted` directives; only this
private database proxy enables them to execute the fixed SQL-check script.

**Routing policy:** both reads and writes use galera1 while it is healthy;
galera2 and galera3 are ordered backups. SQL text is not parsed or routed by
statement. Checks run every three seconds with two failures/successes to change
health state. Existing sessions are closed when a node is marked down. Recovery
of galera1 closes backup sessions so new connections return to the preferred node.
In-flight requests can fail during either transition; no SQL writes are blindly
retried, since the outcome of a disconnected write can be ambiguous.
The proxy checks candidates' cluster state; it does not elect a Galera primary,
repair quorum or guarantee causal reads across a failover. The current catalog
has no mutation API. Future catalog writes must define their consistency contract
and any required causal-read settings before enabling them.

This proxy is currently one container and remains a single point of failure.
Its presence solves direct-node routing, not proxy/host redundancy. DNS resolution
uses Docker's resolver so recreated database containers can be rediscovered.
Initial startup waits for all three Galera containers; runtime routing can use
any surviving eligible node. Full-cluster bootstrap/recovery remains an operator
procedure, not an automatically forced recovery action.

### Connection budget

| Setting | Default | Purpose |
|---|---:|---|
| `DB_POOL_LIMIT` | 10 | Maximum SQL connections per API process |
| `DB_QUEUE_LIMIT` | 20 | Maximum waiting acquisitions per API process |
| `DB_CONNECT_TIMEOUT_MS` | 3000 | SQL connection timeout |
| HAProxy server `maxconn` | 100 | Routed SQL connections to the selected node |
| HAProxy global `maxconn` | 120 | Incoming SQL connections |

Three replicas budget 3 × 10 = 30 pooled connections, plus one during schema
initialization. Each external health check opens an additional short-lived
connection; retain headroom for those and administration in MariaDB's effective
`max_connections`. Before scaling, ensure `API replicas × DB_POOL_LIMIT` fits
the selected node/proxy budget and measured database capacity. Increase these
limits jointly, not just the number of API containers. The API acquisition queue
is finite; proxy queuing times out after three seconds. Lower-layer defaults
still apply to statement execution; this is not an end-to-end query deadline.

## Verification

Completed without services: Compose model validation, JavaScript/shell syntax,
and dependency-free simulations of cache outages, SQL-check eligibility and
MongoDB initialization. Run the local simulations from the repository root:

```sh
node --test application/data-ha.test.js
docker compose --env-file .env.example config --quiet
```

Pending deployment acceptance, using disposable data:

1. Confirm three MongoDB members, one primary/two secondaries, and successful
   majority writes. Stop the current primary; verify election and new review
   creation after recovery. Stop two members; writes must fail visibly.
2. Identify the current Redis master from Sentinel. Stop it and confirm promotion,
   application rediscovery and cache repopulation. Repeat after restarting nodes.
   Stop all Redis nodes; `/api/products/cheapest` and `/api/health` must still work
   while MariaDB and MongoDB remain healthy. Cache clearing must report 503.
3. Stop galera1 while the other nodes retain a Primary component. After health
   detection, confirm catalog SQL and product lookups use an eligible backup.
   Restore galera1 and verify failback. Losing quorum must reject SQL routing.
4. Restart the stack without deleting volumes; confirm preserved MongoDB data,
   unchanged replica identity and Redis/Sentinel topology convergence.
5. Measure SQL connections and errors under the intended API replica count.

The lab's redis/mongodb groups now include all data members, and a separate
redis-sentinel group covers Sentinel processes. Avoid simultaneous experiments
over the same topology. Nagios's added TCP checks show process reachability,
not replication correctness or quorum; use the acceptance checks above too.

References: [MongoDB keyfile replica sets](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/),
[Redis Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/),
[node-redis Sentinel](https://github.com/redis/node-redis/blob/master/docs/sentinel.md),
[HAProxy configuration](https://docs.haproxy.org/3.2/configuration.html).
