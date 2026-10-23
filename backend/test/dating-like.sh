#!/usr/bin/env bash
set -euo pipefail
test_backend_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
test_container="astralink-dating-like-$$"
cleanup() { docker rm --force "$test_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT INT TERM
docker image inspect postgres:17-alpine >/dev/null
docker run --detach --rm --network none --name "$test_container" \
  --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
ready=false
for attempt in {1..30}; do
  if docker exec "$test_container" pg_isready --username postgres >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
[[ "$ready" == true ]] || { docker logs "$test_container"; exit 1; }
run_sql() {
  docker exec --interactive "$test_container" psql --no-psqlrc --quiet \
    --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$1"
}
run_sql "$test_backend_dir/test/dating-like-fixture.sql"
for replay in 1 2; do
  run_sql "$test_backend_dir/../supabase/migrations/20261022091806_fix_create_like_uuid_and_permissions.sql"
done
run_sql "$test_backend_dir/test/dating-like.sql"
# Two transactions on a fresh pair. B blocks on A's pair lock until A commits.
docker exec "$test_container" psql --no-psqlrc --quiet --username postgres --set ON_ERROR_STOP=1 \
  --command "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333'; SELECT public.create_like('44444444-4444-4444-8444-444444444444','like'); SELECT pg_sleep(1); COMMIT;" >/dev/null &
first_like_pid=$!
docker exec "$test_container" psql --no-psqlrc --quiet --username postgres --set ON_ERROR_STOP=1 \
  --command "SET ROLE authenticated; SET request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444'; SELECT public.create_like('33333333-3333-4333-8333-333333333333','like');" >/dev/null &
second_like_pid=$!
wait "$first_like_pid"
wait "$second_like_pid"
docker exec "$test_container" psql --no-psqlrc --quiet --username postgres --set ON_ERROR_STOP=1 \
  --command "SELECT test_support.assert_true((SELECT count(*) FROM public.matches WHERE user_a = '33333333-3333-4333-8333-333333333333' AND user_b = '44444444-4444-4444-8444-444444444444' AND status = 'active') = 1, 'simultaneous reciprocal likes create one active match');" >/dev/null
echo 'Dating SQL checks passed: validation, identity, blocks, replay, reciprocal and concurrent likes.'
