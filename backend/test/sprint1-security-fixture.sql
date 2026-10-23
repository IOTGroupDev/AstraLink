-- TEST FIXTURE ONLY. Run exclusively in the disposable local PostgreSQL
-- container created by sprint1-security-migrations.sh. Never run on Supabase.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA storage;
CREATE SCHEMA test_support;
GRANT USAGE ON SCHEMA public, auth, storage, test_support TO anon, authenticated, service_role;

CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object('sub', auth.uid(), 'role', auth.role());
$$;

-- Mirror the existing permissive defaults so revocation tests are meaningful.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO PUBLIC, anon, authenticated, service_role;

CREATE TABLE public.ai_content_cache (id int PRIMARY KEY, content text);
CREATE TABLE public.compatibility_reports (id int PRIMARY KEY, content text);
CREATE TABLE public."User" (id int PRIMARY KEY);
CREATE TABLE public."Chart" (id int PRIMARY KEY);
CREATE TABLE public."Connection" (id int PRIMARY KEY);
CREATE TABLE public."DatingMatch" (id int PRIMARY KEY);
CREATE TABLE public.users (id uuid PRIMARY KEY, role text DEFAULT 'user');
CREATE TABLE public.matches (id uuid PRIMARY KEY, user_a uuid, user_b uuid, status text);
CREATE TABLE public.user_blocks (user_id uuid, blocked_user_id uuid);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_id uuid,
  sender_id uuid,
  recipient_id uuid,
  content text,
  type text DEFAULT 'text',
  read_at timestamptz,
  attachment_path text
);
CREATE TABLE storage.objects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket_id text NOT NULL,
  name text NOT NULL,
  owner uuid,
  UNIQUE (bucket_id, name)
);
GRANT ALL ON ALL TABLES IN SCHEMA public, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
REVOKE ALL ON public.user_blocks FROM PUBLIC, anon, authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users: read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users: own update" ON public.users FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches: participants read" ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() IN (user_a, user_b));
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages: sender can insert for own match" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages: participants read" ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() IN (sender_id, recipient_id));
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE bucket text;
BEGIN
  FOREACH bucket IN ARRAY ARRAY['user-photos', 'chat-media'] LOOP
    EXECUTE format('CREATE POLICY %I ON storage.objects FOR ALL TO authenticated USING (bucket_id = %L AND (owner = auth.uid() OR split_part(name, ''/'', 1) = auth.uid()::text)) WITH CHECK (bucket_id = %L AND (owner = auth.uid() OR split_part(name, ''/'', 1) = auth.uid()::text))', bucket || ': owners can read', bucket, bucket);
  END LOOP;
END;
$$;

CREATE FUNCTION public.send_message(uuid, text, text) RETURNS text LANGUAGE sql AS $$ SELECT 'fixture'; $$;
CREATE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END; $$;
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text), public.handle_new_user() TO anon, authenticated, service_role;

CREATE FUNCTION test_support.assert_true(value boolean, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %', label; END IF;
END;
$$;
CREATE FUNCTION test_support.expect_denied(command text, label text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE command;
  EXCEPTION WHEN insufficient_privilege THEN RETURN;
  END;
  RAISE EXCEPTION 'FAILED: % (expected SQLSTATE 42501)', label;
END;
$$;

INSERT INTO public.ai_content_cache VALUES (1, 'server-cache');
INSERT INTO public.compatibility_reports VALUES (1, 'server-report');
INSERT INTO public."User" VALUES (1);
INSERT INTO public."Chart" VALUES (1);
INSERT INTO public."Connection" VALUES (1);
INSERT INTO public."DatingMatch" VALUES (1);
INSERT INTO public.users (id) VALUES
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'),
  ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.matches VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'inactive'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', 'active'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'active');
-- Deliberately forged owner: ownership alone must not expose a foreign prefix.
INSERT INTO storage.objects (bucket_id, name, owner) VALUES
  ('user-photos', '22222222-2222-4222-8222-222222222222/foreign.jpg', '11111111-1111-4111-8111-111111111111'),
  ('chat-media', '22222222-2222-4222-8222-222222222222/foreign.jpg', '11111111-1111-4111-8111-111111111111');
