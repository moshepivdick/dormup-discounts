-- CreateTable: DailyPartnerMetrics
CREATE TABLE IF NOT EXISTS "DailyPartnerMetrics" (
    "id" SERIAL NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER NOT NULL,
    "period_date" DATE NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeat_users" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DailyPartnerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MonthlyPartnerMetrics
CREATE TABLE IF NOT EXISTS "MonthlyPartnerMetrics" (
    "id" SERIAL NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repeat_users" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MonthlyPartnerMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MonthlyGlobalMetrics
CREATE TABLE IF NOT EXISTS "MonthlyGlobalMetrics" (
    "id" SERIAL NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "total_partners" INTEGER NOT NULL DEFAULT 0,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "qr_generated" INTEGER NOT NULL DEFAULT 0,
    "qr_redeemed" INTEGER NOT NULL DEFAULT 0,
    "unique_users" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "MonthlyGlobalMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ReportSnapshot
CREATE TABLE IF NOT EXISTS "ReportSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "partner_id" UUID,
    "venue_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "pdf_path" TEXT NOT NULL,
    "png_path" TEXT NOT NULL,
    "metrics_hash" TEXT,

    CONSTRAINT "ReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyPartnerMetrics_venue_id_period_date_key" ON "DailyPartnerMetrics"("venue_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_partner_id_period_date_idx" ON "DailyPartnerMetrics"("partner_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_venue_id_period_date_idx" ON "DailyPartnerMetrics"("venue_id", "period_date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyPartnerMetrics_period_date_idx" ON "DailyPartnerMetrics"("period_date");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_venue_id_period_start_key" ON "MonthlyPartnerMetrics"("venue_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_partner_id_period_start_idx" ON "MonthlyPartnerMetrics"("partner_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_venue_id_period_start_idx" ON "MonthlyPartnerMetrics"("venue_id", "period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyPartnerMetrics_period_start_idx" ON "MonthlyPartnerMetrics"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyGlobalMetrics_period_start_key" ON "MonthlyGlobalMetrics"("period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MonthlyGlobalMetrics_period_start_idx" ON "MonthlyGlobalMetrics"("period_start");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_scope_month_idx" ON "ReportSnapshot"("scope", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_partner_id_month_idx" ON "ReportSnapshot"("partner_id", "month");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReportSnapshot_created_at_idx" ON "ReportSnapshot"("created_at");

-- AddForeignKey
ALTER TABLE "DailyPartnerMetrics" ADD CONSTRAINT "DailyPartnerMetrics_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyPartnerMetrics" ADD CONSTRAINT "DailyPartnerMetrics_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPartnerMetrics" ADD CONSTRAINT "MonthlyPartnerMetrics_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyPartnerMetrics" ADD CONSTRAINT "MonthlyPartnerMetrics_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSnapshot" ADD CONSTRAINT "ReportSnapshot_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes to existing tables for better query performance
CREATE INDEX IF NOT EXISTS "idx_discount_uses_created_at" ON "discount_uses"("created_at");
CREATE INDEX IF NOT EXISTS "idx_discount_uses_status_confirmed" ON "discount_uses"("status", "confirmed_at");
CREATE INDEX IF NOT EXISTS "idx_venue_views_venue_created" ON "venue_views"("venue_id", "created_at");
