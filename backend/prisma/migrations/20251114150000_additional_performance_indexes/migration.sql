-- Additional Performance Indexes Migration
-- Adds missing indexes identified in performance audit

-- ========================================
-- Chart Model Indexes
-- ========================================

-- Index on aiGeneratedAt for filtering AI-generated charts
-- Used in queries like: WHERE aiGeneratedAt IS NOT NULL
CREATE INDEX IF NOT EXISTS "charts_ai_generated_at_idx"
ON "public"."charts"("ai_generated_at")
WHERE "ai_generated_at" IS NOT NULL;

-- Composite index for user charts ordered by creation date
-- Optimizes: SELECT * FROM charts WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS "charts_user_created_idx"
ON "public"."charts"("user_id", "created_at" DESC);

-- ========================================
-- UserPhoto Model Indexes
-- ========================================

-- Index on storagePath for quick lookup by storage path
-- Used when generating signed URLs
CREATE INDEX IF NOT EXISTS "user_photos_storage_path_idx"
ON "public"."user_photos"("storage_path");

-- Index on userId and isPrimary for finding primary photos
-- Optimizes: SELECT * FROM user_photos WHERE user_id = ? AND is_primary = true
CREATE INDEX IF NOT EXISTS "user_photos_user_primary_idx"
ON "public"."user_photos"("user_id", "is_primary")
WHERE "is_primary" = true;

-- ========================================
-- Payment Model Indexes (if table exists)
-- ========================================

-- Index on stripeSessionId for webhook lookups.
-- payments is optional in production, so guard the statement explicitly.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payments'
      AND column_name = 'stripe_session_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "payments_stripe_session_id_idx" ON "public"."payments"("stripe_session_id") WHERE "stripe_session_id" IS NOT NULL';
  END IF;
END $$;

-- ========================================
-- DatingMatch Model Indexes
-- ========================================

-- GIN index on candidateData JSON column for fast JSON queries
-- Enables efficient queries on JSON fields
CREATE INDEX IF NOT EXISTS "dating_matches_candidate_data_gin_idx"
ON "public"."dating_matches" USING GIN("candidate_data");

-- ========================================
-- Connection Model Indexes
-- ========================================

-- status is not present in every environment. Only create these indexes when it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'connections'
      AND column_name = 'status'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "connections_status_idx" ON "public"."connections"("status")';
    EXECUTE 'CREATE INDEX IF NOT EXISTS "connections_user_status_idx" ON "public"."connections"("user_id", "status")';
  END IF;
END $$;

-- ========================================
-- Subscription Model Indexes
-- ========================================

-- subscriptions exists in production, but guard for older environments.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx" ON "public"."subscriptions"("user_id")';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'subscriptions'
      AND column_name = 'tier'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS "subscriptions_tier_idx" ON "public"."subscriptions"("tier")';
  END IF;
END $$;
