#!/bin/sh
set -eu
# Keep rewritten topology across restarts, but never persist catalog cache data.
if [ ! -s /data/redis.conf ]; then
    cat > /data/redis.conf <<EOF
bind 0.0.0.0
protected-mode no
port 6379
save ""
appendonly no
maxmemory 128mb
maxmemory-policy allkeys-lru
replica-announce-ip ${REDIS_NODE_HOST:?Set REDIS_NODE_HOST}
replica-announce-port 6379
EOF
    if [ "$REDIS_NODE_HOST" != redis ]; then
        echo 'replicaof redis 6379' >> /data/redis.conf
    fi
fi
exec redis-server /data/redis.conf
