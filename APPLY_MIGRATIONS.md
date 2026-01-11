# Apply Database Migrations for Reports

## Problem
If you see errors like:
```
The table `public.MonthlyGlobalMetrics` does not exist in the current database.
The table `public.ReportSnapshot` does not exist in the current database.
```

This means the database migrations for the reporting system have not been applied.

## Solution

### For Local Development:
```bash
npx prisma migrate dev
```

### For Production (Vercel/Supabase):
```bash
npx prisma migrate deploy
```

## Required Migrations

The following migrations need to be applied:

1. **20250130000000_add_reporting_tables** - Creates:
   - `DailyPartnerMetrics`
   - `MonthlyPartnerMetrics`
   - `MonthlyGlobalMetrics`
   - `ReportSnapshot`

2. **20250131000000_add_snapshot_status** - Updates `ReportSnapshot` with:
   - `job_id` (unique)
   - `status` (PENDING/READY/FAILED)
   - `completed_at`
   - `error_message`

## How to Apply

### Option 1: Using Prisma CLI (Recommended)

**Local:**
```bash
npx prisma migrate dev
```

**Production:**
```bash
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution

If you have direct database access, you can run the migration SQL files directly:

1. Connect to your Supabase database
2. Run the SQL from `prisma/migrations/20250130000000_add_reporting_tables/migration.sql`
3. Run the SQL from `prisma/migrations/20250131000000_add_snapshot_status/migration.sql`

### Option 3: Via Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the migration SQL
3. Execute the SQL

## Verify Migrations

After applying migrations, verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('MonthlyGlobalMetrics', 'ReportSnapshot', 'MonthlyPartnerMetrics', 'DailyPartnerMetrics');
```

You should see all 4 tables listed.

## After Applying Migrations

Once migrations are applied:
1. Restart your application
2. Try creating a report again
3. The error should be resolved
