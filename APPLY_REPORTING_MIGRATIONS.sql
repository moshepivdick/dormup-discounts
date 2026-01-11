-- ============================================
-- DormUp Discounts: Reporting System Migrations
-- ============================================
-- This file combines both migrations needed for the reporting system.
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- First, let's check what tables exist in the database
-- Run this query first to see available tables:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
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
-- Skip foreign keys if referenced tables don't exist
-- The reporting tables will work without foreign keys, they just won't have referential integrity
-- You can add foreign keys later once you confirm the table names

-- Note: Foreign keys are optional for the reporting system to work
-- If you want to add them later, first run this query to find table names:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND LOWER(table_name) IN ('venues', 'partners', 'venue', 'partner') ORDER BY table_name;

-- For now, we'll create the tables without foreign keys to avoid errors
-- Foreign keys can be added manually later if needed

-- Add indexes to existing tables for better query performance
-- These indexes are optional and may already exist
-- Skip if tables don't exist or have different names
DO $$
BEGIN
    -- Try to create index on discount_uses if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND LOWER(table_name) = 'discount_uses') THEN
        CREATE INDEX IF NOT EXISTS "idx_discount_uses_created_at" ON "discount_uses"("created_at");
        CREATE INDEX IF NOT EXISTS "idx_discount_uses_status_confirmed" ON "discount_uses"("status", "confirmed_at");
    END IF;
    
    -- Try to create index on venue_views if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND LOWER(table_name) = 'venue_views') THEN
        CREATE INDEX IF NOT EXISTS "idx_venue_views_venue_created" ON "venue_views"("venue_id", "created_at");
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- If indexes fail, just continue - they're optional
    RAISE NOTICE 'Could not create some indexes: %', SQLERRM;
END $$;

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
