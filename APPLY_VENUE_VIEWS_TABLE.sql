-- ============================================
-- DormUp Discounts: Create venue_views table if missing
-- ============================================
-- This migration creates the venue_views table if it doesn't exist
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Create venue_views table if it doesn't exist
-- Note: Using "Venue" table name (with capital V) as per Prisma schema
CREATE TABLE IF NOT EXISTS public.venue_views (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER NOT NULL,
    city TEXT NOT NULL,
    created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    user_id UUID,
    dedupe_key TEXT,
    
    CONSTRAINT venue_views_venue_id_fkey 
        FOREIGN KEY (venue_id) 
        REFERENCES "Venue"(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT venue_views_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON UPDATE NO ACTION
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_venue_views_created_at ON public.venue_views(created_at);
CREATE INDEX IF NOT EXISTS idx_venue_views_user_id ON public.venue_views(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_views_venue_user ON public.venue_views(venue_id, user_id);
CREATE INDEX IF NOT EXISTS idx_venue_views_venue_created ON public.venue_views(venue_id, created_at);

-- Create unique index on dedupe_key if column exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_venue_views_dedupe_key 
    ON public.venue_views(dedupe_key) 
    WHERE dedupe_key IS NOT NULL;

-- ============================================
-- Migration Complete
-- ============================================
