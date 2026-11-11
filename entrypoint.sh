#!/bin/sh
set -eu
PUID=${PUID:-1000}
PGID=${PGID:-1000}
if ! getent group "$PGID" >/dev/null 2>&1; then
  addgroup -g "$PGID" appgroup
fi
if ! getent passwd "$PUID" >/dev/null 2>&1; then
  adduser -S -u "$PUID" -G "$(getent group "$PGID" | cut -d: -f1)" -h /app appuser
fi
mkdir -p /app/data/db /app/data/uploads
chown -R "$PUID:$PGID" /app/data
chmod 700 /app/data /app/data/db
# Never broaden permissions on an existing secret or database.
umask 0077
exec su-exec "$PUID:$PGID" "$@"
