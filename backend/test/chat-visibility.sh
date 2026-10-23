#!/usr/bin/env bash
set -euo pipefail
test_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
test_container="astralink-chat-visibility-$$"
trap 'docker rm --force "$test_container" >/dev/null 2>&1 || true' EXIT
docker run --detach --rm --network none --name "$test_container" --env POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in {1..30}; do
  if docker exec "$test_container" pg_isready --username postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
run_sql() { docker exec --interactive "$test_container" psql --no-psqlrc --quiet --username postgres --set ON_ERROR_STOP=1; }
run_sql <<'SQL'
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE TABLE public.users(id uuid PRIMARY KEY);
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
SQL
for replay in 1 2; do
  run_sql < "$test_root/supabase/migrations/20261022203008_persist_chat_visibility.sql"
  run_sql < "$test_root/supabase/migrations/20261022205031_persist_birth_time_known.sql"
  run_sql < "$test_root/supabase/migrations/20261023084057_persist_birth_location.sql"
done
run_sql <<'SQL'
INSERT INTO auth.users VALUES ('11111111-1111-4111-8111-111111111111');
SET ROLE service_role;
INSERT INTO public.chat_hidden_messages(user_id, message_id) VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
RESET ROLE;
DO $$ BEGIN
 IF has_table_privilege('anon', 'public.chat_hidden_messages', 'SELECT') OR has_table_privilege('authenticated', 'public.chat_hidden_conversations', 'INSERT') THEN RAISE EXCEPTION 'Client privilege leaked'; END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.chat_hidden_messages'::regclass) THEN RAISE EXCEPTION 'RLS missing'; END IF;
END $$;
DELETE FROM auth.users;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.chat_hidden_messages) THEN RAISE EXCEPTION 'Deletion cascade failed'; END IF;
END $$;
SQL
echo 'Chat visibility checks passed: idempotency, server-only access, RLS, deletion cascade.'
