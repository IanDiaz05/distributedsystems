FROM haproxy:3.2-alpine

USER root
RUN apk add --no-cache mariadb-client
COPY haproxy.cfg /usr/local/etc/haproxy/haproxy.cfg
COPY check-galera.sh /usr/local/bin/check-galera.sh
RUN chmod 0755 /usr/local/bin/check-galera.sh
USER haproxy
