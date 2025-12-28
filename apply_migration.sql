-- Apply migration manually: 20250116000000_add_email_verification_token
-- Run this in Supabase SQL Editor

-- CreateTable
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_user_id_key" ON "email_verification_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");

-- AddForeignKey (only if table doesn't have this constraint already)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'email_verification_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "email_verification_tokens" 
        ADD CONSTRAINT "email_verification_tokens_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

