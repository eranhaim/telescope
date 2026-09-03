#!/usr/bin/env bash
#
# Deploy telescope to production.
#
# Runs from this machine but uploads nothing: the server pulls from origin/main,
# so what runs in production is always an exact pushed commit. The server's .env
# is never read, written, or overwritten - it holds the production secrets and
# this repo's .env holds local ones.
#
# Usage:
#   ./deploy/deploy.sh            rebuild and restart backend, frontend, bot
#   ./deploy/deploy.sh backend    rebuild and restart one service only
#
# The server is read from deploy/deploy.env, which is gitignored. Copy
# deploy.env.example to deploy.env and fill it in once.

set -euo pipefail

die() { printf '\ndeploy failed: %s\n' "$*" >&2; exit 1; }

# Host and key are deliberately not in this file - it is committed, and the
# repo is on GitHub. deploy.env holds them, or the environment does.
CONFIG="$(cd "$(dirname "$0")" && pwd)/deploy.env"
# shellcheck source=/dev/null
[ -f "$CONFIG" ] && . "$CONFIG"

HOST="${TELESCOPE_HOST:-}"
KEY="${TELESCOPE_KEY:-}"
REMOTE_DIR="${TELESCOPE_DIR:-/home/ubuntu/telescope}"
BRANCH=main
SERVICE="${1:-}"

[ -n "$HOST" ] || die "TELESCOPE_HOST is not set - copy deploy.env.example to deploy.env and fill it in"
[ -n "$KEY" ] || die "TELESCOPE_KEY is not set - copy deploy.env.example to deploy.env and fill it in"

case "$SERVICE" in
  ""|backend|frontend|bot) ;;
  *) die "unknown service '$SERVICE' (expected backend, frontend, or bot)" ;;
esac

# --- preflight: the server can only pull what has actually been pushed --------

[ -f "$KEY" ] || die "ssh key not found: $KEY"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "not inside a git repository"

current_branch=$(git branch --show-current)
[ "$current_branch" = "$BRANCH" ] || die "on branch '$current_branch', deploy expects '$BRANCH'"

git diff-index --quiet HEAD -- || die "uncommitted changes - commit and push before deploying"

git fetch --quiet origin "$BRANCH"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ] \
  || die "HEAD does not match origin/$BRANCH - push before deploying"

echo "deploying $(git rev-parse --short HEAD) to $HOST${SERVICE:+ (service: $SERVICE)}"

# --- remote ------------------------------------------------------------------

ssh -i "$KEY" -o StrictHostKeyChecking=accept-new "$HOST" \
  REMOTE_DIR="$REMOTE_DIR" BRANCH="$BRANCH" SERVICE="$SERVICE" bash -s <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"

previous=$(git rev-parse --short HEAD)

# --ff-only so a dirty or diverged server tree stops the deploy loudly instead
# of having its state silently discarded.
git fetch --quiet origin "$BRANCH"
git pull --ff-only --quiet origin "$BRANCH"
deployed=$(git rev-parse --short HEAD)

if [ "$previous" = "$deployed" ]; then
  echo "already at $deployed, rebuilding anyway"
else
  echo "$previous -> $deployed"
  git --no-pager log --oneline "$previous..$deployed"
fi

# Unquoted on purpose: empty $SERVICE means every service in the compose file.
# Scoped to this compose project - the box runs other unrelated stacks.
docker compose build $SERVICE
docker compose up -d $SERVICE

# nginx resolves the backend container IP at startup. Refresh it whenever a
# backend-only deployment recreates that container.
if [ "$SERVICE" = "backend" ]; then
  docker compose restart frontend
fi

docker compose ps

# The health route is served through the frontend nginx container, so a 200
# proves nginx -> backend -> mongo came back up, not just that a process started.
for _ in $(seq 1 15); do
  code=$(curl -fsS -o /dev/null -w '%{http_code}' http://localhost:8080/api/health 2>/dev/null || true)
  if [ "$code" = "200" ]; then
    echo "health check: 200 - deployed $deployed"
    exit 0
  fi
  sleep 2
done

echo "health check failed after 30s (last response: ${code:-none})" >&2
docker compose logs --tail 40 backend >&2
echo "roll back with: cd $REMOTE_DIR && git reset --hard $previous && docker compose up -d --build" >&2
exit 1
REMOTE
