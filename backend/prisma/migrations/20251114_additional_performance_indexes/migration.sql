-- Additional Performance Indexes Migration
-- Adds missing indexes identified in performance audit

-- ========================================
-- Chart Model Indexes
-- ========================================

-- Index on aiGeneratedAt for filtering AI-generated charts
-- Used in queries like: WHERE aiGeneratedAt IS NOT NULL
CREATE INDEX IF NOT EXISTS "charts_ai_generated_at_idx"
ON "public"."charts"("aiGeneratedAt")
WHERE "aiGeneratedAt" IS NOT NULL;

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
ON "public"."user_photos"("storagePath");

-- Index on userId and isPrimary for finding primary photos
-- Optimizes: SELECT * FROM user_photos WHERE user_id = ? AND is_primary = true
CREATE INDEX IF NOT EXISTS "user_photos_user_primary_idx"
ON "public"."user_photos"("userId", "isPrimary")
WHERE "isPrimary" = true;

-- ========================================
-- Payment Model Indexes (if table exists)
-- ========================================

-- Index on stripeSessionId for webhook lookups
-- Used in Stripe webhook handlers
CREATE INDEX IF NOT EXISTS "payments_stripe_session_id_idx"
ON "public"."payments"("stripeSessionId")
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'payments'
);

-- ========================================
-- DatingMatch Model Indexes
-- ========================================

-- GIN index on candidateData JSON column for fast JSON queries
-- Enables efficient queries on JSON fields
CREATE INDEX IF NOT EXISTS "dating_matches_candidate_data_gin_idx"
ON "public"."dating_matches" USING GIN("candidateData");

-- ========================================
-- Connection Model Indexes
-- ========================================

-- Index on status for filtering by connection status
CREATE INDEX IF NOT EXISTS "connections_status_idx"
ON "public"."connections"("status");

-- Composite index for user connections with status
-- Optimizes: SELECT * FROM connections WHERE user_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS "connections_user_status_idx"
ON "public"."connections"("user_id", "status");

-- ========================================
-- Subscription Model Indexes
-- ========================================

-- Index on userId for quick subscription lookups
CREATE INDEX IF NOT EXISTS "subscriptions_user_id_idx"
ON "public"."subscriptions"("userId")
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
);

-- Index on tier for analytics queries
CREATE INDEX IF NOT EXISTS "subscriptions_tier_idx"
ON "public"."subscriptions"("tier")
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'subscriptions'
);
