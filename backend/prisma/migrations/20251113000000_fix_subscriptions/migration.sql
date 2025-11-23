-- Drop old table if exists (with CASCADE to drop dependent objects)
DROP TABLE IF EXISTS "public"."Subscription" CASCADE;

-- Create correct subscriptions table
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "expires_at" TIMESTAMP(3),
    "trial_ends_at" TIMESTAMP(3),
    "is_cancelled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on user_id
CREATE UNIQUE INDEX "subscriptions_user_id_key" ON "public"."subscriptions"("user_id");

-- Create additional indexes
CREATE INDEX "subscriptions_tier_idx" ON "public"."subscriptions"("tier");
CREATE INDEX "subscriptions_expires_at_idx" ON "public"."subscriptions"("expires_at");
CREATE INDEX "subscriptions_is_cancelled_idx" ON "public"."subscriptions"("is_cancelled");

-- Add foreign key constraint
ALTER TABLE "public"."subscriptions" 
ADD CONSTRAINT "subscriptions_user_id_fkey" 
FOREIGN KEY ("user_id") 
REFERENCES "public"."users"("id") 
ON DELETE CASCADE 
ON UPDATE CASCADE;
