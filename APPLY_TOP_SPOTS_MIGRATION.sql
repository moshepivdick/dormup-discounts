-- ============================================
-- DormUp Discounts: Top Spots Feature Migration
-- ============================================
-- This migration creates the user_place_stats table for tracking user visits
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- CreateTable: UserPlaceStats
CREATE TABLE IF NOT EXISTS "user_place_stats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "place_id" INTEGER NOT NULL,
    "visits_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_place_stats_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on (user_id, place_id)
CREATE UNIQUE INDEX IF NOT EXISTS "user_place_stats_user_place_unique" ON "user_place_stats"("user_id", "place_id");

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS "idx_user_place_stats_user_visits" ON "user_place_stats"("user_id", "visits_count" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_place_stats_user_last_visit" ON "user_place_stats"("user_id", "last_visit_at" DESC);

-- Add foreign key constraints
ALTER TABLE "user_place_stats" 
    ADD CONSTRAINT "user_place_stats_user_id_fkey" 
    FOREIGN KEY ("user_id") 
    REFERENCES "profiles"("id") 
    ON DELETE CASCADE 
    ON UPDATE NO ACTION;

ALTER TABLE "user_place_stats" 
    ADD CONSTRAINT "user_place_stats_place_id_fkey" 
    FOREIGN KEY ("place_id") 
    REFERENCES "Venue"("id") 
    ON DELETE CASCADE;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on the table
ALTER TABLE "user_place_stats" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read ONLY their own rows
CREATE POLICY "Users can read their own place stats"
    ON "user_place_stats"
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own rows (for upsert operations)
CREATE POLICY "Users can insert their own place stats"
    ON "user_place_stats"
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own rows
CREATE POLICY "Users can update their own place stats"
    ON "user_place_stats"
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy needed as we don't want users to delete their stats
-- Only cascade deletes from profiles/venues will remove rows

-- ============================================
-- Migration Complete
-- ============================================
