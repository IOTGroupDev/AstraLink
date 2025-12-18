-- Migration: Fix trigger placement - move from public.users to auth.users
-- Problem: Trigger on_auth_user_created was created on wrong table (public.users instead of auth.users)
-- This caused OTP to fail because auth.users inserts weren't triggering public.users creation

-- Step 1: Drop the INCORRECT trigger from public.users
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

-- Step 2: Drop old function if exists
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Step 3: Create the CORRECT function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- When a user is created in auth.users, create corresponding public.users record
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if user already exists

  RETURN NEW;
END;
$$;

-- Step 4: Create the CORRECT trigger on auth.users (not public.users!)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users  -- ← CORRECT: trigger on auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Step 6: Add helpful comment
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Automatically creates public.users record when auth.users record is created. Required for OTP and OAuth flows.';

COMMENT ON FUNCTION public.handle_new_user() IS
  'Syncs auth.users → public.users. Called by on_auth_user_created trigger.';

-- Verification query (run after migration)
-- SELECT trigger_name, event_object_schema, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name = 'on_auth_user_created';
-- Expected result: trigger_name='on_auth_user_created', event_object_schema='auth', event_object_table='users'
