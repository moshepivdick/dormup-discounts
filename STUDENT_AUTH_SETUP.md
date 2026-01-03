# Student Auth System Setup Guide

This guide covers setting up the secure student-only authentication system using Supabase + Prisma + Next.js App Router.

## Prerequisites

- Supabase project created
- Node.js 18+ installed
- PostgreSQL database (via Supabase)

## 1. Environment Variables

Add these to your `.env` file (and Vercel project settings):

```bash
# Existing
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
PARTNER_JWT_SECRET="long-random-string"
ADMIN_JWT_SECRET="another-long-random-string"

# New - Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"  # or your production URL
```

### Getting Supabase Credentials

1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

## 2. Database Setup

### Option A: Using Prisma Migrations (Recommended)

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations (creates tables, indexes, RLS policies)
npx prisma migrate deploy

# Or for development:
npx prisma migrate dev
```

### Option B: Manual SQL Execution

If you prefer to run SQL directly in Supabase SQL Editor:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `prisma/migrations/20250101000000_student_auth/migration.sql`
3. Run the SQL

## 3. Seed Initial Universities

```bash
npm run prisma:seed
```

This seeds 14 Italian universities with their email domains.

## 4. Verify Setup

### Check Tables

In Supabase SQL Editor, run:

```sql
SELECT * FROM universities LIMIT 5;
SELECT * FROM profiles LIMIT 5;
SELECT * FROM university_requests LIMIT 5;
```

### Check RLS Policies

```sql
-- Should return policies for each table
SELECT * FROM pg_policies WHERE tablename IN ('universities', 'profiles', 'university_requests');
```

## 5. Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed universities
npm run prisma:seed

# Start dev server
npm run dev
```

Visit:
- Signup: `http://localhost:3000/auth/signup`
- Login: `http://localhost:3000/auth/login`

## 6. Vercel Deployment

1. Push code to GitHub/GitLab
2. Import into Vercel
3. Set all environment variables in Vercel dashboard
4. Deploy

After deployment:

```bash
# Pull env vars locally (optional)
vercel env pull .env.local

# Run migrations on production
npx prisma migrate deploy

# Seed universities (one-time)
npm run prisma:seed
```

## 7. Database Schema Overview

### Tables

**universities**
- Stores university information and allowed email domains
- Public read access (for dropdown)
- Admin-only write access

**profiles**
- 1:1 with `auth.users`
- Stores student profile data
- Owner-only read/write (except role/verified_student)
- Auto-created on signup via server action

**university_requests**
- Stores requests for new universities
- Public insert (anyone can request)
- Admin-only read/update/delete

### RLS Policies

- **universities**: Public SELECT, admin-only INSERT/UPDATE/DELETE
- **profiles**: Owner-only SELECT/UPDATE (with restrictions), server-side INSERT
- **university_requests**: Public INSERT, admin-only SELECT/UPDATE/DELETE

### Triggers

- `sync_profile_verified_student`: Auto-updates `verified_student = true` when email is confirmed

## 8. Authentication Flow

### Signup

1. User enters email, password, selects university
2. Server validates:
   - Email domain matches selected university's `email_domains`
   - University exists
3. Supabase Auth creates user
4. Server creates profile row (using service role)
5. User receives confirmation email
6. On email confirmation, trigger sets `verified_student = true`

### Login

1. User enters email/password
2. Supabase Auth authenticates
3. Server syncs `verified_student` status
4. User redirected to home

### Domain Validation

- Extracts domain from email: `email.split('@').pop()`
- Checks if domain matches any in `universities.email_domains`
- Supports subdomains: `studenti.unibo.it` matches `unibo.it`

## 9. Security Notes

- ✅ All domain checks are server-side
- ✅ Service role key never exposed to browser
- ✅ RLS policies enforce strict access control
- ✅ Users cannot modify `role` or `verified_student` from client
- ✅ Email domains stored in lowercase
- ✅ Rate limiting on signup/login (via Supabase)

## 10. Troubleshooting

### "Missing required environment variable"

Check `.env` file has all required variables.

### "Failed to create profile"

- Ensure RLS policies are set correctly
- Check service role key is correct
- Verify user was created in `auth.users`

### "Domain not supported"

- Check university exists in database
- Verify email domain is in `universities.email_domains` array
- Ensure domain matching logic is correct (case-insensitive)

### RLS Policy Errors

If you see permission errors:
1. Verify policies are enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check policy conditions match your use case
3. For admin operations, ensure service role key is used

## 11. Next Steps

- [ ] Set up email templates in Supabase (Settings → Auth → Email Templates)
- [ ] Configure email redirect URLs in Supabase (Settings → Auth → URL Configuration)
- [ ] Add admin dashboard to manage university requests
- [ ] Implement password reset flow
- [ ] Add email verification reminder

## Support

For issues, check:
- Supabase logs: Dashboard → Logs
- Next.js logs: Terminal output
- Prisma logs: `npx prisma studio` to inspect database





