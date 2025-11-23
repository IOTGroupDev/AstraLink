-- Performance Indexes Migration
-- Adds indexes for frequently queried columns to improve query performance

-- ========================================
-- Connection Model Indexes
-- ========================================
-- Index on user_id for faster lookups by user
CREATE INDEX IF NOT EXISTS "connections_user_id_idx" ON "public"."connections"("user_id");

-- Index on created_at for sorting and time-based queries
CREATE INDEX IF NOT EXISTS "connections_created_at_idx" ON "public"."connections"("created_at");

-- ========================================
-- DatingMatch Model Indexes
-- ========================================
-- Index on user_id for faster lookups by user
CREATE INDEX IF NOT EXISTS "dating_matches_user_id_idx" ON "public"."dating_matches"("user_id");

-- Index on compatibility for sorting by compatibility score
CREATE INDEX IF NOT EXISTS "dating_matches_compatibility_idx" ON "public"."dating_matches"("compatibility");

-- Index on created_at for time-based queries and sorting
CREATE INDEX IF NOT EXISTS "dating_matches_created_at_idx" ON "public"."dating_matches"("created_at");

-- Index on liked for filtering liked matches
CREATE INDEX IF NOT EXISTS "dating_matches_liked_idx" ON "public"."dating_matches"("liked");

-- Index on rejected for filtering rejected matches
CREATE INDEX IF NOT EXISTS "dating_matches_rejected_idx" ON "public"."dating_matches"("rejected");

-- Composite index on user_id and compatibility for optimized sorted queries
CREATE INDEX IF NOT EXISTS "dating_matches_user_id_compatibility_idx" ON "public"."dating_matches"("user_id", "compatibility");
