#!/usr/bin/env bash
set -euo pipefail

# Isolated SQL regression test. No application env, ports, network or real data.
test_backend_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_container="astralink-sprint1-security-$$"
test_image="postgres:17-alpine"

cleanup() {
  docker rm --force "$test_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

docker image inspect "$test_image" >/dev/null
docker run --detach --rm --network none --name "$test_container" \
  --env POSTGRES_HOST_AUTH_METHOD=trust "$test_image" >/dev/null
ready=false
for attempt in {1..30}; do
  if docker exec "$test_container" sh -c 'test "$(cat /proc/1/comm)" = postgres && pg_isready --username postgres' >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [[ "$ready" != true ]]; then
  docker logs "$test_container"
  exit 1
fi

run_sql() {
  docker exec --interactive "$test_container" psql --no-psqlrc --quiet \
    --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$1"
}

run_sql "$test_backend_dir/test/sprint1-security-fixture.sql"
for replay in 1 2; do
  run_sql "$test_backend_dir/prisma/migrations/20261013000000_sprint1_access_hardening/migration.sql"
  run_sql "$test_backend_dir/prisma/migrations/20261013000100_sprint1_message_permissions/migration.sql"
  run_sql "$test_backend_dir/../supabase/migrations/20261013000200_sprint1_storage_permissions.sql"
done
run_sql "$test_backend_dir/test/sprint1-security-migrations.sql"
