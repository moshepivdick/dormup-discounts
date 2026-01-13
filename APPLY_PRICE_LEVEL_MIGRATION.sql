-- ============================================
-- DormUp Discounts: Price Level Feature Migration
-- ============================================
-- This migration adds price level and typical student spend fields to venues
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Create enum type for price level
DO $$ BEGIN
    CREATE TYPE "PriceLevel" AS ENUM ('budget', 'mid', 'premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add price level column (nullable for backward compatibility)
ALTER TABLE "public"."venues" 
    ADD COLUMN IF NOT EXISTS "priceLevel" "PriceLevel";

-- Add typical student spend columns (nullable)
ALTER TABLE "public"."venues" 
    ADD COLUMN IF NOT EXISTS "typicalStudentSpendMin" INTEGER;

ALTER TABLE "public"."venues" 
    ADD COLUMN IF NOT EXISTS "typicalStudentSpendMax" INTEGER;

-- Add check constraint to ensure min <= max when both are provided
ALTER TABLE "public"."venues"
    DROP CONSTRAINT IF EXISTS "venues_spend_range_check";

ALTER TABLE "public"."venues"
    ADD CONSTRAINT "venues_spend_range_check" 
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
