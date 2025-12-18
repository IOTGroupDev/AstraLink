# Database Migration: Fix OTP User Creation

## Issue

When users try to sign in with OTP (One-Time Password), they encounter the error:

```
ERROR ❌ [Auth] ❌ Ошибка отправки OTP: [AuthApiError: Database error saving new user]
```

## Root Cause

When `signInWithOtp` is called with `shouldCreateUser: true`, Supabase creates a user in the `auth.users` table, but there's no trigger to automatically create the corresponding record in the `public.users` table. This causes a database error because the application expects a record in `public.users` for every authenticated user.

## Solution

This migration creates a database trigger that automatically creates a record in `public.users` whenever a new user is created in `auth.users`.

## How to Apply

### Option 1: Using the provided script

```bash
cd backend/migrations
./apply_fix_otp_user_creation.sh
```

### Option 2: Using psql directly

```bash
# Make sure you have your DATABASE_URL or DIRECT_URL set
export DIRECT_URL="your-supabase-database-url"
psql "$DIRECT_URL" -f backend/migrations/fix_otp_user_creation.sql
```

### Option 3: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `fix_otp_user_creation.sql`
4. Paste into the SQL editor
5. Click "Run"

### Option 4: Using Supabase CLI

```bash
supabase db execute --file backend/migrations/fix_otp_user_creation.sql
```

## What the migration does

1. **Creates a trigger function** (`public.handle_new_user`) that:
   - Automatically creates a record in `public.users` when a user is created in `auth.users`
   - Uses `ON CONFLICT DO NOTHING` to prevent duplicate key errors
   - Runs with `SECURITY DEFINER` to bypass RLS policies

2. **Creates a trigger** (`on_auth_user_created`) that:
   - Fires after a new user is inserted into `auth.users`
   - Calls the `handle_new_user` function

3. **Sets proper permissions** for the tables and functions

## Verification

After applying the migration, test the OTP flow:

1. Open your app
2. Try to sign in with email using OTP
3. Check that you receive the OTP code
4. Verify that no database errors occur

You can also verify the trigger was created:

```sql
-- Check if the trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

## Rollback

If you need to rollback this migration:

```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
```

## Notes

- This migration is **idempotent** - you can run it multiple times safely
- The trigger only affects new user creation, existing users are not affected
- The trigger is SECURITY DEFINER, meaning it bypasses RLS policies to ensure user creation succeeds
- The `ON CONFLICT DO NOTHING` prevents errors if a user record already exists in `public.users`
