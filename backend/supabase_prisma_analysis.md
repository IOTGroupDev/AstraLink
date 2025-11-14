# AstraLink Backend: Supabase Client vs Prisma Analysis Report

## Executive Summary

The AstraLink backend has a **hybrid data access pattern** with significant Supabase usage for tables not yet migrated to Prisma. Only **5 core application tables** are defined in Prisma schema, while **10+ additional tables** are accessed exclusively via Supabase client.

---

## 1. TABLES ALREADY IN PRISMA (Core Application Tables)

### Defined in `prisma/schema.prisma` - PUBLIC SCHEMA

| Table | Prisma Model | Status | Primary Usage |
|-------|--------------|--------|---------------|
| `charts` | `Chart` | ✅ MIGRATED | Natal chart data (user.service.ts, chart.service.ts, dating.service.ts, connections.service.ts) |
| `connections` | `Connection` | ✅ MIGRATED | Astrological synastry/composite connections (connections.service.ts) |
| `dating_matches` | `DatingMatch` | ✅ MIGRATED | Dating compatibility matches cache (dating.service.ts) |
| `subscriptions` | `Subscription` | ✅ MIGRATED | User subscription/tier management (user.service.ts, chart.service.ts) |
| `users` | `public_users` | ✅ MIGRATED | User profile data (user.service.ts, dating.service.ts, chart.service.ts) |

### Usage Files Using Prisma for These Tables:
- `/home/user/AstraLink/backend/src/user/user.service.ts` - Uses Prisma for user & subscription management
- `/home/user/AstraLink/backend/src/chart/chart.service.ts` - Uses Prisma for subscription cache
- `/home/user/AstraLink/backend/src/dating/dating.service.ts` - Uses Prisma for Chart, DatingMatch queries
- `/home/user/AstraLink/backend/src/connections/connections.service.ts` - Uses Prisma for Connection & Chart
- `/home/user/AstraLink/backend/src/repositories/user.repository.ts` - Fallback Prisma + Supabase
- `/home/user/AstraLink/backend/src/repositories/chart.repository.ts` - Fallback Prisma + Supabase

---

## 2. TABLES STILL USING SUPABASE CLIENT ONLY (NOT IN PRISMA)

### Supabase-Only Tables Discovered

| Table | Accessed By | Operations | Status |
|-------|------------|-----------|--------|
| `user_profiles` | dating.service.ts<br/>user.controller.ts | SELECT, UPDATE | ⚠️ SUPABASE ONLY |
| `user_photos` | user-photos.service.ts<br/>dating.service.ts<br/>chat.service.ts | INSERT, SELECT, UPDATE, DELETE | ⚠️ SUPABASE ONLY |
| `user_blocks` | user.service.ts | INSERT, SELECT | ⚠️ SUPABASE ONLY |
| `user_reports` | user.service.ts | INSERT | ⚠️ SUPABASE ONLY |
| `messages` | chat.service.ts | SELECT, INSERT, UPDATE | ⚠️ SUPABASE ONLY |
| `matches` | chat.service.ts | SELECT, INSERT, UPDATE | ⚠️ SUPABASE ONLY |
| `payments` | subscription.service.ts<br/>subscription.controller.ts | INSERT, SELECT | ⚠️ SUPABASE ONLY |
| `feature_usage` | analytics.service.ts<br/>subscription.controller.ts | SELECT, INSERT | ⚠️ SUPABASE ONLY |
| `user_fomo_counters` | (referenced in .from()) | Unknown | ⚠️ SUPABASE ONLY |
| `_test_connection` | (test table) | Test operations | ⚠️ TEST TABLE |

---

## 3. DETAILED SERVICE BREAKDOWN

### 3.1 USER SERVICE (`user.service.ts`)

**Prisma Usage (for data operations):**
```typescript
// Line 416: Using Prisma transactions for atomic operations
await this.prisma.$transaction(async (tx) => {
  await tx.chart.deleteMany({ where: { userId } });
  await tx.connection.deleteMany({ where: { userId } });
  await tx.datingMatch.deleteMany({ where: { userId } });
  await tx.subscription.deleteMany({ where: { userId } });
  await tx.public_users.delete({ where: { id: userId } });
});
```

**Supabase Client Usage:**
```typescript
// Lines 141-144: Insert user profile (users table - public schema)
const { data: inserted } = await admin
  .from('users')
  .insert(insertPayload)
  .select()
  .single();

// Lines 312-313: Block users via Supabase (user_blocks table - SUPABASE ONLY)
const { error: insErr } = await client
  .from('user_blocks')
  .insert({ user_id: uid, blocked_user_id: blockedUserId });

// Lines 376-378: Report users (user_reports table - SUPABASE ONLY)
const { error: insErr } = await client
  .from('user_reports')
  .insert({ reporter_id: uid, reported_user_id: reportedUserId, reason });

// Line 264: Delete charts via Supabase (when recreating with new birth data)
await adminClient.from('charts').delete().eq('user_id', userId);
```

### 3.2 CHART SERVICE (`chart.service.ts`)

**Prisma Usage:**
```typescript
// Line 58: Get subscription with caching
const subscription = await this.prisma.subscription.findUnique({
  where: { userId },
});
```

**Supabase Client Usage:**
```typescript
// Lines 317-323: Check AI generation rate limit
const { data: chartData } = await adminClient
  .from('charts')
  .select('ai_generated_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// Lines 352-355: Update AI generation timestamp
const { error: updateError } = await adminClient
  .from('charts')
  .update({ ai_generated_at: new Date().toISOString() })
  .eq('user_id', userId);
```

### 3.3 DATING SERVICE (`dating.service.ts`)

**Prisma Usage:**
```typescript
// Lines 491-495: Get cached dating matches
const cached = await this.prisma.datingMatch.findMany({
  where: { userId, createdAt: { gte: since } },
  orderBy: { compatibility: 'desc' },
});

// Lines 502-505: Get user's natal chart
const selfChart = await this.prisma.chart.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' },
});

// Lines 510-516: Get candidate charts for compatibility calculation
const candidates = await this.prisma.chart.findMany({
  where: { NOT: { userId } },
  include: { users: true },
  take: 200,
});

// Lines 616-619: Update dating matches cache
await this.prisma.datingMatch.deleteMany({ where: { userId } });
await this.prisma.datingMatch.createMany({ data: topRows });
```

**Supabase Client Usage:**
```typescript
// Lines 200-217: Fetch candidate data (users, user_profiles, charts tables - MIXED)
const [{ data: users }, { data: profiles }, { data: charts }] =
  await Promise.all([
    admin.from('users').select(...).in('id', candidateIds),
    admin.from('user_profiles').select(...).in('user_id', candidateIds),  // SUPABASE ONLY
    admin.from('charts').select(...).in('user_id', candidateIds),
  ]);

// Lines 697-723: Get public profile data (MULTIPLE TABLES)
client.from('users').select(...).eq('id', targetUserId);           // In Prisma
client.from('user_profiles').select(...).eq('user_id', targetUserId); // SUPABASE ONLY
client.from('charts').select(...).eq('user_id', targetUserId);     // In Prisma
client.from('user_photos').select(...).eq('user_id', targetUserId); // SUPABASE ONLY
```

### 3.4 SUBSCRIPTION SERVICE (`subscription.service.ts`)

**Supabase Client Usage (Heavy - SHOULD BE MIGRATED):**
```typescript
// Lines 33-36: Get subscription (uses .fromAdmin() - Supabase wrapper)
const { data: subscription } = await this.supabaseService
  .fromAdmin('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// Lines 256-270: Upsert subscription (create/update)
const { data: subData } = await this.supabaseService
  .fromAdmin('subscriptions')
  .upsert({...}, { onConflict: 'user_id' })
  .select()
  .single();

// Line 279: Insert payment record (payments table - SUPABASE ONLY)
await this.supabaseService.fromAdmin('payments').insert({...});

// Lines 320-325: Update chart with AI interpretation
await this.supabaseService
  .fromAdmin('charts')
  .update({ data: updatedData })
  .eq('id', chartRec.id);
```

**NOTE:** Subscription table is in Prisma but service uses Supabase wrapper instead!

### 3.5 CONNECTIONS SERVICE (`connections.service.ts`)

**Prisma Usage (FULLY PRISMA):**
```typescript
// Lines 25-31: Create connection
await this.prisma.connection.create({
  data: { userId, targetName, targetData }
});

// Lines 35-38: Get connections
await this.prisma.connection.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});

// Lines 123-126: Get user chart
const userChart = await this.prisma.chart.findFirst({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});
```

### 3.6 USER PHOTOS SERVICE (`user-photos.service.ts`)

**Supabase Client Usage (100% Supabase):**
```typescript
// Lines 53-57: Check existing photos
const { data: existing } = await admin
  .from('user_photos')  // SUPABASE ONLY
  .select('id')
  .eq('user_id', userId);

// Lines 67-75: Insert photo record
const { data } = await admin
  .from('user_photos')  // SUPABASE ONLY
  .insert({...})
  .select(...);

// Lines 114-119: List photos with pagination
const { data } = await admin
  .from('user_photos')  // SUPABASE ONLY
  .select(...)
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

### 3.7 USER REPOSITORY (`user.repository.ts`)

**Mixed Strategy (Fallback Pattern):**
```typescript
// Tries: Admin Client → Regular Client → Hardcoded test users
async findById(userId: string): Promise<UserProfile | null> {
  const adminResult = await this.findByIdAdmin(userId);      // Supabase
  const regularResult = await this.findByIdRegular(userId);  // Supabase
  const testUser = this.getTestUser(userId);                 // Fallback
}

// All uses direct Supabase admin client for user_profiles (SUPABASE ONLY)
const { data } = await this.supabase.getUserProfileAdmin(userId);
```

### 3.8 CHART REPOSITORY (`chart.repository.ts`)

**Mixed Strategy (Fallback Pattern):**
```typescript
// Tries: Prisma → Admin Client → Regular Client
async findByUserId(userId: string): Promise<NatalChart | null> {
  const prismaResult = await this.findByUserIdPrisma(userId);  // Prisma (fastest)
  const adminResult = await this.findByUserIdAdmin(userId);    // Supabase fallback
  const regularResult = await this.findByUserIdRegular(userId); // Supabase RLS fallback
}

// Prisma operations
const chart = await this.prisma.chart.findFirst({...});
const created = await this.prisma.chart.create({...});
const updated = await this.prisma.chart.update({...});

// Supabase fallback
const { data } = await this.supabase.getUserChartsAdmin(userId);
```

---

## 4. SUMMARY TABLE: Which Tables Are Where?

```
┌─────────────────────┬──────────┬──────────────┬─────────────────────┐
│ Table               │ Prisma?  │ Supabase?    │ Primary Access Path │
├─────────────────────┼──────────┼──────────────┼─────────────────────┤
│ charts              │ ✅ YES   │ ✅ YES*      │ Mixed (Prisma pref) │
│ connections         │ ✅ YES   │ ❌ NO        │ Prisma only         │
│ dating_matches      │ ✅ YES   │ ❌ NO        │ Prisma only         │
│ subscriptions       │ ✅ YES   │ ✅ YES*      │ Supabase (wrapped)  │
│ users (public)      │ ✅ YES   │ ✅ YES*      │ Mixed               │
├─────────────────────┼──────────┼──────────────┼─────────────────────┤
│ user_profiles       │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ user_photos         │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ user_blocks         │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ user_reports        │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ messages            │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ matches             │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ payments            │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ feature_usage       │ ❌ NO    │ ✅ YES       │ Supabase only       │
│ user_fomo_counters  │ ❌ NO    │ ✅ YES       │ Supabase only       │
└─────────────────────┴──────────┴──────────────┴─────────────────────┘
* = Has Prisma model but Supabase client also used
```

---

## 5. ISSUES & OPPORTUNITIES

### 🔴 CRITICAL ISSUES

1. **Subscription Service Inconsistency**
   - `Subscription` table is defined in Prisma but service uses `fromAdmin('subscriptions')` instead
   - **Impact:** Bypasses ORM benefits, inconsistent data access pattern
   - **Files:** `subscription.service.ts` lines 33-280

2. **Mixed Access in Chart Service**
   - Some chart operations use Prisma, others use raw Supabase
   - **Impact:** Inconsistent caching, potential race conditions
   - **Files:** `chart.service.ts` lines 58, 317-355

3. **User Profile Table Missing from Prisma**
   - `user_profiles` table accessed throughout codebase but NOT in schema
   - **Impact:** Type safety lost, ORM benefits unavailable
   - **Files:** `dating.service.ts`, `user.controller.ts`

4. **Photos Management Not in Prisma**
   - `user_photos` accessed only via Supabase
   - **Impact:** Storage metadata separated from ORM
   - **Files:** `user-photos.service.ts` (entire file)

### 🟡 MODERATE CONCERNS

1. **Subscription Access Pattern Inconsistency**
   - `subscription.service.ts` uses `.fromAdmin()` wrapper instead of Prisma client
   - Table IS in Prisma but not being used
   - **Files:** All subscription operations in `subscription.service.ts`

2. **Chat & Messaging Tables Not in Prisma**
   - `messages` and `matches` tables only accessible via Supabase
   - **Impact:** No type safety, no query optimization
   - **Files:** `chat.service.ts`, `analytics.service.ts`

3. **Repository Fallback Pattern**
   - User & Chart repositories try Prisma, then fallback to Supabase
   - **Impact:** Unclear which is primary, potential consistency issues
   - **Files:** `user.repository.ts`, `chart.repository.ts`

### 🟢 WHAT'S WORKING WELL

1. **Core Business Models Migrated**
   - Chart, Connection, DatingMatch, Subscription (schema) all in Prisma
   - Connections service uses Prisma-only
   - Dating matches cache uses Prisma

2. **Atomic Transactions**
   - User deletion uses Prisma `$transaction()` for atomic multi-table operations
   - Good transaction handling in `deleteAccount()` method

---

## 6. MIGRATION ROADMAP

### Phase 1 (High Priority)
- [ ] Add `user_profiles` model to Prisma schema
- [ ] Migrate `subscription.service.ts` from `.fromAdmin()` to Prisma client
- [ ] Update chart service to use Prisma for AI timestamp updates

### Phase 2 (Medium Priority)
- [ ] Add `user_photos` model to Prisma schema
- [ ] Migrate user-photos.service.ts to use Prisma
- [ ] Add `user_blocks` and `user_reports` models

### Phase 3 (Lower Priority)
- [ ] Add `messages` and `matches` models to Prisma
- [ ] Add `payments` and `feature_usage` models
- [ ] Refactor repositories to use Prisma-first pattern (remove Supabase fallbacks)

---

## 7. FILES TO MIGRATE (Priority Order)

**MUST MIGRATE FIRST:**
1. `/home/user/AstraLink/backend/src/subscription/subscription.service.ts` - Replace `.fromAdmin()` with Prisma client
2. Add `user_profiles` to prisma/schema.prisma

**SHOULD MIGRATE NEXT:**
3. `/home/user/AstraLink/backend/src/user/user-photos.service.ts` - Entire file
4. `/home/user/AstraLink/backend/src/dating/dating.service.ts` - For user_profiles queries

**NICE TO HAVE:**
5. `/home/user/AstraLink/backend/src/chat/chat.service.ts` - For messages table
6. `/home/user/AstraLink/backend/src/analytics/analytics.service.ts` - For feature_usage table

---

## 8. CODEBASE STATISTICS

- **Total Supabase Table References:** 14 tables
- **Tables in Prisma:** 5 tables
- **Tables Only in Supabase:** 10+ tables
- **Files Using Supabase for Data:** 8+ service files
- **Files Using Prisma Primarily:** 5+ service/repository files
- **Mixed Access Pattern Files:** 6+ files

---

Generated: 2024
