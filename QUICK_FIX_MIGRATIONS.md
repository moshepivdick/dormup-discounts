# Quick Fix: Apply Reporting Migrations

## Problem
You're seeing: `Database migrations not applied. Please run: npx prisma migrate deploy`

## Solution: Apply Migrations via Supabase Dashboard

### Step 1: Open Supabase Dashboard
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Execute Migration SQL
1. Open the file `APPLY_REPORTING_MIGRATIONS.sql` in this repository
2. Copy **ALL** the SQL content
3. Paste it into the SQL Editor in Supabase
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify
After running the SQL, verify tables were created by running this query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('MonthlyGlobalMetrics', 'ReportSnapshot', 'MonthlyPartnerMetrics', 'DailyPartnerMetrics');
```

You should see all 4 tables listed.

### Step 4: Test
1. Go back to your admin panel
2. Try creating a report again
3. The error should be gone!

## Alternative: Using Prisma CLI

If you have direct database access via command line:

```bash
# Make sure DATABASE_URL is set in your environment
npx prisma migrate deploy
```

## What This Does

This migration creates:
- **DailyPartnerMetrics** - Daily aggregated metrics per partner
- **MonthlyPartnerMetrics** - Monthly aggregated metrics per partner  
- **MonthlyGlobalMetrics** - Monthly global metrics (all partners)
- **ReportSnapshot** - Stores generated PDF/PNG reports with status tracking

All tables are safe to create (uses `IF NOT EXISTS`) and won't break existing data.
