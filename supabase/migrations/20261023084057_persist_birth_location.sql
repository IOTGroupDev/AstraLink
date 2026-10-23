-- Nullable for existing profiles. Payload is encrypted by the application.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_location jsonb;
COMMENT ON COLUMN public.users.birth_location IS
  'Encrypted canonical birth place and selected coordinates/timezone; unrelated to current residence';
