-- AstraLink technical audit, 2026-10-22. Administrative read-only evidence.
-- No user records, tokens, email addresses, ciphertext or object names are returned.
-- Requires catalog and aggregate read privileges. Does not invoke business RPCs.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

-- Catalog, effective grants, policies, functions, buckets and migration metadata.
SELECT jsonb_build_object(
'tables', (SELECT jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'auth_select',has_table_privilege('authenticated',c.oid,'SELECT'),'auth_insert',has_table_privilege('authenticated',c.oid,'INSERT'),'auth_update',has_table_privilege('authenticated',c.oid,'UPDATE'),'auth_delete',has_table_privilege('authenticated',c.oid,'DELETE'),'service_select',has_table_privilege('service_role',c.oid,'SELECT'))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r'),
'functions', (SELECT jsonb_agg(jsonb_build_object('signature',p.oid::regprocedure::text,'definer',p.prosecdef,'auth_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),'config',p.proconfig)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'),
'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p WHERE p.schemaname IN ('public','storage')),
'publication', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_publication_tables p WHERE p.pubname='supabase_realtime'),
'buckets', (SELECT jsonb_agg(jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)) FROM storage.buckets),
'columns', (SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'type',data_type,'udt',udt_name)) FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('users','user_profiles','matches','messages','user_photos','payments','subscriptions','dating_matches')),
'prisma', (SELECT jsonb_agg(jsonb_build_object('name',migration_name,'checksum',checksum,'finished',finished_at IS NOT NULL,'rolled_back',rolled_back_at IS NOT NULL)) FROM public._prisma_migrations),
'column_acl', (SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,'privilege',privilege_type)) FROM information_schema.column_privileges WHERE table_schema='public' AND grantee IN ('anon','authenticated') AND table_name IN ('users','ai_content_cache','compatibility_reports')),
'defaults', (SELECT jsonb_agg(jsonb_build_object('owner',defaclrole::regrole::text,'namespace',defaclnamespace::regnamespace::text,'type',defaclobjtype,'acl',defaclacl::text)) FROM pg_default_acl WHERE defaclnamespace='public'::regnamespace)
) AS audit;

-- Inspect function bodies without executing them.
SELECT p.oid::regprocedure::text AS signature, pg_get_functiondef(p.oid) AS definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('create_like','rank_candidates_nightly','get_candidates_for_me','can_send_message_to');

-- Aggregates and index definitions only; no individual users or payments.
SELECT jsonb_build_object(
'counts',jsonb_build_object('auth_users',(SELECT count(*) FROM auth.users),'users',(SELECT count(*) FROM public.users),'profiles',(SELECT count(*) FROM public.user_profiles),'charts',(SELECT count(*) FROM public.charts),'reports',(SELECT count(*) FROM public.compatibility_reports),'payments',(SELECT count(*) FROM public.payments),'messages',(SELECT count(*) FROM public.messages),'photos',(SELECT count(*) FROM public.user_photos)),
'birth_storage',(SELECT jsonb_build_object('plaintext_any',count(*) FILTER (WHERE birth_date IS NOT NULL OR birth_time IS NOT NULL OR birth_place IS NOT NULL),'encrypted_complete',count(*) FILTER (WHERE birth_date_encrypted IS NOT NULL AND birth_time_encrypted IS NOT NULL AND birth_place_encrypted IS NOT NULL),'encrypted_any',count(*) FILTER (WHERE birth_date_encrypted IS NOT NULL OR birth_time_encrypted IS NOT NULL OR birth_place_encrypted IS NOT NULL)) FROM public.users),
'payment_duplicates',(SELECT jsonb_build_object('groups',count(*),'extra_rows',coalesce(sum(n-1),0)) FROM (SELECT count(*) n FROM public.payments WHERE stripe_session_id IS NOT NULL GROUP BY stripe_session_id HAVING count(*)>1) d),
'orphan_photos',(SELECT count(*) FROM public.user_photos p LEFT JOIN public.users u ON u.id=p.user_id WHERE u.id IS NULL),
'storage',(SELECT jsonb_agg(jsonb_build_object('bucket',bucket_id,'objects',n,'invalid_paths',invalid_paths)) FROM (SELECT bucket_id,count(*) n,count(*) FILTER (WHERE name !~ '^[0-9a-fA-F-]{36}/' OR name ~ '(^|/)[.]{1,2}(/|$)' OR strpos(name,'%')>0) invalid_paths FROM storage.objects GROUP BY bucket_id) s),
'analytics_tables',jsonb_build_object('feature_usage',to_regclass('public.feature_usage') IS NOT NULL,'user_analytics',to_regclass('public.user_analytics') IS NOT NULL),
'photo_duplicate_paths',(SELECT count(*) FROM (SELECT user_id,storage_path FROM public.user_photos GROUP BY user_id,storage_path HAVING count(*)>1) d),
'indexes',(SELECT jsonb_agg(jsonb_build_object('table',tablename,'name',indexname,'def',indexdef)) FROM pg_indexes WHERE schemaname='public' AND tablename IN ('user_photos','payments','messages','subscriptions'))
) AS audit;

COMMIT;

