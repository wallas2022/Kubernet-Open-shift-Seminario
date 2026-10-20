#!/bin/sh
set -eu
# Only a DNS hostname and numeric port may enter the Nginx configuration.
if ! printf '%s' "$API_UPSTREAM" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9.-]*:[0-9]{1,5}$'; then
  echo 'Invalid API upstream configuration' >&2
  exit 1
fi
port=${API_UPSTREAM##*:}
if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
  echo 'Invalid API upstream port' >&2
  exit 1
fi
umask 077
sed "s|__API_UPSTREAM__|$API_UPSTREAM|g" /etc/nginx/seminario.conf > /tmp/frontend-nginx.conf
exec nginx -c /tmp/frontend-nginx.conf -g 'daemon off;'
