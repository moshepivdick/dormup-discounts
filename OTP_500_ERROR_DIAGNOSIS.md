# OTP 500 Error Diagnosis & Fix

## Problem
OTP verification fails with HTTP 500 "Error confirming user" after successful token validation.

## Root Cause Analysis

### Identified Issue: Database Trigger Failure

The trigger `on_auth_user_created` calls `handle_new_user()` which tries to insert into `profiles` table without `university_id`, but the column has a NOT NULL constraint.

**Trigger Chain:**
1. User signs up with OTP → `auth.users` INSERT
2. Trigger `on_auth_user_created` fires AFTER INSERT
3. Function `handle_new_user()` tries to INSERT into `profiles`
4. **FAILS** because `university_id` is NOT NULL but trigger provides NULL
5. Supabase returns 500 error

## Solution

### Step 1: Make university_id Nullable (if needed)
```sql
ALTER TABLE public.profiles ALTER COLUMN university_id DROP NOT NULL;
```

### Step 2: Fix handle_new_user() Function
The function should:
- Handle missing `university_id` gracefully (set to NULL)
- Use EXCEPTION handling to prevent trigger failure from blocking user creation
- Be idempotent (ON CONFLICT DO UPDATE)

### Step 3: Verify RLS Policies
Ensure RLS allows the trigger to insert:
```sql
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- The trigger uses SECURITY DEFINER, so it should bypass RLS
-- But verify the policy exists for manual inserts
```

## Testing Steps

### 1. Isolation Mode (Current)
- OTP verification only
- No profile upsert
- Check if 500 error still occurs
- If 500 persists → trigger is the issue
- If 500 stops → our post-verification code is the issue

### 2. Apply Migration
```bash
npx prisma migrate deploy
```

### 3. Test OTP Flow
1. Send OTP
2. Verify OTP
3. Check Supabase Dashboard:
   - User created
   - `email_confirmed_at` is set
   - Profile exists (even without university_id initially)
4. Verify no 500 errors in logs

### 4. Restore Full Flow
After confirming 500 is fixed, restore profile upsert with university_id.

## SQL Queries for Diagnosis

### Check Trigger
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Check Function
```sql
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

### Check Table Constraints
```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name = 'university_id';
```

### Check RLS Policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Temporarily Disable Trigger (for testing)
```sql
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
```

### Re-enable Trigger
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

## Expected Behavior After Fix

1. ✅ OTP verification returns 200 (not 500)
2. ✅ User is created in `auth.users`
3. ✅ Profile is created in `public.profiles` (with NULL university_id initially)
4. ✅ `email_confirmed_at` is set
5. ✅ User status is "Confirmed" (not "Waiting for verification")
6. ✅ Profile can be updated later with university_id via API



