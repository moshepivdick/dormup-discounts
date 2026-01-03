# OTP-Only Passwordless Authentication Implementation

## Overview

This implementation provides passwordless authentication using one-time codes (OTP) sent via email. Users sign in without passwords, and sessions persist for 7 days with automatic logout after inactivity.

## Files Created/Modified

### New Files
1. **`lib/universityDomains.ts`** - University email domain validation
2. **`components/auth/OtpInput.tsx`** - 6-digit OTP input component
3. **`app/(auth)/login/page.tsx`** - OTP login page (2-step flow)
4. **`app/providers/AuthProvider.tsx`** - Auth provider with session management and inactivity tracking
5. **`app/app/page.tsx`** - Protected account page example
6. **`prisma/migrations/20250120000000_create_profiles_table/migration.sql`** - Profiles table and RLS

### Modified Files
1. **`app/layout.tsx`** - Added AuthProvider wrapper

## Implementation Details

### 1. University Email Validation
- **File**: `lib/universityDomains.ts`
- Hardcoded allowlist of university domains
- Supports subdomain matching (e.g., `studio.unibo.it` matches `unibo.it`)
- Function: `isUniversityEmail(email)` returns boolean

### 2. OTP Login Flow
- **File**: `app/(auth)/login/page.tsx`
- **Step 1**: User enters email → validates domain → sends OTP
- **Step 2**: User enters 6-digit code → verifies → creates profile → redirects
- Resend functionality with 30-second cooldown
- Error handling with clear messages

### 3. Profile Creation
- After successful OTP verification:
  - Extracts first name from email (e.g., `michael.rossi@studio.unibo.it` → `Michael`)
  - Upserts profile in `profiles` table via Supabase client (RLS allows authenticated users)
  - Fields: `id`, `email`, `full_name`, `created_at`, `updated_at`

### 4. Session Management
- **File**: `app/providers/AuthProvider.tsx`
- Tracks user activity (click, keydown, scroll, touchstart)
- Updates `localStorage.lastActivityAt` on activity
- Checks inactivity every 5 minutes
- Auto-logout after 7 days of inactivity
- Auto-login if session exists and within 7 days

### 5. Route Protection
- AuthProvider protects all routes except `/login` and `/auth/*`
- Redirects unauthenticated users to `/login`
- Redirects authenticated users away from `/login` to `/app`

## Database Setup

### SQL Migration
Run the migration file:
```sql
-- See: prisma/migrations/20250120000000_create_profiles_table/migration.sql
```

Or apply via Prisma:
```bash
npx prisma migrate deploy
```

### Table Structure
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies
- Users can SELECT their own profile (`auth.uid() = id`)
- Users can UPDATE their own profile
- Users can INSERT their own profile (on signup)

## Environment Variables

Required in `.env`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase Configuration

1. **Email Template**: Ensure OTP email template is configured in Supabase Dashboard
2. **Auth Settings**: No special configuration needed (OTP is default for email auth)

## Usage Flow

1. User visits `/login`
2. Enters university email → clicks "Send code"
3. Receives 6-digit code via email
4. Enters code → clicks "Verify"
5. Profile created/updated → redirected to `/app`
6. Session persists for 7 days (or until inactivity)

## Testing Checklist

- [ ] Install dependencies: `npm install`
- [ ] Set environment variables
- [ ] Run migration: `npx prisma migrate deploy`
- [ ] Test email validation (block non-university emails)
- [ ] Test OTP send and receive
- [ ] Test code verification
- [ ] Test profile creation
- [ ] Test session persistence (refresh page)
- [ ] Test inactivity logout (wait 7 days or modify constant)
- [ ] Test route protection (try accessing `/app` without login)

## Notes

- Route group `(auth)` doesn't affect URL - `/app/(auth)/login/page.tsx` is accessible at `/login`
- Session is persisted in browser storage (Supabase default)
- Activity tracking uses localStorage (survives page refreshes)
- Profile upsert happens client-side using authenticated Supabase client (RLS allows it)

