# Passwordless OTP Authentication Refactor

## Overview

The authentication system has been completely refactored to use passwordless OTP (One-Time Password) authentication with a university-first flow.

## Changes Summary

### 1. Removed Password Authentication
- ✅ Removed password fields from all UI components
- ✅ Removed `login()` function from `app/actions/auth.ts` (password-based)
- ✅ Removed password validation schemas usage

### 2. New Authentication Flow

**3-Step Process:**
1. **UNIVERSITY** - User selects their university**
   - Dropdown with all available universities
   - Fetched from `/api/universities`
   
2. **EMAIL** - User enters university email
   - Validates email domain matches selected university's `email_domains`
   - Shows error if domain doesn't match: "This email doesn't match <University>. Use your university email."
   - Sends OTP code via Supabase `signInWithOtp()`

3. **CODE** - User enters 6-digit OTP
   - 6-digit input with paste support
   - Resend functionality with 30-second cooldown
   - Verifies OTP via Supabase `verifyOtp()`
   - After verification, upserts profile and redirects to `/app`

### 3. File Structure

**New Files:**
- `lib/supabase/browser.ts` - Browser client (replaces `client.ts`)
- `app/(auth)/signup/page.tsx` - New 3-step signup flow
- `app/api/universities/route.ts` - API to fetch universities
- `app/api/profile/upsert/route.ts` - Secure profile upsert endpoint
- `app/app/layout.tsx` - Route protection for `/app`
- `prisma/migrations/20250120000001_update_profiles_for_otp/migration.sql` - Database migration

**Updated Files:**
- `app/app/page.tsx` - Shows welcome message with first name
- `app/actions/auth.ts` - Removed password login function
- All imports updated from `@/lib/supabase/client` to `@/lib/supabase/browser`

**Deleted Files:**
- `lib/supabase/client.ts` - Replaced by `browser.ts`

### 4. Database Schema

**Profiles Table:**
- `id` uuid (references auth.users)
- `email` text unique
- `university_id` uuid (references universities)
- `verified_student` boolean (set to true after OTP verification)
- `created_at` timestamptz
- `updated_at` timestamptz (auto-updated via trigger)

**Universities Table:**
- `id` uuid
- `name` text
- `email_domains` text[] (array of allowed domains)
- `created_at` timestamptz

### 5. Route Protection

**`/app` Routes:**
- Protected by `app/app/layout.tsx`
- Checks for Supabase session via server client
- Redirects to `/(auth)/signup` if not authenticated

### 6. Profile Upsert Logic

**After OTP Verification:**
1. Client calls `POST /api/profile/upsert` with `universityId`
2. Server:
   - Gets authenticated user from Supabase session
   - Extracts first name from email (e.g., "michael.rossi@studio.unibo.it" → "Michael")
   - Upserts profile with:
     - `university_id` = selected university
     - `verified_student` = true
     - `email` = user email
3. Returns profile data
4. Client redirects to `/app`

### 7. Name Extraction

First name is extracted from email:
- `local = email.split("@")[0]`
- `first_name = local.split(".")[0]`
- Capitalize first letter, lowercase rest
- Example: "michael.rossi@studio.unibo.it" → "Michael"

### 8. Domain Validation

Email domain must match one of the selected university's `email_domains`:
- Exact match: `user@unibo.it` matches `unibo.it`
- Subdomain match: `user@studio.unibo.it` matches `unibo.it`
- Error message: "This email doesn't match <University>. Use your university email."

## API Endpoints

### `GET /api/universities`
Returns list of all universities with their email domains.

### `POST /api/profile/upsert`
**Auth:** Requires Supabase session cookie
**Body:** `{ universityId: string }`
**Response:** `{ success: true, profile: {...} }`

## Migration

Run the SQL migration:
```bash
# In Supabase SQL Editor or via Prisma
# See: prisma/migrations/20250120000001_update_profiles_for_otp/migration.sql
```

The migration:
- Adds `first_name` column (if missing)
- Adds `is_student_verified` column (if missing)
- Adds `verified_at` column (if missing)
- Adds `updated_at` trigger
- Makes `university_id` nullable

## Testing Checklist

- [ ] Select university from dropdown
- [ ] Enter email with matching domain → should accept
- [ ] Enter email with non-matching domain → shows error
- [ ] Send OTP code → receives email
- [ ] Enter 6-digit code → verifies successfully
- [ ] Profile created with correct university_id and verified_student=true
- [ ] Redirects to /app
- [ ] /app shows welcome message with first name
- [ ] /app protected (redirects if not authenticated)
- [ ] Resend code works with cooldown

## Next Steps

1. Run database migration
2. Test the full flow
3. Update any remaining references to old login/signup pages
4. Remove old password-based signup page if exists

