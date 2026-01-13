-- ============================================
-- DormUp Discounts: Price Level Feature Migration
-- ============================================
-- This migration adds price level and typical student spend fields to venues
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Create enum type for price level
DO $$ BEGIN
    CREATE TYPE "public"."PriceLevel" AS ENUM ('budget', 'mid', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add price level column (nullable for backward compatibility)
ALTER TABLE "Venue" 
    ADD COLUMN IF NOT EXISTS "priceLevel" "public"."PriceLevel";

-- Add typical student spend columns (nullable)
ALTER TABLE "Venue" 
    ADD COLUMN IF NOT EXISTS "typicalStudentSpendMin" INTEGER;

ALTER TABLE "Venue" 
    ADD COLUMN IF NOT EXISTS "typicalStudentSpendMax" INTEGER;

-- Add check constraint to ensure min <= max when both are provided
ALTER TABLE "Venue"
    DROP CONSTRAINT IF EXISTS "Venue_typicalStudentSpend_check";

ALTER TABLE "Venue"
    ADD CONSTRAINT "Venue_typicalStudentSpend_check" 
    CHECK (
        "typicalStudentSpendMin" IS NULL 
        OR "typicalStudentSpendMax" IS NULL 
        OR "typicalStudentSpendMin" <= "typicalStudentSpendMax"
    );

-- ============================================
-- Migration Complete
-- ============================================
-- Notes:
-- - All new columns are nullable for backward compatibility
-- - Existing venues will have NULL values until updated via admin panel
-- - Price level enum: 'budget' (€), 'mid' (€€), 'premium' (€€€)
-- ============================================
