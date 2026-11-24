#!/bin/sh
set -e

# Verify that no unexpanded ${VAR} placeholders remain in rendered configs
if grep -E '\$\{[A-Za-z0-9_]+\}' /etc/nginx/conf.d/*.conf >/dev/null 2>&1; then
  echo >&2 "Error: Unresolved template variables found in /etc/nginx/conf.d/:"
  grep -E '\$\{[A-Za-z0-9_]+\}' /etc/nginx/conf.d/*.conf >&2
  exit 1
fi

# Verify nginx config syntax
nginx -t -q || {
  echo >&2 "Error: nginx configuration test failed"
  exit 1
}
