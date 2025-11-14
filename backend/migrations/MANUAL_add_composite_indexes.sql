-- Manual Migration: Add Composite Indexes
-- Created: 2025-11-14
-- Purpose: Add performance-critical composite indexes identified in audit
--
-- ⚠️  PRODUCTION DEPLOYMENT INSTRUCTIONS:
-- Run these CREATE INDEX CONCURRENTLY commands to avoid locking tables
-- Monitor progress with: SELECT * FROM pg_stat_progress_create_index;

-- ============================================================
-- Connection Model: Composite index for sorted user lists
-- ============================================================
-- Improves performance of queries filtering by userId and sorting by createdAt
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Connection_userId_createdAt_idx"
  ON "public"."connections"(user_id, created_at);

-- Expected improvement: 2-5x faster for user connection history queries

-- ============================================================
-- DatingMatch Model: Composite index for status filtering
-- ============================================================
-- Improves performance of queries filtering matches by userId and like/reject status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "DatingMatch_userId_liked_rejected_idx"
  ON "public"."dating_matches"(user_id, liked, rejected);

-- Expected improvement: 3-10x faster for match filtering queries

-- ============================================================
-- Subscription Model: Active subscriptions check
-- ============================================================
-- Improves performance of checking active subscriptions (userId + not expired)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Subscription_userId_expiresAt_idx"
  ON "public"."subscriptions"(user_id, expires_at);

-- Expected improvement: 2-5x faster for subscription validation

-- ============================================================
-- Subscription Model: Tier statistics
-- ============================================================
-- Improves performance of analytics queries grouping by tier and expiration
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Subscription_tier_expiresAt_idx"
  ON "public"."subscriptions"(tier, expires_at);

-- Expected improvement: 5-10x faster for subscription analytics

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these queries AFTER creating indexes to verify they exist:

-- 1. Check all indexes on connections table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'connections'
ORDER BY indexname;

-- 2. Check all indexes on dating_matches table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'dating_matches'
ORDER BY indexname;

-- 3. Check all indexes on subscriptions table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
ORDER BY indexname;

-- ============================================================
-- ROLLBACK (if needed)
-- ============================================================
-- DROP INDEX CONCURRENTLY IF EXISTS "public"."Connection_userId_createdAt_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "public"."DatingMatch_userId_liked_rejected_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "public"."Subscription_userId_expiresAt_idx";
-- DROP INDEX CONCURRENTLY IF EXISTS "public"."Subscription_tier_expiresAt_idx";
