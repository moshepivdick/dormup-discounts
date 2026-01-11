-- Add status lifecycle fields to ReportSnapshot table

-- Add new columns
ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS "job_id" TEXT;
ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';
ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6);
ALTER TABLE "ReportSnapshot" ADD COLUMN IF NOT EXISTS "error_message" TEXT;

-- Make pdf_path and png_path nullable (they're set after generation)
-- Use DO block to safely handle if columns are already nullable
DO $$
BEGIN
  -- Check if pdf_path has NOT NULL constraint and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ReportSnapshot' 
    AND column_name = 'pdf_path' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "ReportSnapshot" ALTER COLUMN "pdf_path" DROP NOT NULL;
  END IF;
  
  -- Check if png_path has NOT NULL constraint and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ReportSnapshot' 
    AND column_name = 'png_path' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "ReportSnapshot" ALTER COLUMN "png_path" DROP NOT NULL;
  END IF;
END $$;

-- Generate job_id for existing rows (if any)
UPDATE "ReportSnapshot" 
SET "job_id" = gen_random_uuid()::TEXT 
WHERE "job_id" IS NULL;

-- Set status for existing rows (assume they're READY if they have paths)
UPDATE "ReportSnapshot"
SET "status" = CASE 
  WHEN "pdf_path" IS NOT NULL AND "png_path" IS NOT NULL THEN 'READY'
  ELSE 'PENDING'
END
WHERE "status" IS NULL;

-- Add unique constraint on job_id
CREATE UNIQUE INDEX IF NOT EXISTS "ReportSnapshot_job_id_key" ON "ReportSnapshot"("job_id");

-- Add indexes for status queries
CREATE INDEX IF NOT EXISTS "ReportSnapshot_status_created_at_idx" ON "ReportSnapshot"("status", "created_at");
CREATE INDEX IF NOT EXISTS "ReportSnapshot_month_scope_idx" ON "ReportSnapshot"("month", "scope");

-- Make job_id required going forward
ALTER TABLE "ReportSnapshot" ALTER COLUMN "job_id" SET NOT NULL;
