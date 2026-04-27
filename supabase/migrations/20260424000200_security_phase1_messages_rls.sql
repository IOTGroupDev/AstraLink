-- Tighten legacy message policies.
-- The chat service uses match-aware policies and does not rely on direct UPDATEs.

BEGIN;

DROP POLICY IF EXISTS "Users can insert their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view their messages" ON public.messages;

COMMIT;
