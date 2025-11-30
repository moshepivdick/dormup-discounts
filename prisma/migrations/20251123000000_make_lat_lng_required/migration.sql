-- Make latitude and longitude required
-- First, ensure all existing venues have coordinates (they should from seed)
-- Then alter the table to make fields NOT NULL

-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- Step 1: Create new table with required fields
CREATE TABLE "Venue_new" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "discountText" TEXT NOT NULL,
    "details" TEXT,
    "openingHours" TEXT,
    "openingHoursShort" TEXT,
    "mapUrl" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "imageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Step 2: Copy data from old table (only venues with coordinates)
INSERT INTO "Venue_new" (
    "id", "name", "city", "category", "discountText", "details", 
    "openingHours", "openingHoursShort", "mapUrl", 
    "latitude", "longitude", "imageUrl", "thumbnailUrl", 
    "isActive", "createdAt", "updatedAt"
)
SELECT 
    "id", "name", "city", "category", "discountText", "details", 
    "openingHours", "openingHoursShort", "mapUrl", 
    "latitude", "longitude", "imageUrl", "thumbnailUrl", 
    "isActive", "createdAt", "updatedAt"
FROM "Venue"
WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;

-- Step 3: Drop old table
DROP TABLE "Venue";

-- Step 4: Rename new table
ALTER TABLE "Venue_new" RENAME TO "Venue";

-- Step 5: Recreate indexes
CREATE INDEX "Venue_city_idx" ON "Venue"("city");
CREATE INDEX "Venue_category_idx" ON "Venue"("category");

