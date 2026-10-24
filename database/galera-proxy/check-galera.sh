#!/bin/sh
set -eu
# HAProxy provides the target as arguments 3/4. Never put passwords on argv.
export MYSQL_PWD="${DB_PASSWORD:?Set DB_PASSWORD}"
status=$(timeout 4 mariadb --protocol=TCP --connect-timeout=2 \
    --host="$3" --port="$4" --user="${DB_USER:?Set DB_USER}" \
    --batch --skip-column-names --execute="SHOW GLOBAL STATUS WHERE Variable_name IN ('wsrep_cluster_status','wsrep_connected','wsrep_ready','wsrep_local_state'); SELECT @@GLOBAL.read_only, @@GLOBAL.wsrep_on, @@GLOBAL.wsrep_desync;") || exit 1
printf '%s\n' "$status" | awk '
    $1 == "wsrep_cluster_status" && $2 == "Primary" { primary = 1 }
    $1 == "wsrep_connected" && $2 == "ON" { connected = 1 }
    $1 == "wsrep_ready" && $2 == "ON" { ready = 1 }
    $1 == "wsrep_local_state" && $2 == "4" { synced = 1 }
    $1 == "0" && $2 == "1" && $3 == "0" { writable = 1 }
    END { exit !(primary && connected && ready && synced && writable) }
'
