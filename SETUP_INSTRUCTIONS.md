# Quick Setup Instructions

## The Issue
The database tables need to be created manually in Supabase because Prisma migrations have issues with Supabase's `auth` schema.

## Solution: Run SQL Migration Manually

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"

### Step 2: Copy and Run the Migration
1. Open the file: `prisma/migrations/20250101000000_student_auth/migration.sql`
2. Copy ALL the contents
3. Paste into Supabase SQL Editor
4. Click "Run" (or press Ctrl+Enter)

This will create:
- `universities` table (with unique constraint on name)
- `profiles` table
- `university_requests` table
- All indexes
- All RLS policies
- The trigger for email confirmation

### Step 3: Verify Tables Were Created
Run this query in SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('universities', 'profiles', 'university_requests');
```

You should see all 3 tables.

### Step 4: Seed Universities
Now run the seed command:
```bash
npm run prisma:seed
```

This will insert 14 Italian universities.

### Step 5: Verify Seed Worked
Run this query:
```sql
SELECT * FROM universities LIMIT 5;
```

You should see universities with their email domains.

## Alternative: Use Prisma Studio (if migration works)
If you prefer, you can also try:
```bash
npx prisma studio
```

This opens a GUI to view and edit your database.

## Why Manual Migration?
Supabase uses a separate `auth` schema that Prisma can't easily manage with migrations. Running the SQL manually is the most reliable approach for Supabase projects.



