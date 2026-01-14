-- ============================================
-- DormUp Discounts: Average Student Bill Migration
-- ============================================
-- This migration adds avgStudentBill field to venues
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Add average student bill column (nullable)
ALTER TABLE "Venue" 
    ADD COLUMN IF NOT EXISTS "avgStudentBill" DOUBLE PRECISION;

-- Add comment to column
COMMENT ON COLUMN "Venue"."avgStudentBill" IS 'Average student bill amount in EUR';

-- ============================================
-- Migration Complete
-- ============================================
-- Notes:
-- - Column is nullable for backward compatibility
-- - Existing venues will have NULL values until updated
-- - This field is used for analytics and reporting
-- ============================================
