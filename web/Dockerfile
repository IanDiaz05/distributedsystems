FROM nginxinc/nginx-unprivileged:1.27-alpine

ENV API_UPSTREAM=http://api:8080/
ENV NGINX_ENVSUBST_FILTER=API_UPSTREAM

COPY --chown=nginx:nginx site1/ /usr/share/nginx/html/
COPY --chown=nginx:nginx catalog.js catalog.css /usr/share/nginx/
COPY --chown=nginx:nginx nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 8080
