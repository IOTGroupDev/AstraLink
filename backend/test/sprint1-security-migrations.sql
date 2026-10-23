-- TEST ASSERTIONS ONLY. Requires sprint1-security-fixture.sql and all three
-- 20261013 Sprint 1 migrations in an isolated disposable PostgreSQL database.
-- This file is not a production migration and contains fake identities only.
CREATE TABLE public.future_security_test (id bigserial PRIMARY KEY, content text);

DO $$
DECLARE target text; action text; client_role text;
BEGIN
  FOREACH target IN ARRAY ARRAY['ai_content_cache', 'compatibility_reports', 'User', 'Chart', 'Connection', 'DatingMatch', 'future_security_test'] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      FOREACH action IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
        PERFORM test_support.assert_true(NOT has_table_privilege(client_role, format('public.%I', target), action), client_role || ' cannot ' || action || ' ' || target);
      END LOOP;
    END LOOP;
    FOREACH action IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      PERFORM test_support.assert_true(has_table_privilege('service_role', format('public.%I', target), action), 'service_role ' || action || ' preserved: ' || target);
    END LOOP;
  END LOOP;
  FOREACH client_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH action IN ARRAY ARRAY['SELECT', 'USAGE', 'UPDATE'] LOOP
      PERFORM test_support.assert_true(NOT has_sequence_privilege(client_role, 'public.future_security_test_id_seq', action), client_role || ' future sequence ' || action || ' denied');
    END LOOP;
    FOREACH action IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE'] LOOP
      PERFORM test_support.assert_true(NOT has_table_privilege(client_role, 'public.users', action), client_role || ' users ' || action || ' denied');
    END LOOP;
  END LOOP;
  PERFORM test_support.assert_true(has_sequence_privilege('service_role', 'public.future_security_test_id_seq', 'USAGE'), 'future server sequence preserved');
  PERFORM test_support.assert_true(NOT has_function_privilege('authenticated', 'public.send_message(uuid,text,text)', 'EXECUTE'), 'broken RPC denied');
  PERFORM test_support.assert_true(NOT has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'), 'trigger RPC denied');
  PERFORM test_support.assert_true(NOT has_function_privilege('anon', 'public.can_send_message_to(uuid)', 'EXECUTE'), 'anonymous block helper denied');
  PERFORM test_support.assert_true(has_function_privilege('authenticated', 'public.can_send_message_to(uuid)', 'EXECUTE'), 'authenticated block helper available');
  PERFORM test_support.assert_true((SELECT prosecdef FROM pg_proc WHERE oid = 'public.can_send_message_to(uuid)'::regprocedure), 'block helper is SECURITY DEFINER');
  PERFORM test_support.assert_true((SELECT count(*) = 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND cmd = 'INSERT'), 'replay leaves one message insert policy');
  PERFORM test_support.assert_true((SELECT count(*) = 8 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'), 'replay leaves eight storage policies');
END;
$$;

SET ROLE anon;
DO $$
BEGIN
  PERFORM test_support.expect_denied('SELECT * FROM public.ai_content_cache', 'anonymous cache access');
  PERFORM test_support.expect_denied('SELECT * FROM public.compatibility_reports', 'anonymous report access');
  PERFORM test_support.expect_denied('INSERT INTO public.future_security_test (content) VALUES (''client'')', 'anonymous future table insert');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'anonymous')$q$, 'anonymous message insert');
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
SELECT set_config('request.jwt.claim.role', 'authenticated', false);
SET ROLE authenticated;
DO $$
DECLARE suffix text; bucket text;
BEGIN
  PERFORM test_support.expect_denied('SELECT * FROM public.ai_content_cache', 'authenticated cache access');
  PERFORM test_support.expect_denied('SELECT * FROM public.compatibility_reports', 'authenticated report access');
  PERFORM test_support.expect_denied('UPDATE public.ai_content_cache SET content = ''client''', 'authenticated cache write');
  PERFORM test_support.expect_denied('UPDATE public.users SET role = ''admin'' WHERE id = auth.uid()', 'own role escalation');
  PERFORM test_support.expect_denied('SELECT nextval(''public.future_security_test_id_seq'')', 'authenticated future sequence usage');
  PERFORM test_support.expect_denied('SELECT * FROM public.user_blocks', 'private block table access');
  PERFORM test_support.assert_true(public.can_send_message_to('22222222-2222-4222-8222-222222222222'), 'unblocked existing recipient allowed');
  PERFORM test_support.assert_true(NOT public.can_send_message_to(auth.uid()), 'self recipient denied');
  PERFORM test_support.assert_true(NOT public.can_send_message_to('44444444-4444-4444-8444-444444444444'), 'missing recipient denied');

  INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'valid text');
  INSERT INTO public.messages (match_id, sender_id, recipient_id, type, attachment_path) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'image', auth.uid()::text || '/own.jpg'),
    ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', auth.uid(), '22222222-2222-4222-8222-222222222222', 'image', 'chat-media:' || auth.uid()::text || '/canonical.jpg');

  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', auth.uid(), '22222222-2222-4222-8222-222222222222', 'inactive')$q$, 'inactive match');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', auth.uid(), '22222222-2222-4222-8222-222222222222', 'foreign match')$q$, 'foreign match');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content, type) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'system', 'system')$q$, 'system message injection');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content, read_at) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'forged read', now())$q$, 'forged read_at');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '22222222-2222-4222-8222-222222222222', auth.uid(), 'forged sender')$q$, 'foreign sender');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '33333333-3333-4333-8333-333333333333', 'wrong recipient')$q$, 'recipient outside match');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', '   ')$q$, 'empty message');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, type, attachment_path) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'image', '22222222-2222-4222-8222-222222222222/foreign.jpg')$q$, 'foreign attachment');

  FOREACH suffix IN ARRAY ARRAY['../foreign.jpg', './foreign.jpg', '%2e%2e/foreign.jpg', E'folder\\foreign.jpg'] LOOP
    PERFORM test_support.expect_denied(format('INSERT INTO public.messages (match_id, sender_id, recipient_id, type, attachment_path) VALUES (''aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'', auth.uid(), ''22222222-2222-4222-8222-222222222222'', ''image'', %L)', auth.uid()::text || '/' || suffix), 'invalid attachment ' || suffix);
  END LOOP;

  FOREACH bucket IN ARRAY ARRAY['user-photos', 'chat-media'] LOOP
    INSERT INTO storage.objects (bucket_id, name, owner) VALUES (bucket, auth.uid()::text || '/own.jpg', auth.uid());
    PERFORM test_support.assert_true((SELECT count(*) = 1 FROM storage.objects WHERE bucket_id = bucket), 'only own prefix visible: ' || bucket);
    PERFORM test_support.expect_denied(format('INSERT INTO storage.objects (bucket_id, name, owner) VALUES (%L, ''22222222-2222-4222-8222-222222222222/forged.jpg'', auth.uid())', bucket), 'foreign prefix insert with forged owner: ' || bucket);
    PERFORM test_support.expect_denied(format('UPDATE storage.objects SET name = ''22222222-2222-4222-8222-222222222222/moved.jpg'' WHERE bucket_id = %L AND name = auth.uid()::text || ''/own.jpg''', bucket), 'own object rename into foreign prefix: ' || bucket);
    FOREACH suffix IN ARRAY ARRAY['../foreign.jpg', './foreign.jpg', '%2e%2e/foreign.jpg', E'folder\\foreign.jpg'] LOOP
      PERFORM test_support.expect_denied(format('INSERT INTO storage.objects (bucket_id, name, owner) VALUES (%L, %L, auth.uid())', bucket, auth.uid()::text || '/' || suffix), 'invalid storage path ' || bucket || '/' || suffix);
    END LOOP;
    UPDATE storage.objects SET name = auth.uid()::text || '/renamed.jpg' WHERE bucket_id = bucket AND name = auth.uid()::text || '/own.jpg';
    PERFORM test_support.assert_true(FOUND, 'own object update: ' || bucket);
    UPDATE storage.objects SET name = auth.uid()::text || '/stolen.jpg' WHERE bucket_id = bucket AND name LIKE '22222222-%';
    PERFORM test_support.assert_true(NOT FOUND, 'foreign object hidden from update: ' || bucket);
    DELETE FROM storage.objects WHERE bucket_id = bucket AND name LIKE '22222222-%';
    PERFORM test_support.assert_true(NOT FOUND, 'foreign object hidden from delete: ' || bucket);
    DELETE FROM storage.objects WHERE bucket_id = bucket AND name = auth.uid()::text || '/renamed.jpg';
    PERFORM test_support.assert_true(FOUND, 'own object delete: ' || bucket);
  END LOOP;
END;
$$;
RESET ROLE;

-- Incoming and outgoing blocks must work while user_blocks remains private.
INSERT INTO public.user_blocks VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM test_support.assert_true(NOT public.can_send_message_to('22222222-2222-4222-8222-222222222222'), 'incoming block helper');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'incoming block')$q$, 'incoming block message');
END; $$;
RESET ROLE;
DELETE FROM public.user_blocks;
INSERT INTO public.user_blocks VALUES ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222');
SET ROLE authenticated;
DO $$ BEGIN
  PERFORM test_support.assert_true(NOT public.can_send_message_to('22222222-2222-4222-8222-222222222222'), 'outgoing block helper');
  PERFORM test_support.expect_denied($q$INSERT INTO public.messages (match_id, sender_id, recipient_id, content) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', auth.uid(), '22222222-2222-4222-8222-222222222222', 'outgoing block')$q$, 'outgoing block message');
END; $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.role', 'service_role', false);
SET ROLE service_role;
DO $$ BEGIN
  PERFORM test_support.assert_true((SELECT content = 'server-cache' FROM public.ai_content_cache WHERE id = 1), 'cache content preserved');
  PERFORM test_support.assert_true((SELECT content = 'server-report' FROM public.compatibility_reports WHERE id = 1), 'report content preserved');
  UPDATE public.ai_content_cache SET content = 'server-updated' WHERE id = 1;
  UPDATE public.compatibility_reports SET content = 'server-updated' WHERE id = 1;
  INSERT INTO public.future_security_test (content) VALUES ('server');
  PERFORM test_support.assert_true((SELECT count(*) = 3 FROM public.messages), 'only valid direct messages inserted');
  INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('chat-media', '22222222-2222-4222-8222-222222222222/server.jpg', auth.uid());
  PERFORM test_support.assert_true((SELECT count(*) = 3 FROM storage.objects), 'service retains storage access and foreign originals preserved');
  PERFORM test_support.assert_true((SELECT role = 'user' FROM public.users WHERE id = auth.uid()), 'role escalation denied without mutation');
END; $$;
RESET ROLE;
SELECT 'PASS: all three migrations applied twice; access, direct messages, blocks, storage and server paths verified' AS result;
