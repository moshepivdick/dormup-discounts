-- ============================================
-- DormUp Discounts: Update Chi Burdlaz Garden to Premium
-- ============================================
-- This script sets Chi Burdlaz Garden as a premium venue (€€€)
-- Execute this SQL in Supabase Dashboard → SQL Editor
-- ============================================

-- Update Chi Burdlaz Garden to premium price level
UPDATE "Venue"
SET "priceLevel" = 'premium'
WHERE name = 'Chi Burdlaz Garden';

-- Verify the update
SELECT id, name, "priceLevel", "typicalStudentSpendMin", "typicalStudentSpendMax"
FROM "Venue"
WHERE name = 'Chi Burdlaz Garden';

-- ============================================
-- Migration Complete
-- ============================================
