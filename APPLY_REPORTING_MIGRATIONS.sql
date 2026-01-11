-- ============================================
-- DormUp Discounts: Reporting System Migrations
-- ============================================
-- This file combines both migrations needed for the reporting system.
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- ============================================
-- Migration 1: Add Reporting Tables
-- ============================================

-- CreateTable: DailyPartnerMetrics
CREATE TABLE IF NOT EXISTS "DailyPartnerMetrics" (
    "id" SERIAL NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER NOT NULL,
    "period_date" DATE NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeat_users" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DailyPartnerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MonthlyPartnerMetrics
CREATE TABLE IF NOT EXISTS "MonthlyPartnerMetrics" (
    "id" SERIAL NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeat_users" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MonthlyPartnerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MonthlyGlobalMetrics
CREATE TABLE IF NOT EXISTS "MonthlyGlobalMetrics" (
    "id" SERIAL NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_partners" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MonthlyGlobalMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReportSnapshot
CREATE TABLE IF NOT EXISTS "ReportSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "pdf_path" TEXT,
    "png_path" TEXT,
    "metrics_hash" TEXT,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyPartnerMetrics_venue_id_period_date_key" ON "DailyPartnerMetrics"("venue_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_partner_id_period_date_idx" ON "DailyPartnerMetrics"("partner_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_venue_id_period_date_idx" ON "DailyPartnerMetrics"("venue_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_period_date_idx" ON "DailyPartnerMetrics"("period_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_venue_id_period_start_key" ON "MonthlyPartnerMetrics"("venue_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_partner_id_period_start_idx" ON "MonthlyPartnerMetrics"("partner_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_venue_id_period_start_idx" ON "MonthlyPartnerMetrics"("venue_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_period_start_idx" ON "MonthlyPartnerMetrics"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyGlobalMetrics_period_start_key" ON "MonthlyGlobalMetrics"("period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyGlobalMetrics_period_start_idx" ON "MonthlyGlobalMetrics"("period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_scope_month_idx" ON "ReportSnapshot"("scope", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_partner_id_month_idx" ON "ReportSnapshot"("partner_id", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_created_at_idx" ON "ReportSnapshot"("created_at");

-- AddForeignKey
-- Use dynamic SQL to find the correct table names and create foreign keys
DO $$
DECLARE
    venue_table_name TEXT;
    partner_table_name TEXT;
BEGIN
    -- Find the actual venue table name (check common variations)
    SELECT table_name INTO venue_table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND LOWER(table_name) = 'venues'
    LIMIT 1;
    
    -- Find the actual partner table name (check common variations)
    SELECT table_name INTO partner_table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND LOWER(table_name) = 'partners'
    LIMIT 1;
    
    -- Create foreign keys for venues if table exists
    IF venue_table_name IS NOT NULL THEN
        -- DailyPartnerMetrics -> venues
        BEGIN
            EXECUTE format('ALTER TABLE "DailyPartnerMetrics" DROP CONSTRAINT IF EXISTS "DailyPartnerMetrics_venue_id_fkey"');
            EXECUTE format('ALTER TABLE "DailyPartnerMetrics" ADD CONSTRAINT "DailyPartnerMetrics_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES %I("id") ON DELETE CASCADE ON UPDATE CASCADE', venue_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create DailyPartnerMetrics -> venues foreign key: %', SQLERRM;
        END;
        
        -- MonthlyPartnerMetrics -> venues
        BEGIN
            EXECUTE format('ALTER TABLE "MonthlyPartnerMetrics" DROP CONSTRAINT IF EXISTS "MonthlyPartnerMetrics_venue_id_fkey"');
            EXECUTE format('ALTER TABLE "MonthlyPartnerMetrics" ADD CONSTRAINT "MonthlyPartnerMetrics_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES %I("id") ON DELETE CASCADE ON UPDATE CASCADE', venue_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create MonthlyPartnerMetrics -> venues foreign key: %', SQLERRM;
        END;
        
        -- ReportSnapshot -> venues
        BEGIN
            EXECUTE format('ALTER TABLE "ReportSnapshot" DROP CONSTRAINT IF EXISTS "ReportSnapshot_venue_id_fkey"');
            EXECUTE format('ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES %I("id") ON DELETE SET NULL ON UPDATE CASCADE', venue_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create ReportSnapshot -> venues foreign key: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Venues table not found. Skipping venue foreign keys.';
    END IF;
    
    -- Create foreign keys for partners if table exists
    IF partner_table_name IS NOT NULL THEN
        -- DailyPartnerMetrics -> partners
        BEGIN
            EXECUTE format('ALTER TABLE "DailyPartnerMetrics" DROP CONSTRAINT IF EXISTS "DailyPartnerMetrics_partner_id_fkey"');
            EXECUTE format('ALTER TABLE "DailyPartnerMetrics" ADD CONSTRAINT "DailyPartnerMetrics_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES %I("id") ON DELETE SET NULL ON UPDATE CASCADE', partner_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create DailyPartnerMetrics -> partners foreign key: %', SQLERRM;
        END;
        
        -- MonthlyPartnerMetrics -> partners
        BEGIN
            EXECUTE format('ALTER TABLE "MonthlyPartnerMetrics" DROP CONSTRAINT IF EXISTS "MonthlyPartnerMetrics_partner_id_fkey"');
            EXECUTE format('ALTER TABLE "MonthlyPartnerMetrics" ADD CONSTRAINT "MonthlyPartnerMetrics_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES %I("id") ON DELETE SET NULL ON UPDATE CASCADE', partner_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create MonthlyPartnerMetrics -> partners foreign key: %', SQLERRM;
        END;
        
        -- ReportSnapshot -> partners
        BEGIN
            EXECUTE format('ALTER TABLE "ReportSnapshot" DROP CONSTRAINT IF EXISTS "ReportSnapshot_partner_id_fkey"');
            EXECUTE format('ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES %I("id") ON DELETE SET NULL ON UPDATE CASCADE', partner_table_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create ReportSnapshot -> partners foreign key: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Partners table not found. Skipping partner foreign keys.';
    END IF;
END $$;

-- Add indexes to existing tables for better query performance
CREATE INDEX IF NOT EXISTS "idx_discount_uses_created_at" ON "discount_uses"("created_at");
CREATE INDEX IF NOT EXISTS "idx_discount_uses_status_confirmed" ON "discount_uses"("status", "confirmed_at");
CREATE INDEX IF NOT EXISTS "idx_venue_views_venue_created" ON "venue_views"("venue_id", "created_at");

-- ============================================
-- Migration 2: Add Snapshot Status Lifecycle
-- ============================================

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

-- Make job_id required going forward (only if table is empty or all rows have job_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ReportSnapshot" WHERE "job_id" IS NULL
  ) THEN
    ALTER TABLE "ReportSnapshot" ALTER COLUMN "job_id" SET NOT NULL;
  END IF;
END $$;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all tables were created:
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('MonthlyGlobalMetrics', 'ReportSnapshot', 'MonthlyPartnerMetrics', 'DailyPartnerMetrics');
-- ============================================
