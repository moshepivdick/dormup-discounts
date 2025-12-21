-- Add user_id to discount_uses table (nullable for backward compatibility)
ALTER TABLE "DiscountUse" 
ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES "profiles"(id) ON DELETE SET NULL;

-- Add user_id to VenueView table (nullable for backward compatibility)
ALTER TABLE "VenueView" 
ADD COLUMN IF NOT EXISTS "user_id" UUID REFERENCES "profiles"(id) ON DELETE SET NULL;

-- Add last_activity_at to profiles table
ALTER TABLE "profiles" 
ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMPTZ;

-- Create user_stats table for aggregated user statistics
CREATE TABLE IF NOT EXISTS "user_stats" (
  "user_id" UUID PRIMARY KEY REFERENCES "profiles"(id) ON DELETE CASCADE,
  "total_discounts_generated" INTEGER NOT NULL DEFAULT 0,
  "total_discounts_used" INTEGER NOT NULL DEFAULT 0,
  "total_venue_views" INTEGER NOT NULL DEFAULT 0,
  "last_discount_generated_at" TIMESTAMPTZ,
  "last_discount_used_at" TIMESTAMPTZ,
  "last_venue_view_at" TIMESTAMPTZ,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_discount_uses_user_id" ON "DiscountUse"("user_id");
CREATE INDEX IF NOT EXISTS "idx_discount_uses_venue_user" ON "DiscountUse"("venueId", "user_id");
CREATE INDEX IF NOT EXISTS "idx_venue_views_user_id" ON "VenueView"("user_id");
CREATE INDEX IF NOT EXISTS "idx_venue_views_venue_user" ON "VenueView"("venueId", "user_id");
CREATE INDEX IF NOT EXISTS "idx_venue_views_created_at" ON "VenueView"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_profiles_last_activity_at" ON "profiles"("last_activity_at");

-- Function to update user stats when discount is generated
CREATE OR REPLACE FUNCTION update_user_stats_on_discount_generated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."user_id" IS NOT NULL THEN
    INSERT INTO "user_stats" (
      "user_id",
      "total_discounts_generated",
      "last_discount_generated_at",
      "updated_at"
    )
    VALUES (
      NEW."user_id",
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT ("user_id") DO UPDATE SET
      "total_discounts_generated" = "user_stats"."total_discounts_generated" + 1,
      "last_discount_generated_at" = NOW(),
      "updated_at" = NOW();
    
    -- Update last_activity_at in profiles
    UPDATE "profiles"
    SET "last_activity_at" = NOW()
    WHERE "id" = NEW."user_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when discount is confirmed
CREATE OR REPLACE FUNCTION update_user_stats_on_discount_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'confirmed' AND OLD."status" != 'confirmed' AND NEW."user_id" IS NOT NULL THEN
    INSERT INTO "user_stats" (
      "user_id",
      "total_discounts_used",
      "last_discount_used_at",
      "updated_at"
    )
    VALUES (
      NEW."user_id",
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT ("user_id") DO UPDATE SET
      "total_discounts_used" = "user_stats"."total_discounts_used" + 1,
      "last_discount_used_at" = NOW(),
      "updated_at" = NOW();
    
    -- Update last_activity_at in profiles
    UPDATE "profiles"
    SET "last_activity_at" = NOW()
    WHERE "id" = NEW."user_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats when venue is viewed
CREATE OR REPLACE FUNCTION update_user_stats_on_venue_view()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."user_id" IS NOT NULL THEN
    INSERT INTO "user_stats" (
      "user_id",
      "total_venue_views",
      "last_venue_view_at",
      "updated_at"
    )
    VALUES (
      NEW."user_id",
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT ("user_id") DO UPDATE SET
      "total_venue_views" = "user_stats"."total_venue_views" + 1,
      "last_venue_view_at" = NOW(),
      "updated_at" = NOW();
    
    -- Update last_activity_at in profiles
    UPDATE "profiles"
    SET "last_activity_at" = NOW()
    WHERE "id" = NEW."user_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_discount_generated ON "DiscountUse";
CREATE TRIGGER trigger_discount_generated
  AFTER INSERT ON "DiscountUse"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_discount_generated();

DROP TRIGGER IF EXISTS trigger_discount_confirmed ON "DiscountUse";
CREATE TRIGGER trigger_discount_confirmed
  AFTER UPDATE ON "DiscountUse"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_discount_confirmed();

DROP TRIGGER IF EXISTS trigger_venue_view ON "VenueView";
CREATE TRIGGER trigger_venue_view
  AFTER INSERT ON "VenueView"
  FOR EACH ROW
  EXECUTE FUNCTION update_user_stats_on_venue_view();

