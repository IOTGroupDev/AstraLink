-- Server-owned calculated content must not be writable through PostgREST.
-- Runtime Prisma uses postgres; server Supabase uses service_role (BYPASSRLS).
ALTER TABLE public.ai_content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_content_cache, public.compatibility_reports
  FROM PUBLIC, anon, authenticated;

-- Keep the unused legacy schema isolated without deleting tables or data.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Chart" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DatingMatch" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."User", public."Chart", public."Connection", public."DatingMatch"
  FROM PUBLIC, anon, authenticated;

-- All active profile writes are server-managed; a table-wide grant also exposes
-- role, email, onboarding flags and encrypted fields, despite owner-only RLS.
REVOKE INSERT, UPDATE, DELETE ON public.users FROM PUBLIC, anon, authenticated;

-- New public tables must opt in to client access explicitly in their migration.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated;

-- This recipient overload is currently broken and lacks match/block checks.
-- The backend keeps its existing direct INSERT fallback until the RPC is repaired.
REVOKE EXECUTE ON FUNCTION public.send_message(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
