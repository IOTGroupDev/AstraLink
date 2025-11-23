-- Migration: Add ai_generated_at column to charts table
-- Date: 2025-11-14
-- Purpose: Enable AI chart regeneration with 24-hour rate limiting

-- Add the column
ALTER TABLE "public"."charts"
ADD COLUMN IF NOT EXISTS "ai_generated_at" TIMESTAMP WITH TIME ZONE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS "charts_ai_generated_at_idx"
ON "public"."charts"("ai_generated_at");

-- Add documentation
COMMENT ON COLUMN "public"."charts"."ai_generated_at" IS 'Timestamp of last AI interpretation generation. Used for rate limiting (max 1 per 24 hours).';
