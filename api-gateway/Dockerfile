FROM nginx:1.27-alpine

RUN apk add --no-cache openssl

# Templates in /etc/nginx/templates are rendered with envsubst at container start
# (only variables that exist in the environment are substituted, so nginx's own
#  $variables are left untouched) and written to /etc/nginx/conf.d.
COPY templates /etc/nginx/templates
COPY snippets /etc/nginx/snippets
COPY docker-entrypoint.d /docker-entrypoint.d

RUN chmod +x /docker-entrypoint.d/*.sh && \
    mkdir -p /var/cache/nginx/events /etc/nginx/certs

EXPOSE 80 443 9090
