#!/bin/sh
set -eu
if [ ! -s /data/sentinel.conf ]; then
    cat > /data/sentinel.conf <<EOF
bind 0.0.0.0
protected-mode no
port 26379
sentinel resolve-hostnames yes
sentinel announce-hostnames yes
sentinel announce-ip ${REDIS_SENTINEL_HOST:?Set REDIS_SENTINEL_HOST}
sentinel monitor catalog-cache redis 6379 2
sentinel down-after-milliseconds catalog-cache 5000
sentinel failover-timeout catalog-cache 30000
sentinel parallel-syncs catalog-cache 1
EOF
fi
exec redis-server /data/sentinel.conf --sentinel
