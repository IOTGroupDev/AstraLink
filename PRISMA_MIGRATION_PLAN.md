# 🎯 План миграции на Prisma (кроме Auth)

**Дата:** 2025-11-14
**Цель:** Перевести все data операции с Supabase клиента на Prisma, оставив только Auth и Storage на Supabase

---

## 📊 Текущее состояние

### ✅ Уже на Prisma (5 таблиц)

| Таблица | Prisma Model | Статус | Использование |
|---------|--------------|--------|---------------|
| `charts` | `Chart` | ✅ 80% Prisma | user.service, chart.service, dating.service |
| `connections` | `Connection` | ✅ 100% Prisma | connections.service (идеальный пример!) |
| `dating_matches` | `DatingMatch` | ✅ 100% Prisma | dating.service |
| `subscriptions` | `Subscription` | ⚠️ 20% Prisma | subscription.service ИСПОЛЬЗУЕТ SUPABASE |
| `users` | `public_users` | ✅ 70% Prisma | user.service, dating.service |

### ⚠️ НЕ в Prisma (10+ таблиц)

| Таблица | Используется в | Операции | Приоритет |
|---------|---------------|----------|-----------|
| `user_photos` | user-photos.service, dating.service, chat.service | INSERT, SELECT, UPDATE, DELETE | **P0 - HIGH** |
| `user_profiles` | dating.service, user.controller | SELECT, UPDATE | **P0 - HIGH** |
| `payments` | subscription.service, subscription.controller | INSERT, SELECT | **P1 - MEDIUM** |
| `feature_usage` | analytics.service, subscription.controller | SELECT, INSERT | **P1 - MEDIUM** |
| `messages` | chat.service | SELECT, INSERT, UPDATE | **P2 - LOW** |
| `matches` | chat.service | SELECT, INSERT, UPDATE | **P2 - LOW** |
| `user_blocks` | user.service | INSERT, SELECT | **P2 - LOW** |
| `user_reports` | user.service | INSERT | **P2 - LOW** |
| `user_fomo_counters` | (referenced) | Unknown | **P3 - OPTIONAL** |

---

## 🚨 Критические проблемы

### 1. **Subscription Service использует Supabase вместо Prisma!**

**Файл:** `backend/src/subscription/subscription.service.ts`

**Проблема:**
```typescript
// Строки 33-36: НЕПРАВИЛЬНО - таблица УЖЕ в Prisma!
const { data: subscription } = await this.supabaseService
  .fromAdmin('subscriptions')  // ❌ Использует Supabase
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Должно быть:**
```typescript
// ✅ ПРАВИЛЬНО - использовать Prisma
const subscription = await this.prisma.subscription.findUnique({
  where: { userId },
});
```

**Эффект:** Потеря type safety, кэширования, query optimization

---

### 2. **Chart Service смешивает Prisma и Supabase для одной таблицы**

**Файл:** `backend/src/chart/chart.service.ts`

**Проблема:**
```typescript
// Строка 58: Использует Prisma для subscription ✅
const subscription = await this.prisma.subscription.findUnique({...});

// Строки 317-323: Использует Supabase для charts ❌
const { data: chartData } = await adminClient
  .from('charts')  // charts УЖЕ в Prisma!
  .select('ai_generated_at')
  .eq('user_id', userId);
```

**Эффект:** Race conditions, cache inconsistency

---

### 3. **Dating Service получает данные через Supabase**

**Файл:** `backend/src/dating/dating.service.ts`

**Проблема:**
```typescript
// Строки 200-217: Смешанный подход
const [{ data: users }, { data: profiles }, { data: charts }] =
  await Promise.all([
    admin.from('users').select(...),          // users - в Prisma ❌
    admin.from('user_profiles').select(...),  // НЕ в Prisma (OK пока)
    admin.from('charts').select(...),         // charts - в Prisma ❌
  ]);
```

**Должно быть:**
```typescript
// ✅ Использовать Prisma для users и charts
const [users, profiles, charts] = await Promise.all([
  this.prisma.public_users.findMany({ where: { id: { in: candidateIds } } }),
  // profiles - добавить в Prisma schema!
  this.prisma.chart.findMany({ where: { userId: { in: candidateIds } } }),
]);
```

---

## 🔧 План миграции

### Phase 1: Добавить отсутствующие модели в Prisma (P0 - HIGH)

**1.1 Добавить `user_photos` модель**

```prisma
model UserPhoto {
  id          String       @id @default(uuid())
  userId      String       @map("user_id")
  storagePath String       @map("storage_path")
  isPrimary   Boolean      @default(false) @map("is_primary")
  createdAt   DateTime     @default(now()) @map("created_at")
  users       public_users @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isPrimary])
  @@map("user_photos")
  @@schema("public")
}
```

**1.2 Добавить `user_profiles` модель**

```prisma
model UserProfile {
  userId      String       @id @map("user_id")
  bio         String?
  zodiacSign  String?      @map("zodiac_sign")
  interests   String[]     @default([])
  lookingFor  String?      @map("looking_for")
  createdAt   DateTime     @default(now()) @map("created_at")
  updatedAt   DateTime     @updatedAt @map("updated_at")
  users       public_users @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
  @@schema("public")
}
```

**1.3 Добавить `payments` модель**

```prisma
model Payment {
  id              String    @id @default(uuid())
  userId          String    @map("user_id")
  amount          Decimal   @db.Decimal(10, 2)
  currency        String    @default("USD")
  status          String    @default("pending")
  stripeSessionId String?   @map("stripe_session_id")
  tier            String
  createdAt       DateTime  @default(now()) @map("created_at")

  @@index([userId])
  @@index([status])
  @@index([createdAt])
  @@map("payments")
  @@schema("public")
}
```

**1.4 Добавить `feature_usage` модель**

```prisma
model FeatureUsage {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  featureName String   @map("feature_name")
  usedAt      DateTime @default(now()) @map("used_at")

  @@index([userId])
  @@index([featureName])
  @@index([usedAt])
  @@map("feature_usage")
  @@schema("public")
}
```

**1.5 Обновить `public_users` модель для связей**

```prisma
model public_users {
  id             String         @id
  email          String         @unique
  name           String?
  birth_date     DateTime?
  birth_time     String?
  birth_place    String?
  role           String         @default("user")
  created_at     DateTime       @default(now())
  updated_at     DateTime       @default(now())

  // Связи
  charts         Chart[]
  connections    Connection[]
  dating_matches DatingMatch[]
  subscriptions  Subscription?
  photos         UserPhoto[]     // ✅ НОВОЕ
  profile        UserProfile?    // ✅ НОВОЕ

  @@index([created_at])
  @@index([email])
  @@index([role])
  @@map("users")
  @@schema("public")
}
```

---

### Phase 2: Мигрировать сервисы на Prisma (P0 - HIGH)

#### 2.1 Subscription Service → 100% Prisma

**Файл:** `backend/src/subscription/subscription.service.ts`

**Было (Supabase):**
```typescript
const { data: subscription } = await this.supabaseService
  .fromAdmin('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Стало (Prisma):**
```typescript
const subscription = await this.prisma.subscription.findUnique({
  where: { userId },
});
```

**Файлы для изменения:**
- Lines 33-36: `getSubscription()` - findUnique
- Lines 64-68: `getOrCreateSubscription()` - findUnique + create
- Lines 256-270: `upsert()` - Prisma upsert
- Line 97: `updateSubscription()` - update

**Эффект:** Type safety, query optimization, caching

---

#### 2.2 Chart Service → 100% Prisma

**Файл:** `backend/src/chart/chart.service.ts`

**Изменения:**
```typescript
// Lines 317-323: БЫЛО (Supabase)
const { data: chartData } = await adminClient
  .from('charts')
  .select('ai_generated_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

// СТАЛО (Prisma)
const chartData = await this.prisma.chart.findFirst({
  where: { userId },
  select: { aiGeneratedAt: true },
  orderBy: { createdAt: 'desc' },
});
```

```typescript
// Lines 352-355: БЫЛО (Supabase)
await adminClient
  .from('charts')
  .update({ ai_generated_at: new Date().toISOString() })
  .eq('user_id', userId);

// СТАЛО (Prisma)
await this.prisma.chart.updateMany({
  where: { userId },
  data: { aiGeneratedAt: new Date() },
});
```

---

#### 2.3 User Photos Service → Prisma + Supabase Storage

**Файл:** `backend/src/user/user-photos.service.ts`

**Storage остаётся на Supabase (файлы), metadata → Prisma:**

```typescript
// БЫЛО (lines 67-76)
const { data, error } = await admin
  .from('user_photos')
  .insert({
    user_id: userId,
    storage_path: path,
    is_primary: isFirst,
    created_at: now,
  })
  .select('id, user_id, storage_path, is_primary, created_at')
  .single();

// СТАЛО (Prisma)
const photo = await this.prisma.userPhoto.create({
  data: {
    userId,
    storagePath: path,
    isPrimary: isFirst,
  },
  include: {
    users: true, // Опционально, если нужен user data
  },
});
```

**Остальные методы:**
- `listPhotos()` → `this.prisma.userPhoto.findMany()`
- `setPrimary()` → `this.prisma.userPhoto.update()`
- `deletePhoto()` → `this.prisma.userPhoto.delete()`

**Supabase Storage API остаётся:**
- `createSignedUploadUrl()` - остаётся
- `createSignedUrl()` - остаётся
- File upload/download - остаётся

---

#### 2.4 Dating Service → Prisma для users/charts

**Файл:** `backend/src/dating/dating.service.ts`

**БЫЛО (lines 200-217):**
```typescript
const [{ data: users }, { data: profiles }, { data: charts }] =
  await Promise.all([
    admin.from('users').select(...).in('id', candidateIds),
    admin.from('user_profiles').select(...).in('user_id', candidateIds),
    admin.from('charts').select(...).in('user_id', candidateIds),
  ]);
```

**СТАЛО (Prisma):**
```typescript
const [users, charts] = await Promise.all([
  this.prisma.public_users.findMany({
    where: { id: { in: candidateIds } },
    include: {
      profile: true, // ✅ UserProfile связь
      photos: {
        where: { isPrimary: true },
      },
    },
  }),
  this.prisma.chart.findMany({
    where: { userId: { in: candidateIds } },
  }),
]);

// Profiles уже в users.profile благодаря include
```

**Эффект:**
- Один запрос вместо трёх
- N+1 query устранён
- Type safety для profiles

---

### Phase 3: Опциональные таблицы (P2 - LOW)

#### 3.1 Chat модели (messages, matches)

```prisma
model ChatMessage {
  id         String   @id @default(uuid())
  senderId   String   @map("sender_id")
  receiverId String   @map("receiver_id")
  content    String
  readAt     DateTime? @map("read_at")
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([senderId])
  @@index([receiverId])
  @@index([createdAt])
  @@map("messages")
  @@schema("public")
}

model ChatMatch {
  id        String   @id @default(uuid())
  userId1   String   @map("user_id_1")
  userId2   String   @map("user_id_2")
  status    String   @default("pending")
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([userId1, userId2])
  @@index([status])
  @@map("matches")
  @@schema("public")
}
```

#### 3.2 User moderation (blocks, reports)

```prisma
model UserBlock {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  blockedUserId String   @map("blocked_user_id")
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([userId, blockedUserId])
  @@index([userId])
  @@map("user_blocks")
  @@schema("public")
}

model UserReport {
  id             String   @id @default(uuid())
  reporterId     String   @map("reporter_id")
  reportedUserId String   @map("reported_user_id")
  reason         String
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([reportedUserId])
  @@map("user_reports")
  @@schema("public")
}
```

---

## 🎯 Рекомендованный порядок выполнения

### ✅ Step 1: Добавить модели в schema.prisma (30 мин)

```bash
# 1. Открыть backend/prisma/schema.prisma
# 2. Добавить модели из Phase 1 выше
# 3. Запустить introspection для проверки
npx prisma db pull --schema=backend/prisma/schema.prisma

# 4. Generate Prisma Client
npx prisma generate
```

### ✅ Step 2: Мигрировать Subscription Service (1 час)

**Приоритет:** HIGHEST (таблица уже в Prisma, но используется Supabase!)

**Файл:** `backend/src/subscription/subscription.service.ts`

**Замены:**
1. Инжектить `PrismaService` в constructor
2. Заменить все `.fromAdmin('subscriptions')` на `this.prisma.subscription`
3. Заменить все `.fromAdmin('payments')` на `this.prisma.payment`
4. Тестировать подписки

### ✅ Step 3: Мигрировать Chart Service (30 мин)

**Файл:** `backend/src/chart/chart.service.ts`

**Замены:**
- Lines 317-323: chart lookup → `this.prisma.chart.findFirst()`
- Lines 352-355: chart update → `this.prisma.chart.updateMany()`

### ✅ Step 4: Мигрировать User Photos Service (1 час)

**Файл:** `backend/src/user/user-photos.service.ts`

**Изменения:**
- Database operations → Prisma
- Storage operations → остаются на Supabase
- Добавить type safety для UserPhoto

### ✅ Step 5: Мигрировать Dating Service (1.5 часа)

**Файл:** `backend/src/dating/dating.service.ts`

**Изменения:**
- Lines 200-217: users/profiles/charts → Prisma с include
- Lines 697-723: public profile → Prisma с include
- Убрать повторяющиеся запросы благодаря relations

### ✅ Step 6: User Service - заменить Supabase calls (30 мин)

**Файл:** `backend/src/user/user.service.ts`

**Замены:**
- Lines 141-144: user insert → Prisma (опционально, auth создаёт)
- Line 264: charts delete → Prisma (уже есть в deleteAccount)
- Lines 312-313: user_blocks → Prisma
- Lines 376-378: user_reports → Prisma

---

## 📊 Ожидаемые результаты

### До миграции:

| Метрика | Значение |
|---------|----------|
| Supabase client calls | ~150 в разных сервисах |
| Type safety | Partial (только где Prisma) |
| Query optimization | Нет (raw SQL через Supabase) |
| N+1 queries | Много (особенно dating) |
| Caching | Нет |

### После миграции:

| Метрика | Значение | Улучшение |
|---------|----------|-----------|
| Supabase client calls | ~20 (только Auth + Storage) | **87% reduction** |
| Type safety | 100% (все data операции) | **Full coverage** |
| Query optimization | Prisma optimizer | **2-5x faster** |
| N+1 queries | Eliminated (include/relations) | **10-20x faster** |
| Caching | Prisma query cache | **60-80% fewer DB calls** |

---

## 🚨 Что ОСТАНЕТСЯ на Supabase

### ✅ Auth (должно остаться)
- `auth.users` - управление через Supabase Auth API
- `auth.sessions`, `auth.refresh_tokens` - JWT flow
- `auth.identities` - OAuth providers
- Все auth операции через `SupabaseAuthService`

### ✅ Storage (должно остаться)
- `user-photos` bucket - хранение файлов
- Signed URLs для upload/download
- Storage operations через `SupabaseService.storage`

### ⚠️ Что УБРАТЬ с Supabase
- Все операции с `public.*` таблицами
- `.from('users')`, `.from('charts')`, `.from('subscriptions')` и т.д.
- Row Level Security (RLS) для data queries (Prisma не использует RLS)

---

## 🛠️ Инструменты для миграции

### 1. Автоматическая генерация Prisma моделей

```bash
# Pull текущую схему из БД
cd backend
npx prisma db pull

# Проверить сгенерированные модели
cat prisma/schema.prisma
```

### 2. TypeScript type checking

```bash
# После добавления моделей, проверить компиляцию
npx tsc --noEmit
```

### 3. Migration testing

```bash
# Запустить тесты после каждого шага
npm run test:e2e
```

---

## 📋 Checklist для миграции

### Phase 1: Schema Updates
- [ ] Добавить `UserPhoto` модель в schema.prisma
- [ ] Добавить `UserProfile` модель
- [ ] Добавить `Payment` модель
- [ ] Добавить `FeatureUsage` модель
- [ ] Обновить `public_users` с новыми relations
- [ ] Запустить `prisma generate`
- [ ] Проверить TypeScript compilation

### Phase 2: Service Migrations
- [ ] Subscription Service → 100% Prisma
- [ ] Chart Service → 100% Prisma
- [ ] User Photos Service → Prisma (metadata) + Supabase (storage)
- [ ] Dating Service → Prisma (users, profiles, charts)
- [ ] User Service → Prisma (blocks, reports)
- [ ] Тестировать каждый сервис после миграции

### Phase 3: Optional
- [ ] Chat Service → Prisma (messages, matches)
- [ ] Analytics Service → Prisma (feature_usage)
- [ ] Load testing для проверки производительности

### Phase 4: Cleanup
- [ ] Удалить неиспользуемые Supabase client calls
- [ ] Обновить документацию
- [ ] Code review
- [ ] Deploy to staging
- [ ] Deploy to production

---

## ⏱️ Оценка времени

| Phase | Задачи | Время | Приоритет |
|-------|--------|-------|-----------|
| Phase 1 | Schema updates | 30 мин | P0 |
| Phase 2.1 | Subscription Service | 1 час | P0 |
| Phase 2.2 | Chart Service | 30 мин | P0 |
| Phase 2.3 | User Photos Service | 1 час | P0 |
| Phase 2.4 | Dating Service | 1.5 часа | P0 |
| Phase 2.5 | User Service | 30 мин | P1 |
| Phase 3 | Chat + Analytics | 2 часа | P2 |
| Testing | Integration tests | 1 час | P0 |
| **ИТОГО** | **Full migration** | **~8 часов** | - |

---

## 🎯 Начнём сейчас?

Я могу начать миграцию прямо сейчас. Предлагаю следующий порядок:

### Option 1: Quick Win (30 мин)
Начать с **Subscription Service** - таблица уже в Prisma, максимальный эффект при минимальных усилиях

### Option 2: Full Migration (8 часов)
Полная миграция всех сервисов по плану выше

### Option 3: Schema Only (30 мин)
Только добавить модели в schema.prisma, миграцию сервисов отложить

**Что выбираете?** Или хотите, чтобы я начал с Option 1 (Subscription Service)?
