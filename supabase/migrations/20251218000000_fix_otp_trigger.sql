-- Migration: Fix OTP trigger - move from public.users to auth.users
-- Run with elevated privileges via Supabase

-- Clean up incorrect trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function that syncs auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, authenticated;

-- Create trigger on auth.users (requires elevated privileges)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_schema = 'auth'
    AND event_object_table = 'users';

  IF trigger_count = 1 THEN
    RAISE NOTICE '✅ Trigger successfully created on auth.users';
  ELSE
    RAISE EXCEPTION '❌ Trigger creation failed';
  END IF;
END $$;
