#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${TELESCOPE_DIR:-/home/ubuntu/telescope}"
ENV_FILE="${TELESCOPE_ENV:-$APP_DIR/.env}"
BACKUP_DIR="${TELESCOPE_BACKUP_DIR:-/home/ubuntu/telescope-backups}"
DATABASE="${MONGODB_DATABASE:-test}"
KEEP="${TELESCOPE_BACKUPS_TO_KEEP:-30}"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

exec 9>"$BACKUP_DIR/.backup.lock"
flock -n 9 || {
  echo "backup already running"
  exit 0
}

set -a
# Production .env currently has Windows line endings.
# shellcheck disable=SC1090
source <(tr -d '\r' < "$ENV_FILE")
set +a

: "${MONGODB_URI:?MONGODB_URI is missing from $ENV_FILE}"

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
name="telescope-${DATABASE}-${timestamp}.archive.gz"
partial="$BACKUP_DIR/$name.partial"
final="$BACKUP_DIR/$name"

cleanup() {
  rm -f "$partial"
}
trap cleanup EXIT

export MONGODB_URI DATABASE name
docker run --rm \
  --user "$(id -u):$(id -g)" \
  --env MONGODB_URI \
  --env DATABASE \
  --env name \
  --volume "$BACKUP_DIR:/backup" \
  mongo:7 sh -c \
  'mongodump --uri="$MONGODB_URI" --db="$DATABASE" --archive="/backup/$name.partial" --gzip --quiet'

gzip -t "$partial"
mv "$partial" "$final"
chmod 600 "$final"
sha256sum "$final" > "$final.sha256"
chmod 600 "$final.sha256"

shopt -s nullglob
backups=("$BACKUP_DIR"/telescope-"$DATABASE"-*.archive.gz)
if (( ${#backups[@]} > KEEP )); then
  remove_count=$(( ${#backups[@]} - KEEP ))
  for ((i = 0; i < remove_count; i++)); do
    rm -f "${backups[$i]}" "${backups[$i]}.sha256"
  done
fi

echo "backup complete: $final"
