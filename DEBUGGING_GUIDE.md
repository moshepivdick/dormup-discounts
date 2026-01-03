# OTP 500 Error Debugging Guide

## Current Status: Isolation Mode Active

The verification page is now in **ISOLATION MODE** to diagnose the 500 error.

### What Isolation Mode Does:
- ✅ Verifies OTP code
- ✅ Checks if user and session are created
- ✅ Calls `getUser()` to check `email_confirmed_at`
- ❌ **DOES NOT** upsert profile
- ❌ **DOES NOT** redirect to app
- ❌ **DOES NOT** perform any post-verification actions

### Testing Steps:

1. **Test OTP Verification in Isolation Mode:**
   - Send OTP code
   - Enter code on verify page
   - Check browser console for detailed logs
   - Check if 500 error still occurs

2. **If 500 Error Persists:**
   - The error is from **database trigger** (`handle_new_user`)
   - Apply migration: `20250122000000_fix_profile_trigger_university_id`
   - Or temporarily disable trigger: `20250122000001_disable_trigger_temporarily`

3. **If 500 Error Stops:**
   - The error is from **our post-verification code**
   - Check profile upsert logic
   - Check API route `/api/profile/upsert`

## Applying Fixes

### Option 1: Fix the Trigger (Recommended)
```bash
npx prisma migrate deploy
```
This applies `20250122000000_fix_profile_trigger_university_id` which:
- Makes `university_id` nullable
- Updates `handle_new_user()` to handle errors gracefully
- Ensures trigger never fails user creation

### Option 2: Temporarily Disable Trigger
```bash
# Apply this migration to disable trigger for testing
npx prisma migrate deploy
```
Then manually run in Supabase SQL Editor:
```sql
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
```

To re-enable:
```sql
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
```

## Restoring Full Functionality

After confirming the 500 error is fixed:

1. **Remove Isolation Mode:**
   - Edit `app/(auth)/verify-email/page.tsx`
   - Restore profile upsert code
   - Restore redirect to `/app`

2. **Test Full Flow:**
   - Send OTP
   - Verify OTP
   - Check profile is created with `university_id`
   - Verify redirect works

## Error Logging

All errors are now logged with full details:
- Error message
- Error status
- Full error object (JSON)
- Error code, details, hint

Check browser console for complete error information.

