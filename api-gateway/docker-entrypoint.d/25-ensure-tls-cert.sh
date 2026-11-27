#!/bin/sh
set -e

CERT_PATH="${TLS_CERT_PATH:-/etc/nginx/certs/tls.crt}"
KEY_PATH="${TLS_KEY_PATH:-/etc/nginx/certs/tls.key}"

if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
  mkdir -p "$(dirname "$CERT_PATH")" "$(dirname "$KEY_PATH")"
  echo "Generating self-signed development TLS certificate at $CERT_PATH"
  openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
    -keyout "$KEY_PATH" \
    -out "$CERT_PATH" \
    -subj "/CN=localhost/O=Bookly" \
    -addext "subjectAltName=DNS:localhost,DNS:api-gateway,IP:127.0.0.1" >/dev/null 2>&1
  chmod 600 "$KEY_PATH"
fi
