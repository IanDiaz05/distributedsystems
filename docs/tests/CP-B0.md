## CP-B0 — Checkpoint línea base

```bash
docker compose ps -a

# NAME                                                      IMAGE                                                   COMMAND                  SERVICE                          CREATED       STATUS                   PORTS
# distributed-three-tier-app1-1                             distributed-three-tier-app1                             "docker-entrypoint.s…"   app1                             5 hours ago   Up 5 hours               8080/tcp
# distributed-three-tier-app2-1                             distributed-three-tier-app2                             "docker-entrypoint.s…"   app2                             5 hours ago   Up 5 hours               8080/tcp
# distributed-three-tier-app3-1                             distributed-three-tier-app3                             "docker-entrypoint.s…"   app3                             5 hours ago   Up 5 hours               8080/tcp
# distributed-three-tier-application-keepalived-backup-1    distributed-three-tier-application-keepalived-backup    "sh -c 'rm -f /run/k…"   application-keepalived-backup    5 hours ago   Up 5 hours               
# distributed-three-tier-application-keepalived-master-1    distributed-three-tier-application-keepalived-master    "sh -c 'rm -f /run/k…"   application-keepalived-master    5 hours ago   Up 5 hours               
# distributed-three-tier-application-lb-backup-1            haproxy:3.2-alpine                                      "docker-entrypoint.s…"   application-lb-backup            5 hours ago   Up 5 hours               
# distributed-three-tier-application-lb-master-1            haproxy:3.2-alpine                                      "docker-entrypoint.s…"   application-lb-master            5 hours ago   Up 5 hours               
# distributed-three-tier-catalog-init-1                     distributed-three-tier-catalog-init                     "docker-entrypoint.s…"   catalog-init                     5 hours ago   Exited (0) 5 hours ago   
# distributed-three-tier-galera-proxy-1                     distributed-three-tier-galera-proxy                     "docker-entrypoint.s…"   galera-proxy                     5 hours ago   Up 5 hours               
# distributed-three-tier-galera1-1                          bitnamilegacy/mariadb-galera:11.4.7-debian-12-r3        "/opt/bitnami/script…"   galera1                          5 hours ago   Up 5 hours (healthy)     3306/tcp, 4444/tcp, 4567-4568/tcp
# distributed-three-tier-galera2-1                          bitnamilegacy/mariadb-galera:11.4.7-debian-12-r3        "/opt/bitnami/script…"   galera2                          5 hours ago   Up 5 hours (healthy)     3306/tcp, 4444/tcp, 4567-4568/tcp
# distributed-three-tier-galera3-1                          bitnamilegacy/mariadb-galera:11.4.7-debian-12-r3        "/opt/bitnami/script…"   galera3                          5 hours ago   Up 5 hours (healthy)     3306/tcp, 4444/tcp, 4567-4568/tcp
# distributed-three-tier-mongodb-1                          mongo:8                                                 "docker-entrypoint.s…"   mongodb                          5 hours ago   Up 5 hours (healthy)     27017/tcp
# distributed-three-tier-mongodb-init-1                     mongo:8                                                 "mongosh --nodb --qu…"   mongodb-init                     5 hours ago   Exited (0) 5 hours ago  
# distributed-three-tier-mongodb-keyfile-1                  mongo:8                                                 "bash -ec 'if [ ! -s…"   mongodb-keyfile                  5 hours ago   Exited (0) 5 hours ago  
# distributed-three-tier-mongodb2-1                         mongo:8                                                 "docker-entrypoint.s…"   mongodb2                         5 hours ago   Up 5 hours (healthy)     27017/tcp
# distributed-three-tier-mongodb3-1                         mongo:8                                                 "docker-entrypoint.s…"   mongodb3                         5 hours ago   Up 5 hours (healthy)     27017/tcp
# distributed-three-tier-nagios-1                           jasonrivers/nagios:latest                               "/usr/local/bin/star…"   nagios                           5 hours ago   Up 5 hours               5667/tcp, 0.0.0.0:8088->80/tcp, [::]:8088->80/tcp
# distributed-three-tier-presentation-entry-1               haproxy:3.2-alpine                                      "docker-entrypoint.s…"   presentation-entry               5 hours ago   Up 5 hours               0.0.0.0:80->80/tcp, [::]:80->80/tcp
# distributed-three-tier-presentation-keepalived-backup-1   distributed-three-tier-presentation-keepalived-backup   "sh -c 'rm -f /run/k…"   presentation-keepalived-backup   5 hours ago   Up 5 hours              
# distributed-three-tier-presentation-keepalived-master-1   distributed-three-tier-presentation-keepalived-master   "sh -c 'rm -f /run/k…"   presentation-keepalived-master   5 hours ago   Up 5 hours              
# distributed-three-tier-presentation-lb-backup-1           haproxy:3.2-alpine                                      "docker-entrypoint.s…"   presentation-lb-backup           5 hours ago   Up 5 hours              
# distributed-three-tier-presentation-lb-master-1           haproxy:3.2-alpine                                      "docker-entrypoint.s…"   presentation-lb-master           5 hours ago   Up 5 hours              
# distributed-three-tier-redis-1                            redis:7-alpine                                          "docker-entrypoint.s…"   redis                            5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-redis-sentinel1-1                  redis:7-alpine                                          "docker-entrypoint.s…"   redis-sentinel1                  5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-redis-sentinel2-1                  redis:7-alpine                                          "docker-entrypoint.s…"   redis-sentinel2                  5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-redis-sentinel3-1                  redis:7-alpine                                          "docker-entrypoint.s…"   redis-sentinel3                  5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-redis2-1                           redis:7-alpine                                          "docker-entrypoint.s…"   redis2                           5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-redis3-1                           redis:7-alpine                                          "docker-entrypoint.s…"   redis3                           5 hours ago   Up 5 hours (healthy)     6379/tcp
# distributed-three-tier-web1-1                             nginx:alpine                                            "/docker-entrypoint.…"   web1                             5 hours ago   Up 5 hours               80/tcp
# distributed-three-tier-web2-1                             nginx:alpine                                            "/docker-entrypoint.…"   web2                             5 hours ago   Up 5 hours               80/tcp
# distributed-three-tier-web3-1                             nginx:alpine                                            "/docker-entrypoint.…"   web3                             5 hours ago   Up 5 hours               80/tcp
```

```bash
curl -s http://localhost/api/health
# {"status":"ok","cache":"available"}
```

```bash
for i in 1 2 3; do curl -sI http://localhost/api/health | grep -i x-request-trace; done
# x-request-trace: presentation-lb-master -> webnode2 -> application-lb-master -> app2
# x-request-trace: presentation-lb-master -> webnode3 -> application-lb-master -> app3
# x-request-trace: presentation-lb-master -> webnode1 -> application-lb-master -> app1
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-galera1-1 mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" \
  -e "SHOW STATUS LIKE 'wsrep_cluster_size'; SHOW STATUS LIKE 'wsrep_local_state_comment';"

# Variable_name   Value
# wsrep_cluster_size      3
# Variable_name   Value
# wsrep_local_state_comment       Synced
```

```bash
set -a; . ./.env; set +a
docker exec distributed-three-tier-mongodb-1 mongosh -u "$MONGO_ROOT_USERNAME" \
  -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin --quiet \
  --eval 'rs.status().members.map(m=>m.name+" "+m.stateStr).join("\n")'

# mongodb:27017 PRIMARY
# mongodb2:27017 SECONDARY
# mongodb3:27017 SECONDARY
```

```bash
docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel ckquorum catalog-cache
# OK 3 usable Sentinels. Quorum and failover authorization can be reached

docker exec distributed-three-tier-redis-sentinel1-1 redis-cli -p 26379 sentinel master catalog-cache
# name
# catalog-cache
# ip
# redis
# port
# 6379
# runid
# 317d3497f672b08688907ecd5ade6d5299b1064e
# flags
# master
# link-pending-commands
# 0
# link-refcount
# 1
# last-ping-sent
# 0
# last-ok-ping-reply
# 832
# last-ping-reply
# 832
# down-after-milliseconds
# 5000
# info-refresh
# 9544
# role-reported
# master
# role-reported-time
# 18053336
# config-epoch
# 0
# num-slaves
# 2
# num-other-sentinels
# 2
# quorum
# 2
# failover-timeout
# 30000
# parallel-syncs
# 1

docker exec distributed-three-tier-redis-1 redis-cli info replication | grep -E '^role'
# role:master
```

```bash
docker exec distributed-three-tier-presentation-keepalived-master-1 ip -4 -o addr show | grep 172.30.0.250 || echo "VIP de presentación NO está en el master"
# 2: eth0    inet 172.30.0.250/24 scope global secondary eth0\       valid_lft forever preferred_lft forever

docker exec distributed-three-tier-application-keepalived-master-1 ip -4 -o addr show | grep 172.31.0.250 || echo "VIP de aplicación NO está en el master"
# 2: eth0    inet 172.31.0.250/24 scope global secondary eth0\       valid_lft forever preferred_lft forever
```
