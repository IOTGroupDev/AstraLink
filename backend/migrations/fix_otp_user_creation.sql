-- Migration: Fix OTP user creation by adding trigger
-- Description: Automatically create public.users record when auth.users record is created
-- This fixes the "Database error saving new user" error when using signInWithOtp

-- Drop trigger and function if they exist (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a function that handles new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into public.users with minimal required fields
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that calls the function when a user is created in auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.users TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_user IS 'Automatically creates a public.users record when a new auth.users record is created. Fixes OTP authentication flow.';
