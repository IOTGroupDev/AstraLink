-- Supabase Reset Script for AstraLink
-- This script will clean up existing tables and recreate them

-- WARNING: This will delete all data in the following tables!
-- Only run this if you want to start fresh

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_updated_at_users ON public.users;
DROP TRIGGER IF EXISTS handle_updated_at_charts ON public.charts;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

DROP POLICY IF EXISTS "Users can view own charts" ON public.charts;
DROP POLICY IF EXISTS "Users can insert own charts" ON public.charts;
DROP POLICY IF EXISTS "Users can update own charts" ON public.charts;
DROP POLICY IF EXISTS "Users can delete own charts" ON public.charts;

DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can insert own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
DROP POLICY IF EXISTS "Users can delete own connections" ON public.connections;

DROP POLICY IF EXISTS "Users can view own matches" ON public.dating_matches;
DROP POLICY IF EXISTS "Users can insert own matches" ON public.dating_matches;
DROP POLICY IF EXISTS "Users can update own matches" ON public.dating_matches;
DROP POLICY IF EXISTS "Users can delete own matches" ON public.dating_matches;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;

-- Drop existing tables (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.dating_matches CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.charts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Now run the safe schema script after this
