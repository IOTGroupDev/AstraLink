-- AstraLink: READ ONLY Supabase audit, 2026-10-13.
-- No user records, actual UUIDs, emails, message text, tokens or object paths.
-- Catalog grants require an auditor/admin DB connection. No RPC is invoked.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SELECT now() AS observed_at, current_database(), current_setting('TimeZone');

SELECT c.relname,c.relkind,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
 has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select,
 has_table_privilege('authenticated',c.oid,'INSERT') AS auth_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') AS auth_update,
 has_table_privilege('authenticated',c.oid,'DELETE') AS auth_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','v') ORDER BY c.relname;

SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check
FROM pg_policies WHERE schemaname IN ('public','storage')
ORDER BY schemaname,tablename,cmd,policyname;

SELECT pg_get_userbyid(defaclrole) AS owner,n.nspname,defaclobjtype,defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace;

SELECT table_name,column_name,data_type,udt_name,is_nullable
FROM information_schema.columns WHERE table_schema='public'
ORDER BY table_name,ordinal_position;

SELECT c.relname,co.conname,co.contype,pg_get_constraintdef(co.oid) AS definition
FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' ORDER BY c.relname,co.conname;

SELECT tablename,indexname,indexdef FROM pg_indexes
WHERE schemaname='public' ORDER BY tablename,indexname;

SELECT migration_name,checksum,finished_at,rolled_back_at,applied_steps_count
FROM public._prisma_migrations ORDER BY started_at;
SELECT version,name FROM supabase_migrations.schema_migrations ORDER BY version;

SELECT p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
 p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute,
 has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' ORDER BY p.proname,p.oid;

SELECT n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT t.tgisinternal AND n.nspname IN ('public','auth')
ORDER BY n.nspname,c.relname,t.tgname;

SELECT pubname,puballtables FROM pg_publication ORDER BY pubname;
SELECT pubname,schemaname,tablename FROM pg_publication_tables
ORDER BY pubname,schemaname,tablename;
SELECT jobname,schedule,active,username FROM cron.job;
SELECT status,count(*) AS runs,min(start_time),max(start_time)
FROM cron.job_run_details GROUP BY status;

SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets;
SELECT bucket_id,count(*) AS objects,
 count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM auth.users a
 WHERE a.id::text=split_part(o.name,'/',1))) AS prefix_missing_auth,
 count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM public.users u
 WHERE u.id::text=split_part(o.name,'/',1))) AS prefix_missing_public
FROM storage.objects o GROUP BY bucket_id;
SELECT count(*) AS unreferenced_photos FROM storage.objects o
WHERE o.bucket_id='user-photos'
AND NOT EXISTS(SELECT 1 FROM public.user_photos p WHERE p.storage_path=o.name);

SELECT
 (SELECT count(*) FROM auth.users) AS auth_users,
 (SELECT count(*) FROM public.users) AS public_users,
 (SELECT count(*) FROM auth.users a WHERE NOT EXISTS
  (SELECT 1 FROM public.users u WHERE u.id=a.id)) AS auth_without_public,
 (SELECT count(*) FROM public.users u WHERE NOT EXISTS
  (SELECT 1 FROM auth.users a WHERE a.id=u.id)) AS public_without_auth,
 (SELECT count(*) FROM public.user_profiles p JOIN public.users u ON u.id=p.user_id
  WHERE p.is_onboarded IS DISTINCT FROM u.onboarding_completed) AS onboarding_mismatches,
 (SELECT count(*) FROM public.ai_content_cache a WHERE NOT EXISTS
  (SELECT 1 FROM public.users u WHERE u.id::text=a.user_id)) AS orphan_cache;

SELECT count(*) AS users,
 count(*) FILTER(WHERE birth_date IS NOT NULL OR birth_time IS NOT NULL
 OR birth_place IS NOT NULL) AS plaintext_users,
 count(*) FILTER(WHERE (birth_date IS NOT NULL AND birth_date_encrypted IS NULL)
 OR (birth_time IS NOT NULL AND birth_time_encrypted IS NULL)
 OR (birth_place IS NOT NULL AND birth_place_encrypted IS NULL)) AS unbackfilled
FROM public.users;
SELECT count(*) AS charts,
 count(*) FILTER(WHERE data ? 'birthDate') AS birth_date_context,
 count(*) FILTER(WHERE data ? 'birthTime') AS birth_time_context,
 count(*) FILTER(WHERE data ? 'location') AS location_context FROM public.charts;
SELECT content_type,locale,count(*) AS entries,
 count(*) FILTER(WHERE expires_at<now()) AS expired
FROM public.ai_content_cache GROUP BY content_type,locale;
SELECT count(*) AS duplicate_payment_id_groups FROM
 (SELECT stripe_session_id FROM public.payments WHERE stripe_session_id IS NOT NULL
 GROUP BY stripe_session_id HAVING count(*)>1) d;
SELECT count(*) AS compatibility_scores FROM public.compatibility_scores;
ROLLBACK;

-- Fake non-existent subject: counts only, no actual user session or UUID.
BEGIN READ ONLY;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims =
 '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
SELECT current_user,
 (SELECT count(*) FROM public.ai_content_cache) AS cache_visible,
 (SELECT count(*) FROM public.compatibility_reports) AS reports_visible,
 (SELECT count(*) FROM public.users) AS users_visible;
ROLLBACK;
