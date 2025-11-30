-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiscountUse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "venueId" INTEGER NOT NULL,
    "generatedCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "qrSlug" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    "confirmedAt" DATETIME,
    CONSTRAINT "DiscountUse_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
-- Copy existing data and set expiresAt to 30 minutes after createdAt for existing rows
INSERT INTO "new_DiscountUse" ("confirmedAt", "createdAt", "generatedCode", "id", "qrSlug", "status", "venueId", "expiresAt") 
SELECT 
    "confirmedAt", 
    "createdAt", 
    "generatedCode", 
    "id", 
    "qrSlug", 
    "status", 
    "venueId",
    datetime("createdAt", '+30 minutes') as "expiresAt"
FROM "DiscountUse";
DROP TABLE "DiscountUse";
ALTER TABLE "new_DiscountUse" RENAME TO "DiscountUse";
CREATE UNIQUE INDEX "DiscountUse_generatedCode_key" ON "DiscountUse"("generatedCode");
CREATE UNIQUE INDEX "DiscountUse_qrSlug_key" ON "DiscountUse"("qrSlug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
