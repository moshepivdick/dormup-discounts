-- Migration: Normalize venue categories to canonical values
-- Maps legacy categories to: restaurant, cafe, pizzeria, fast_food, bar

-- Map legacy categories to canonical values
UPDATE "Venue"
SET category = CASE
  -- Direct matches
  WHEN LOWER(TRIM(category)) = 'restaurant' THEN 'restaurant'
  WHEN LOWER(TRIM(category)) = 'cafe' THEN 'cafe'
  WHEN LOWER(TRIM(category)) = 'pizzeria' THEN 'pizzeria'
  WHEN LOWER(TRIM(category)) = 'fast food' OR LOWER(TRIM(category)) = 'fast_food' THEN 'fast_food'
  WHEN LOWER(TRIM(category)) = 'bar' THEN 'bar'
  
  -- Pattern matches - Bakery & Cafe, Specialty Cafe -> cafe
  WHEN LOWER(category) LIKE '%cafe%' OR LOWER(category) LIKE '%café%' OR LOWER(category) LIKE '%bakery%' THEN 'cafe'
  
  -- Pattern matches - Cocktail Bar -> bar
  WHEN LOWER(category) LIKE '%bar%' THEN 'bar'
  
  -- Pattern matches - Restaurant / Pizzeria -> restaurant (prefer restaurant)
  WHEN LOWER(category) LIKE '%restaurant%' THEN 'restaurant'
  
  -- Pattern matches - Street Food -> fast_food
  WHEN LOWER(category) LIKE '%street food%' OR LOWER(category) LIKE '%street_food%' THEN 'fast_food'
  
  -- Pattern matches - Pizzeria
  WHEN LOWER(category) LIKE '%pizza%' THEN 'pizzeria'
  
  -- Default fallback - unknown categories -> restaurant
  ELSE 'restaurant'
END
WHERE category NOT IN ('restaurant', 'cafe', 'pizzeria', 'fast_food', 'bar');

-- Add a check constraint to prevent invalid categories (optional, but recommended)
-- Note: This will fail if there are still invalid categories, so we ensure all are mapped above
-- ALTER TABLE "Venue" ADD CONSTRAINT "venue_category_check" 
-- CHECK (category IN ('restaurant', 'cafe', 'pizzeria', 'fast_food', 'bar'));
