-- Phase 1 security hardening for AstraLink
-- 1. Remove permissive RLS bypass on public.user_photos
-- 2. Lock down search_path for Postgres functions flagged by Supabase advisors

BEGIN;

DROP POLICY IF EXISTS "Service role bypass" ON public.user_photos;

CREATE POLICY "user_photos: service role full access"
ON public.user_photos
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.touch_updated_at()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.get_compatibility(uuid, uuid, text, boolean)
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.compat_scores_set_norm()
  SET search_path = pg_catalog, public;

ALTER FUNCTION public.cache_compatibility(uuid, uuid, text, numeric, text, jsonb, interval)
  SET search_path = pg_catalog, public;

COMMIT;
