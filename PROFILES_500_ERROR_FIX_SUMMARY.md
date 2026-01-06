## Root Cause (One Sentence)

**The 500 error occurred because the `on_auth_user_created` trigger was disabled in migration `20250122000001`, preventing automatic profile creation when users verify OTP, causing Supabase to fail with "ERROR: relation 'profiles' does not exist (SQLSTATE 42P01)" when the trigger tried to insert into a non-existent or inaccessible profiles table.**

---

## Files Changed

### 1. Database Migration (New)
**File:** `prisma/migrations/20250123000000_fix_profiles_500_error/migration.sql`
- Creates `public.profiles` table if it doesn't exist
- Enables RLS with correct policies
- Creates `handle_new_user()` function with error handling
- Creates and **ENABLES** `on_auth_user_created` trigger
- Grants necessary permissions

### 2. Application Code (Modified)
**File:** `app/(auth)/verify-email/page.tsx`
- Enhanced profile upsert error handling
- Added fallback to API route if direct upsert fails
- Made profile upsert non-blocking (user can login even if profile update fails)
- Added detailed logging for debugging

### 3. Production Fix Script (New)
**File:** `PRODUCTION_FIX_PROFILES_500.sql`
- Copy-paste ready SQL script for immediate production fix
- Can be run directly in Supabase SQL Editor
- Includes verification steps and success messages

---

## Exact SQL Added

### Table Creation
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  university_id UUID,
  verified_student BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  CONSTRAINT profiles_university_id_fkey FOREIGN KEY (university_id) 
    REFERENCES public.universities(id) ON UPDATE NO ACTION
);
```

### RLS Policies
```sql
-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### Trigger Function (Error-Resilient)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to insert profile, but ignore if it already exists (idempotent)
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, updated_at, verified_student, university_id, role)
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      NOW(),
      NOW(),
      FALSE,
      NULL,  -- university_id will be set later via API
      'user'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = NOW();
  EXCEPTION
    WHEN OTHERS THEN
      -- CRITICAL: Log the error but NEVER fail the user creation
      RAISE WARNING 'handle_new_user: Failed to create profile for user %: % (SQLSTATE: %)', 
        NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger Creation (ENABLED)
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Permissions
```sql
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role;
```

---

## How It Works

### Before Fix (Broken Flow)
```
User signs up → signInWithOtp() → OTP sent
User enters code → verifyOtp() → auth.users INSERT
                                    ↓
                         on_auth_user_created trigger (DISABLED)
                                    ↓
                         ❌ Profile NOT created
                                    ↓
                         App tries to upsert profile
                                    ↓
                         ❌ ERROR: relation 'profiles' does not exist
                                    ↓
                         ❌ 500 Internal Server Error
```

### After Fix (Working Flow)
```
User signs up → signInWithOtp() → OTP sent
User enters code → verifyOtp() → auth.users INSERT
                                    ↓
                         on_auth_user_created trigger (ENABLED)
                                    ↓
                         ✅ Profile created automatically
                                    ↓
                         App upserts profile (sets university_id)
                                    ↓
                         ✅ Success (or non-blocking warning if fails)
                                    ↓
                         ✅ User logged in → Redirect to /account
```

---

## Production Fix Instructions

### Option 1: Run Migration (Recommended for Vercel/Production)
1. Commit and push changes
2. Vercel will run `prisma migrate deploy` automatically
3. Migration `20250123000000_fix_profiles_500_error` will execute

### Option 2: Manual SQL (Immediate Fix)
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire contents of `PRODUCTION_FIX_PROFILES_500.sql`
4. Click "Run"
5. Verify success messages in output:
   ```
   ✓ public.profiles table: EXISTS
   ✓ on_auth_user_created trigger: EXISTS
   ✓ Trigger status: ENABLED
   ✓ RLS policies: CREATED
   ✓ Permissions: GRANTED
   ```

---

## Verification Steps

### 1. Check Trigger Status
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';
```
Expected: `tgenabled = 'O'` (enabled)

### 2. Check Table Exists
```sql
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'profiles' AND table_schema = 'public';
```
Expected: 1 row returned

### 3. Check RLS Policies
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' AND schemaname = 'public';
```
Expected: 3 policies (SELECT, UPDATE, INSERT)

### 4. Test OTP Verification
1. Sign up with a new email
2. Receive OTP code
3. Enter code on verify page
4. Should redirect to `/account` without 500 error
5. Check Supabase logs for any errors

---

## Application Changes

### Enhanced Error Handling in verify-email/page.tsx

```typescript
// Profile upsert is now non-blocking
try {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userData.user.id,
      email: cleanEmail,
      university_id: universityId,
      verified_student: true,
    }, {
      onConflict: 'id',
    });

  if (profileError) {
    // Fallback to API route (uses service role)
    const response = await fetch('/api/profile/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ universityId }),
      credentials: 'include',
    });
    
    if (!response.ok) {
      // ⚠️ Warning only - don't block login
      console.warn('Profile upsert failed, but user is verified');
    }
  }
} catch (profileErr) {
  // ⚠️ Warning only - don't block login
  console.warn('Profile upsert failed, but user is verified');
}

// Continue to redirect regardless of profile upsert result
router.push('/account');
```

---

## Why This Fix Works

1. **Table Exists**: Ensures `public.profiles` table is created with correct schema
2. **Trigger Enabled**: Re-enables the `on_auth_user_created` trigger that was disabled
3. **Error Resilient**: Trigger function catches errors and logs warnings instead of failing
4. **RLS Policies**: Correct policies allow authenticated users to manage their own profiles
5. **Permissions**: Grants necessary permissions to all roles
6. **Non-Blocking**: App continues even if profile upsert fails (user can update later)

---

## Rollback Plan (If Needed)

If this causes issues, you can disable the trigger temporarily:

```sql
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
```

Then manually create profiles via API route only.

---

## Testing Checklist

- [ ] Run `PRODUCTION_FIX_PROFILES_500.sql` in Supabase SQL Editor
- [ ] Verify trigger is enabled (see verification steps above)
- [ ] Sign up with a new email
- [ ] Receive OTP code via email
- [ ] Enter OTP code on verify page
- [ ] Verify no 500 error in browser console
- [ ] Verify redirect to `/account` works
- [ ] Check Supabase logs for any errors
- [ ] Verify profile exists in `public.profiles` table
- [ ] Verify `university_id` is set correctly

---

## Additional Notes

- The trigger uses `SECURITY DEFINER` to bypass RLS when creating profiles
- `university_id` is nullable and set by the app after verification
- Profile creation is idempotent (uses `ON CONFLICT DO UPDATE`)
- Error handling ensures user creation never fails due to profile issues
- App-level profile upsert is a safety net in case trigger fails

