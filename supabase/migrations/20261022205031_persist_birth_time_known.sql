-- Nullable for existing accounts: a missing flag must not reinterpret legacy birth data.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_time_known boolean;
COMMENT ON COLUMN public.users.birth_time_known IS 'Explicit user knowledge of civil birth time; false forbids houses and birth-time-dependent interpretations';
