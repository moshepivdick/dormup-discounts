-- Migration: Add ExportJob table for raw data export tracking
-- Run this in Supabase SQL Editor or via Prisma migrate

-- Create ExportJob table
CREATE TABLE IF NOT EXISTS "public"."ExportJob" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMPTZ(6),
  "created_by" UUID,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scope" TEXT NOT NULL DEFAULT 'admin',
  "export_type" TEXT NOT NULL DEFAULT 'events_raw',
  "format" TEXT NOT NULL,
  "from_date" DATE NOT NULL,
  "to_date" DATE NOT NULL,
  "partner_id" UUID,
  "event_types" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "row_count" INTEGER,
  "file_path" TEXT,
  "error_message" TEXT,
  "filters_json" JSONB,
  CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_export_job_status_created" ON "public"."ExportJob" ("status", "created_at");
CREATE INDEX IF NOT EXISTS "idx_export_job_created_by_created" ON "public"."ExportJob" ("created_by", "created_at");

-- Add comments
COMMENT ON TABLE "public"."ExportJob" IS 'Tracks raw data export jobs with file storage paths';
COMMENT ON COLUMN "public"."ExportJob"."status" IS 'PENDING | READY | FAILED';
COMMENT ON COLUMN "public"."ExportJob"."format" IS 'csv | xlsx';
COMMENT ON COLUMN "public"."ExportJob"."file_path" IS 'Path in Supabase Storage (e.g., exports/events_raw/2026-01/job-id.csv)';
