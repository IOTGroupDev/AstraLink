# OTP Authentication Fix Summary

## Problem

After implementing Google/Apple OAuth and removing redirect URLs from Supabase configuration, OTP authentication started failing with:

```
ERROR ❌ [Auth] ❌ Ошибка отправки OTP: [AuthApiError: Database error saving new user]
```

## Root Causes

### 1. shouldCreateUser with removed redirects

In `frontend/src/services/api/auth.api.ts:147`, the OTP flow used:

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true }, // ❌ This causes the error
});
```

When `shouldCreateUser: true` is set **without** `emailRedirectTo`, and redirect URLs are removed from Supabase, user creation fails.

### 2. Missing database trigger

When a user is created in `auth.users` (either via OTP or OAuth), there was no automatic trigger to create a corresponding record in `public.users`. This caused database constraint violations.

## Solution

### Part 1: Remove shouldCreateUser (frontend/src/services/api/auth.api.ts:145-149)

**Before:**

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: { shouldCreateUser: true },
});
```

**After:**

```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  // options.shouldCreateUser removed - user will be auto-created on verifyOtp
  // This fixes "Database error saving new user" after redirect URLs were removed
});
```

**Why this fixes it:**

- User is NOT created when OTP is sent
- User is automatically created by Supabase when OTP is verified with `verifyOtp()`
- This is the correct flow for OTP authentication with email codes

### Part 2: Add database trigger (backend/migrations/fix_otp_user_creation.sql)

Created a PostgreSQL trigger that automatically creates a `public.users` record whenever a new user is created in `auth.users`:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Why this is needed:**

- When `verifyOtp()` creates a user in `auth.users`, the trigger automatically creates the corresponding `public.users` record
- Prevents "foreign key constraint" errors
- Works for OTP, OAuth (Google/Apple), and any other auth method

## How OTP Flow Works Now

### Before Fix:

1. User enters email
2. `sendVerificationCode()` calls `signInWithOtp({ shouldCreateUser: true })` ❌ **FAILS HERE**
3. User never receives OTP code

### After Fix:

1. User enters email
2. `sendVerificationCode()` calls `signInWithOtp()` without `shouldCreateUser` ✅
3. OTP code is sent to user's email ✅
4. User enters OTP code
5. `verifyOtp()` is called ✅
6. Supabase creates user in `auth.users` ✅
7. Trigger automatically creates user in `public.users` ✅
8. User is authenticated ✅

## Files Changed

1. **frontend/src/services/api/auth.api.ts** (line 145-149)
   - Removed `shouldCreateUser: true` option
   - Added explanatory comment

2. **backend/migrations/fix_otp_user_creation.sql** (new file)
   - Database trigger function and trigger creation
   - Permissions setup

3. **backend/migrations/apply_fix_otp_user_creation.sh** (new file)
   - Script to apply the migration easily

4. **backend/migrations/FIX_OTP_USER_CREATION.md** (new file)
   - Detailed migration documentation

## How to Apply

### Step 1: Apply database migration

Choose one of the following methods:

**Option A: Using the script**

```bash
cd backend/migrations
./apply_fix_otp_user_creation.sh
```

**Option B: Using psql**

```bash
psql "$DIRECT_URL" -f backend/migrations/fix_otp_user_creation.sql
```

**Option C: Using Supabase Dashboard**

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `backend/migrations/fix_otp_user_creation.sql`
3. Paste and run

### Step 2: Deploy frontend changes

The frontend changes are already committed and will be deployed automatically.

## Testing

After applying the fix:

1. Open the app
2. Navigate to Auth screen
3. Enter an email address
4. Click "ДАЛЕЕ" (Next)
5. Verify you receive the OTP code via email (no errors)
6. Enter the 6-digit code
7. Verify successful authentication

## Additional Notes

- The trigger is **idempotent** - safe to run multiple times
- The trigger uses `ON CONFLICT DO NOTHING` to prevent duplicate key errors
- The trigger is `SECURITY DEFINER` to bypass RLS policies
- Works for **all** authentication methods (OTP, OAuth, magic links)
- No changes needed for existing OAuth flows (Google/Apple)

## Why This Happened

The OAuth implementation didn't directly cause the issue, but:

1. During OAuth implementation, redirect URLs were removed from Supabase config
2. OTP flow had `shouldCreateUser: true` which requires redirect URLs
3. Without redirects + `shouldCreateUser`, user creation failed
4. Additionally, there was no trigger to sync `auth.users` → `public.users`

This fix addresses both problems permanently.
