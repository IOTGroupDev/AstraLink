-- Drop old table if exists (with CASCADE to drop dependent objects)
DROP TABLE IF EXISTS "public"."Subscription" CASCADE;

-- Create subscriptions table if it is missing.
-- Production already has this table, so the migration must be idempotent.
CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" UUID NOT NULL DEFAULT extensions.gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "expires_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."subscriptions"
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

-- Create unique constraint on user_id
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_user_id_key" ON "public"."subscriptions"("user_id");

-- Create additional indexes
CREATE INDEX IF NOT EXISTS "subscriptions_tier_idx" ON "public"."subscriptions"("tier");
CREATE INDEX IF NOT EXISTS "subscriptions_expires_at_idx" ON "public"."subscriptions"("expires_at");
CREATE INDEX IF NOT EXISTS "subscriptions_is_cancelled_idx" ON "public"."subscriptions"("is_cancelled");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscriptions_user_id_fkey'
  ) THEN
    ALTER TABLE "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "public"."users"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
