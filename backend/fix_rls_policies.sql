-- Fix RLS policies for subscriptions table
-- The service role should have full access to all tables

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON public.subscriptions;

-- Create new policies that properly handle service role
-- Service role bypasses RLS entirely, but we need policies for authenticated users

-- Allow authenticated users to view their own subscription
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid()::text = user_id);

-- Allow authenticated users to update their own subscription
CREATE POLICY "Users can update their own subscription" ON public.subscriptions
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Allow authenticated users to insert their own subscription
CREATE POLICY "Users can insert their own subscription" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Service role has full access (this should work with service_role key)
CREATE POLICY "Service role full access" ON public.subscriptions
    FOR ALL USING (
        CASE
            WHEN auth.jwt() ->> 'role' = 'service_role' THEN true
            WHEN auth.role() = 'service_role' THEN true
            ELSE false
        END
    );

-- Alternative: Allow service role to bypass RLS entirely
-- Note: In Supabase, service role key should bypass RLS by default,
-- but explicit policies can help ensure access