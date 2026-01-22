DO $$ BEGIN
    CREATE TYPE "public"."SubscriptionTier" AS ENUM ('BASIC', 'PRO', 'MAX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."UpgradeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."venues"
ADD COLUMN IF NOT EXISTS "subscriptionTier" "public"."SubscriptionTier" NOT NULL DEFAULT 'BASIC';

UPDATE "public"."venues"
SET "subscriptionTier" = 'BASIC'
WHERE "subscriptionTier" IS NULL;

CREATE TABLE IF NOT EXISTS "UpgradeRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venueId" INTEGER NOT NULL,
    "partnerId" UUID NOT NULL,
    "fromTier" "public"."SubscriptionTier" NOT NULL,
    "toTier" "public"."SubscriptionTier" NOT NULL,
    "status" "public"."UpgradeRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    CONSTRAINT "UpgradeRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UpgradeRequest_venueId_status_idx" ON "UpgradeRequest"("venueId", "status");
CREATE INDEX IF NOT EXISTS "UpgradeRequest_partnerId_status_idx" ON "UpgradeRequest"("partnerId", "status");

ALTER TABLE "UpgradeRequest"
ADD CONSTRAINT "UpgradeRequest_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UpgradeRequest"
ADD CONSTRAINT "UpgradeRequest_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
