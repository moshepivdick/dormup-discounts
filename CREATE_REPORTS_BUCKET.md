# How to Create the "reports" Bucket in Supabase Storage

## Error
```
Bucket not found
```

This means the `reports` bucket doesn't exist in your Supabase Storage.

## Solution

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project

### Step 2: Navigate to Storage
1. Click **Storage** in the left sidebar
2. You'll see a list of buckets (if any exist)

### Step 3: Create New Bucket
1. Click **New bucket** button
2. Fill in the form:
   - **Name:** `reports`
   - **Public bucket:** ❌ **Unchecked** (keep it private for security)
   - Click **Create bucket**

### Step 4: Configure Bucket (Important!)

After creating the bucket, configure it:

1. Click on the `reports` bucket to open its settings
2. **Make sure it's set to Private** (not public)
3. **Optional:** Set up RLS policies if needed:
   - Go to **Storage** → **Policies** → `reports`
   - Add policies to control who can read/write reports

### Step 5: Verify Bucket Exists
- The bucket should appear in the Storage list
- Status should show as **Private**

## Storage Structure

Files will be stored in this structure:
```
reports/
  ├── admin/
  │   └── 2026-01/
  │       └── global/
  │           └── 1736616000000-abc123.pdf
  └── partner/
      └── 2026-01/
          └── venue-123/
              └── 1736616000000-xyz789.pdf
```

## After Creating the Bucket

1. Try creating a report snapshot again
2. The PDF and PNG files should upload successfully
3. Files will be stored as **private** with signed URLs for access

## Troubleshooting

If you still get errors after creating the bucket:
1. Check bucket name is exactly `reports` (lowercase)
2. Verify you're using the correct Supabase project
3. Check that service role key has access to Storage API
4. Look for RLS policy errors in Supabase logs
