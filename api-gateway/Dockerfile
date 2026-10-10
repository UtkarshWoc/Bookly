FROM nginx:1.27-alpine

# Templates in /etc/nginx/templates are rendered with envsubst at container start
# (only variables that exist in the environment are substituted, so nginx's own
#  $variables are left untouched) and written to /etc/nginx/conf.d.
COPY templates /etc/nginx/templates
COPY snippets /etc/nginx/snippets

RUN mkdir -p /var/cache/nginx/events

EXPOSE 80 9090
