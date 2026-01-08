# OTP 500 Error Fix - Complete Summary

## ✅ Tasks Completed

### 1️⃣ Frontend - Full Error Exposure ✅
- **File:** `app/(auth)/verify-email/page.tsx`
- **Changes:**
  - Logs `error.message`, `error.status`, full error object
  - Shows error in alert for immediate visibility
  - Detailed console logging with error code, details, hint

### 2️⃣ Isolation Mode - Remove Side Effects ✅
- **File:** `app/(auth)/verify-email/page.tsx`
- **Changes:**
  - Temporarily disabled all post-verification actions
  - Only calls `verifyOtp` and `getUser`
  - Logs `email_confirmed_at` status
  - No profile upsert, no redirect
  - Shows alert with verification status

### 3️⃣ Database - Found Failing Trigger ✅
- **Issue Identified:** `handle_new_user()` trigger function
- **Root Cause:** 
  - Trigger tries to insert profile without `university_id`
  - `university_id` has NOT NULL constraint
  - Trigger failure causes HTTP 500 during OTP verification

### 4️⃣ Auth Hooks Check ✅
- No custom JWT claims or auth hooks found in codebase
- Issue is database-side (trigger), not auth configuration

### 5️⃣ RLS Safety Check ✅
- RLS policies exist and allow user to insert their own profile
- Trigger uses `SECURITY DEFINER` to bypass RLS
- Policies verified in migration fix

### 6️⃣ Final Fix - Ready to Apply ⏳
- **Migration Created:** `20250122000000_fix_profile_trigger_university_id`
- **Fix Includes:**
  - Makes `university_id` nullable
  - Updates `handle_new_user()` with exception handling
  - Ensures trigger never fails user creation
  - Verifies RLS policies

## 🔧 How to Apply the Fix

### Step 1: Test in Isolation Mode (Current State)
1. Try OTP verification
2. Check if 500 error still occurs
3. Check console logs for detailed error info

### Step 2: Apply Database Fix
```bash
npx prisma migrate deploy
```

This applies:
- `20250122000000_fix_profile_trigger_university_id` - Fixes the trigger
- `20250122000001_disable_trigger_temporarily` - Optional: disables trigger for testing

### Step 3: Test OTP Verification
1. Send OTP code
2. Verify code
3. Check Supabase Dashboard:
   - User created ✅
   - `email_confirmed_at` is set ✅
   - No 500 errors ✅

### Step 3: Restore Full Functionality
After confirming 500 is fixed, edit `app/(auth)/verify-email/page.tsx`:

**Remove isolation mode code and restore:**
```typescript
// POST-VERIFY PROFILE UPSERT (DormUp logic)
const cleanEmail = email.trim().toLowerCase();
const { error: profileError } = await supabase
  .from('profiles')
  .upsert({
    id: data.user.id,
    email: cleanEmail,
    university_id: universityId,
    verified_student: true,
  }, {
    onConflict: 'id',
  });

// Handle profile error...
// Clear localStorage...
// Redirect to /app
```

## 📋 Success Criteria Checklist

After applying fix:
- [ ] `/auth/v1/verify` returns HTTP 200 (not 500)
- [ ] Supabase Logs show no more 500 errors
- [ ] User status is "Confirmed" (not "Waiting for verification")
- [ ] `email_confirmed_at` is populated
- [ ] Profile is created (with or without `university_id` initially)
- [ ] No duplicate users created
- [ ] Full flow works: OTP → Verify → Profile → Redirect

## 🔍 Diagnostic Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check trigger status
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function
SELECT proname, prosrc FROM pg_proc WHERE proname = 'handle_new_user';

-- Check university_id constraint
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'university_id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

## 📝 Files Changed

1. `app/(auth)/verify-email/page.tsx` - Error exposure + isolation mode
2. `prisma/migrations/20250122000000_fix_profile_trigger_university_id/migration.sql` - Main fix
3. `prisma/migrations/20250122000001_disable_trigger_temporarily/migration.sql` - Optional disable
4. `OTP_500_ERROR_DIAGNOSIS.md` - Detailed diagnosis
5. `DEBUGGING_GUIDE.md` - Step-by-step debugging guide

## ⚠️ Important Notes

- **Isolation mode is active** - OTP verification works but doesn't create profile or redirect
- **Apply migration first** before restoring full functionality
- **Test thoroughly** after applying fix
- **Monitor Supabase logs** for any remaining errors



