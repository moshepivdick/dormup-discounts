-- Add dedupe_key column to venue_views table to prevent duplicate view events
-- This allows us to use upsert logic to ensure each view is recorded only once

-- Step 1: Add dedupe_key column (nullable first, we'll backfill and make it NOT NULL)
ALTER TABLE public.venue_views ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

-- Step 2: Backfill existing rows with dedupe_key
-- Format: venueId:userId:minuteBucket (minuteBucket = timestamp rounded to minute)
-- For anonymous users, use 'anon' instead of userId
UPDATE public.venue_views
SET dedupe_key = CONCAT(
  venue_id::TEXT,
  ':',
  COALESCE(user_id::TEXT, 'anon'),
  ':',
  TO_CHAR(DATE_TRUNC('minute', created_at), 'YYYY-MM-DD HH24:MI:SS')
)
WHERE dedupe_key IS NULL;

-- Step 3: Handle any remaining duplicates by adding a sequence number
-- For rows with the same dedupe_key, keep the first one and modify others
WITH duplicates AS (
  SELECT id, dedupe_key,
    ROW_NUMBER() OVER (PARTITION BY dedupe_key ORDER BY created_at, id) as rn
  FROM public.venue_views
  WHERE dedupe_key IS NOT NULL
)
UPDATE public.venue_views v
SET dedupe_key = CONCAT(v.dedupe_key, '-dup-', d.rn)
FROM duplicates d
WHERE v.id = d.id AND d.rn > 1;

-- Step 4: Make dedupe_key NOT NULL
ALTER TABLE public.venue_views ALTER COLUMN dedupe_key SET NOT NULL;

-- Step 5: Create unique index on dedupe_key to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_views_dedupe_key ON public.venue_views(dedupe_key);
