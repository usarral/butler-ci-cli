#!/usr/bin/env bash
# Local Jenkins for developing butler-ci-cli against a real server (podman).
set -euo pipefail

cd "$(dirname "$0")"

NAME="${BUTLER_DEV_CONTAINER:-butler-jenkins}"
IMAGE="${BUTLER_DEV_IMAGE:-localhost/butler-jenkins-dev}"
VOLUME="${BUTLER_DEV_VOLUME:-butler-jenkins-home}"
PORT="${BUTLER_DEV_PORT:-8088}"
USER_NAME="${BUTLER_DEV_USER:-admin}"
PASSWORD="${BUTLER_DEV_PASSWORD:-admin}"
TOKEN="${BUTLER_DEV_TOKEN:-11aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa}"
URL="http://127.0.0.1:${PORT}"

api() { curl -fsSg -u "${USER_NAME}:${TOKEN}" "$@"; }

wait_ready() {
  printf 'Waiting for Jenkins at %s ' "$URL"
  for _ in $(seq 1 120); do
    if api -o /dev/null "$URL/api/json" 2>/dev/null; then echo "ready"; return 0; fi
    printf '.'; sleep 2
  done
  echo; echo "Jenkins did not become ready; check: $0 logs" >&2
  return 1
}

build() {
  podman build -t "$IMAGE" -f Containerfile .
}

up() {
  podman image exists "$IMAGE" || build
  if podman container exists "$NAME"; then
    podman start "$NAME" >/dev/null
  else
    podman run -d --name "$NAME" \
      -p "127.0.0.1:${PORT}:8080" \
      -v "${VOLUME}:/var/jenkins_home" \
      -e BUTLER_DEV_USER="$USER_NAME" -e BUTLER_DEV_PASSWORD="$PASSWORD" -e BUTLER_DEV_TOKEN="$TOKEN" \
      -e JENKINS_URL_PUBLIC="${URL}/" \
      "$IMAGE" >/dev/null
  fi
  wait_ready
  info
}

trigger() { # trigger <job path> [KEY=VALUE ...]
  local path="$1"; shift
  local job_url="$URL/job/${path//\//\/job\/}"
  if [ "$#" -eq 0 ]; then
    api -X POST -o /dev/null "$job_url/build" 2>/dev/null \
      || api -X POST -o /dev/null "$job_url/buildWithParameters"
  else
    local args=(); for kv in "$@"; do args+=(--data-urlencode "$kv"); done
    api -X POST -o /dev/null "${args[@]}" "$job_url/buildWithParameters"
  fi
  echo "queued: $path $*"
}

# A declarative pipeline only registers its parameters after its first run, so the
# first run uses the defaults and we wait for the definitions before passing values.
bootstrap_params() { # bootstrap_params <job path>
  local path="$1"
  local job_url="$URL/job/${path//\//\/job\/}"
  trigger "$path"
  for _ in $(seq 1 60); do
    if api "$job_url/api/json?tree=property[parameterDefinitions[name]]" | grep -q '"name"'; then return 0; fi
    sleep 1
  done
  echo "parameters of $path were not registered in time" >&2
  return 1
}

seed() {
  trigger hello-world
  for job in parametrized-build flaky team-a/backend/deploy-service; do bootstrap_params "$job"; done
  trigger parametrized-build BRANCH=main ENVIRONMENT=dev RUN_TESTS=true
  trigger parametrized-build BRANCH=release ENVIRONMENT=production RUN_TESTS=false
  trigger flaky OUTCOME=success
  trigger flaky OUTCOME=unstable
  trigger flaky OUTCOME=failure
  trigger team-a/backend/deploy-service SERVICE=billing REGION=eu-west-1
}

info() {
  cat <<INFO

Jenkins:  $URL
User:     $USER_NAME
Password: $PASSWORD
API token (use this one with butler-ci-cli): $TOKEN

Create a butler-ci-cli config pointing at it:
  butler-ci-cli config create     # URL $URL, user $USER_NAME, token above
INFO
}

case "${1:-}" in
  build)  build ;;
  up)     up ;;
  down)   podman rm -f "$NAME" >/dev/null 2>&1 || true; echo "stopped (data kept in volume $VOLUME)" ;;
  reset)  podman rm -f "$NAME" >/dev/null 2>&1 || true; podman volume rm -f "$VOLUME" >/dev/null; echo "removed container and volume" ;;
  seed)   seed ;;
  trigger) shift; trigger "$@" ;;
  logs)   podman logs -f "$NAME" ;;
  info)   info ;;
  *)
    echo "Usage: $0 {build|up|down|reset|seed|trigger <job> [KEY=VALUE...]|logs|info}" >&2
    exit 1 ;;
esac
