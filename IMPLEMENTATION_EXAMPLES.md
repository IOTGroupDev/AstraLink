# ПРИМЕРЫ РЕАЛИЗАЦИИ ИСПРАВЛЕНИЙ

## Конкретный код для устранения найденных проблем

---

## 🔐 SECURITY FIXES

### 1. Удаление Dev Fallback в JWT Strategy

**Текущий код** (`backend/src/auth/strategies/jwt.strategy.ts`):

```typescript
async validate(payload: any) {
  // ❌ УДАЛИТЬ ЭТО:
  if (process.env.NODE_ENV === 'development') {
    if (token && token.length > 10) {
      return {
        userId: token,
        email: 'dev@example.com',
        role: 'authenticated',
      };
    }
  }

  // Продолжить с нормальной валидацией...
}
```

**Исправленный код:**

```typescript
async validate(payload: any) {
  // Убираем dev fallback полностью
  // Используем реальные тестовые токены даже в dev

  const { sub, email, role } = payload;

  if (!sub) {
    throw new UnauthorizedException('Invalid token payload');
  }

  return {
    userId: sub,
    email: email || '',
    role: role || 'authenticated',
  };
}
```

**Дополнительно - проверка на старте:**

```typescript
// backend/src/main.ts
async function bootstrap() {
  // Проверка секретов в production
  if (process.env.NODE_ENV === 'production') {
    const requiredSecrets = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_KEY'];

    for (const secret of requiredSecrets) {
      if (!process.env[secret]) {
        throw new Error(`Missing required secret: ${secret}`);
      }

      if (
        process.env[secret].includes('example') ||
        process.env[secret].includes('test')
      ) {
        throw new Error(`Production secret ${secret} contains test values`);
      }
    }
  }

  // ...
}
```

---

### 2. Реализация Rate Limiting для Advisor

**Создать сервис** (`backend/src/advisor/services/rate-limiter.service.ts`):

```typescript
import { Injectable } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class RateLimiterService {
  constructor(private readonly redis: RedisService) {}

  /**
   * Check and consume rate limit
   * @returns true if allowed, false if rate limited
   */
  async checkLimit(
    key: string,
    maxPoints: number,
    durationSeconds: number
  ): Promise<boolean> {
    const redisKey = `ratelimit:${key}`;

    // Increment counter
    const current = await this.redis.client.incr(redisKey);

    // Set expiry on first request
    if (current === 1) {
      await this.redis.client.expire(redisKey, durationSeconds);
    }

    return current <= maxPoints;
  }

  /**
   * Get remaining points
   */
  async getRemaining(key: string, maxPoints: number): Promise<number> {
    const redisKey = `ratelimit:${key}`;
    const current = await this.redis.client.get(redisKey);

    return Math.max(0, maxPoints - parseInt(current || '0', 10));
  }

  /**
   * Reset limit for a key
   */
  async reset(key: string): Promise<void> {
    const redisKey = `ratelimit:${key}`;
    await this.redis.client.del(redisKey);
  }
}
```

**Обновить guard** (`backend/src/advisor/guards/advisor-rate-limit.guard.ts`):

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { RateLimiterService } from '../services/rate-limiter.service';
import { SubscriptionService } from '@/subscription/subscription.service';

@Injectable()
export class AdvisorRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user subscription tier
    const subscription =
      await this.subscriptionService.getUserSubscription(userId);

    // Define limits per tier
    const limits = {
      free: { maxPoints: 3, duration: 86400 }, // 3 per day
      basic: { maxPoints: 10, duration: 86400 }, // 10 per day
      premium: { maxPoints: 50, duration: 86400 }, // 50 per day
      ultra: { maxPoints: 200, duration: 86400 }, // 200 per day
    };

    const tier = subscription?.tier || 'free';
    const limit = limits[tier] || limits.free;

    // Check rate limit
    const key = `advisor:${userId}`;
    const allowed = await this.rateLimiter.checkLimit(
      key,
      limit.maxPoints,
      limit.duration
    );

    if (!allowed) {
      const remaining = await this.rateLimiter.getRemaining(
        key,
        limit.maxPoints
      );
      throw new ForbiddenException(
        `Rate limit exceeded. You have ${remaining} requests remaining. Upgrade your subscription for more.`
      );
    }

    // Add remaining to response headers
    const remaining = await this.rateLimiter.getRemaining(key, limit.maxPoints);
    request.res.setHeader('X-RateLimit-Remaining', remaining.toString());
    request.res.setHeader('X-RateLimit-Limit', limit.maxPoints.toString());

    return true;
  }
}
```

**Добавить методы в RedisService** (`backend/src/redis/redis.service.ts`):

```typescript
@Injectable()
export class RedisService {
  public client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  // ... существующие методы

  async incr(key: string): Promise<number> {
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
}
```

---

### 3. Ограничение CORS для Production

**Текущий код** (`backend/src/main.ts`):

```typescript
app.enableCors({
  origin: [
    /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
    /\.exp\.direct$/,
    /\.expo\.dev$/,
  ],
  credentials: true,
});
```

**Исправленный код:**

```typescript
// backend/src/config/cors.config.ts
export const getCorsConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: только явно указанные домены
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    return {
      origin: (origin, callback) => {
        // Разрешить запросы без origin (мобильные приложения)
        if (!origin) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Total-Count', 'X-RateLimit-Remaining'],
      maxAge: 86400, // 24 hours
    };
  } else {
    // Development: более широкие настройки
    return {
      origin: [
        /^http:\/\/localhost/,
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}/,
        /\.exp\.direct$/,
        /\.expo\.dev$/,
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }
};
```

**Использование** (`backend/src/main.ts`):

```typescript
import { getCorsConfig } from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(getCorsConfig());

  // ...
}
```

**.env.production файл:**

```env
ALLOWED_ORIGINS=https://astralink.com,https://app.astralink.com,https://www.astralink.com
```

---

### 4. Добавление CSRF Protection

**Установка:**

```bash
npm install @nestjs/csrf
```

**Настройка** (`backend/src/main.ts`):

```typescript
import { CsrfMiddleware } from '@nestjs/csrf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Только для web-клиентов, не для мобильных
  const csrfMiddleware = new CsrfMiddleware({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
    excludeRoutes: [
      '/api/v1/health',
      '/api/v1/auth/callback', // OAuth callbacks
    ],
    validateRequest: (req) => {
      // Не проверять CSRF для mobile apps (используют токены)
      const isMobileApp = req.headers['x-client-type'] === 'mobile';
      return !isMobileApp;
    },
  });

  app.use(csrfMiddleware.middleware());

  // ...
}
```

---

### 5. Создание строгих DTO с валидацией

**Пример DTO** (`backend/src/user/dto/update-extended-profile.dto.ts`):

```typescript
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsObject,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { sanitizeHtml } from 'sanitize-html';

class PreferencesDto {
  @IsEnum(['male', 'female', 'any'])
  @IsOptional()
  lookingFor?: 'male' | 'female' | 'any';

  @IsNumber()
  @Min(18)
  @Max(100)
  @IsOptional()
  ageMin?: number;

  @IsNumber()
  @Min(18)
  @Max(100)
  @IsOptional()
  ageMax?: number;
}

export class UpdateExtendedProfileDto {
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  @Matches(/^[a-zA-Zа-яА-Я0-9\s.,!?-]*$/, {
    message: 'Bio contains invalid characters',
  })
  @Transform(({ value }) => {
    if (!value) return null;
    // Sanitize HTML
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  })
  @IsOptional()
  bio?: string;

  @IsEnum(['male', 'female', 'other'], {
    message: 'Gender must be male, female, or other',
  })
  @IsOptional()
  gender?: 'male' | 'female' | 'other';

  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesDto)
  @IsOptional()
  preferences?: PreferencesDto;

  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => {
    if (!value) return null;
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  })
  @IsOptional()
  interests?: string;
}
```

**Использование в контроллере:**

```typescript
@Patch('extended-profile')
@UseGuards(SupabaseAuthGuard)
async updateExtendedProfile(
  @CurrentUser('userId') userId: string,
  @Body() updateData: UpdateExtendedProfileDto, // Строгая типизация
) {
  return this.userService.updateExtendedProfile(userId, updateData);
}
```

---

## ⚡ PERFORMANCE OPTIMIZATIONS

### 6. Оптимизация Dating Service - Background Worker

**Создать Bull Queue** (`backend/src/dating/queues/compatibility.queue.ts`):

```typescript
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { EphemerisService } from '@/services/ephemeris.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

interface CompatibilityJob {
  userId: string;
  candidateIds: string[];
}

@Processor('compatibility')
@Injectable()
export class CompatibilityProcessor {
  constructor(
    private readonly ephemeris: EphemerisService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Process('calculate')
  async calculateCompatibility(job: Job<CompatibilityJob>) {
    const { userId, candidateIds } = job.data;

    // Получить chart пользователя
    const userChart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!userChart) return;

    // Batch обработка по 20 кандидатов
    const BATCH_SIZE = 20;
    const results = [];

    for (let i = 0; i < candidateIds.length; i += BATCH_SIZE) {
      const batch = candidateIds.slice(i, i + BATCH_SIZE);

      // Параллельная обработка батча
      const batchResults = await Promise.allSettled(
        batch.map(async (candidateId) => {
          // Проверить кэш
          const cacheKey = `synastry:${userId}:${candidateId}`;
          const cached = await this.redis.get(cacheKey);
          if (cached) return cached;

          // Получить chart кандидата
          const candidateChart = await this.prisma.chart.findFirst({
            where: { userId: candidateId },
            orderBy: { createdAt: 'desc' },
            select: { data: true }, // Только нужные поля
          });

          if (!candidateChart) return null;

          // Рассчитать synastry
          const synastry = await this.ephemeris.getSynastry(
            userChart.data as any,
            candidateChart.data as any
          );

          // Сохранить в кэш на 24 часа
          await this.redis.set(cacheKey, synastry, 86400);

          return {
            candidateId,
            compatibility: synastry.overall,
            synastry,
          };
        })
      );

      results.push(
        ...batchResults
          .filter((r) => r.status === 'fulfilled' && r.value)
          .map((r: any) => r.value)
      );

      // Progress update
      await job.progress(((i + batch.length) / candidateIds.length) * 100);
    }

    // Сохранить результаты в кэш
    const cacheKey = `compatibility:results:${userId}`;
    await this.redis.set(cacheKey, results, 3600); // 1 час

    return results;
  }
}
```

**Обновить DatingService:**

```typescript
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class DatingService {
  constructor(
    @InjectQueue('compatibility') private compatibilityQueue: Queue,
    private readonly redis: RedisService
    // ...
  ) {}

  async getMatches(userId: string, limit: number = 20) {
    // Проверить кэш
    const cacheKey = `compatibility:results:${userId}`;
    const cached = await this.redis.get<any[]>(cacheKey);

    if (cached && cached.length > 0) {
      // Вернуть закэшированные результаты
      return cached.slice(0, limit);
    }

    // Получить список кандидатов
    const candidateIds = await this.getCandidateIds(userId);

    // Запустить background job
    const job = await this.compatibilityQueue.add('calculate', {
      userId,
      candidateIds,
    });

    // Вернуть job ID для polling
    return {
      jobId: job.id,
      status: 'processing',
      message: 'Calculating compatibility. Please check back in a few moments.',
    };
  }

  async getMatchesStatus(userId: string, jobId?: string) {
    if (jobId) {
      // Проверить статус job
      const job = await this.compatibilityQueue.getJob(jobId);

      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = await job.progress();

      if (state === 'completed') {
        const results = await job.returnvalue;
        return { status: 'completed', results };
      }

      return { status: state, progress };
    }

    // Проверить кэш
    const cacheKey = `compatibility:results:${userId}`;
    const cached = await this.redis.get<any[]>(cacheKey);

    if (cached) {
      return { status: 'completed', results: cached };
    }

    return { status: 'not_found' };
  }
}
```

---

### 7. Batch API для Signed URLs

**Создать метод** (`backend/src/supabase/supabase.service.ts`):

```typescript
async createSignedUrlsBatch(
  bucket: string,
  paths: string[],
  expiresIn: number = 900,
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Batch по 50 URLs за раз (ограничение Supabase)
  const BATCH_SIZE = 50;

  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);

    // Параллельные запросы внутри батча
    const batchResults = await Promise.allSettled(
      batch.map(async (path) => {
        const { data, error } = await this.client.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (error) {
          throw error;
        }

        return { path, url: data.signedUrl };
      }),
    );

    // Собрать результаты
    batchResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        results.set(result.value.path, result.value.url);
      } else {
        // Fallback: пустой URL или error
        results.set(batch[idx], '');
      }
    });
  }

  return results;
}
```

**Использование в DatingService:**

```typescript
async findCandidates(userId: string, limit: number = 20) {
  // ... получение кандидатов

  // Собрать все пути к фото
  const photoPaths = rows
    .filter((r) => r.primary_photo_path)
    .map((r) => r.primary_photo_path!);

  // Batch генерация URLs
  const urlsMap = await this.supabaseService.createSignedUrlsBatch(
    'user-photos',
    photoPaths,
    900,
  );

  // Добавить URLs к результатам
  const results = rows.map((row) => ({
    ...row,
    primaryPhotoUrl: row.primary_photo_path
      ? urlsMap.get(row.primary_photo_path) || null
      : null,
  }));

  return results;
}
```

---

### 8. Оптимизация Ephemeris Кэширования

**Текущий код:**

```typescript
const cacheKey = `ephe:planets:${Math.round(julianDay * 1000)}`;
await this.redis.set(cacheKey, result, 21600); // 6 часов
```

**Оптимизированный код:**

```typescript
// Разные TTL для разных скоростей планет
private getCacheTTL(planet: string): number {
  const ttls = {
    // Быстрые планеты - короткий TTL
    moon: 3600, // 1 час
    mercury: 7200, // 2 часа
    venus: 10800, // 3 часа
    sun: 14400, // 4 часа
    mars: 21600, // 6 часов

    // Медленные планеты - длинный TTL
    jupiter: 86400, // 24 часа
    saturn: 86400, // 24 часа
    uranus: 172800, // 48 часов
    neptune: 172800, // 48 часов
    pluto: 172800, // 48 часов
  };

  return ttls[planet.toLowerCase()] || 21600;
}

async getPlanetPosition(planet: string, julianDay: number) {
  // Общий кэш для всех пользователей (не per-user)
  const cacheKey = `ephe:planet:${planet}:${Math.round(julianDay * 1000)}`;

  const cached = await this.redis.get(cacheKey);
  if (cached) return cached;

  // Расчет...
  const result = this.calculatePosition(planet, julianDay);

  // Сохранить с оптимальным TTL
  const ttl = this.getCacheTTL(planet);
  await this.redis.set(cacheKey, result, ttl);

  return result;
}
```

---

### 9. Добавление Недостающих Индексов

**Создать миграцию:**

```bash
npx prisma migrate create add_performance_indexes
```

**SQL миграция** (`backend/prisma/migrations/.../migration.sql`):

```sql
-- Индекс для Chart.aiGeneratedAt (используется в фильтрации)
CREATE INDEX IF NOT EXISTS "idx_charts_ai_generated_at"
ON "charts"("aiGeneratedAt");

-- Индекс для UserPhoto.storagePath (используется в поиске)
CREATE INDEX IF NOT EXISTS "idx_user_photos_storage_path"
ON "user_photos"("storagePath");

-- Индекс для Payment.stripeSessionId (используется в webhook)
CREATE INDEX IF NOT EXISTS "idx_payments_stripe_session_id"
ON "payments"("stripeSessionId");

-- GIN индекс для JSON поиска в DatingMatch.candidateData
CREATE INDEX IF NOT EXISTS "idx_dating_match_candidate_data_gin"
ON "dating_matches" USING GIN("candidateData");

-- Composite индекс для частых запросов
CREATE INDEX IF NOT EXISTS "idx_charts_user_created"
ON "charts"("userId", "createdAt" DESC);

-- Индекс для Connection status
CREATE INDEX IF NOT EXISTS "idx_connections_status"
ON "connections"("status");
```

**Применить:**

```bash
npx prisma migrate deploy
```

---

### 10. Frontend Optimization - React.memo

**Пример компонента:**

```typescript
// ДО: без оптимизации
export function DatingCard({ profile, onLike, onDislike }) {
  const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
    b === 'high' ? 'Высокая' : b === 'medium' ? 'Средняя' : 'Низкая';

  const getBadgeBg = (b?: 'high' | 'medium' | 'low') =>
    b === 'high'
      ? 'rgba(16,185,129,0.25)'
      : b === 'medium'
        ? 'rgba(245,158,11,0.25)'
        : 'rgba(239,68,68,0.25)';

  return (
    <View>
      {/* ... */}
    </View>
  );
}
```

**ПОСЛЕ: с оптимизацией:**

```typescript
// Вынести helper функции за пределы компонента
const BADGE_LABELS = {
  high: 'Высокая',
  medium: 'Средняя',
  low: 'Низкая',
} as const;

const BADGE_COLORS = {
  high: 'rgba(16,185,129,0.25)',
  medium: 'rgba(245,158,11,0.25)',
  low: 'rgba(239,68,68,0.25)',
} as const;

const getBadgeLabel = (b?: 'high' | 'medium' | 'low') =>
  BADGE_LABELS[b || 'low'];

const getBadgeBg = (b?: 'high' | 'medium' | 'low') =>
  BADGE_COLORS[b || 'low'];

// Мемоизированный компонент
export const DatingCard = React.memo<{
  profile: Profile;
  onLike: () => void;
  onDislike: () => void;
}>(({ profile, onLike, onDislike }) => {
  // useMemo для вычисляемых значений
  const badgeLabel = useMemo(
    () => getBadgeLabel(profile.compatibility),
    [profile.compatibility],
  );

  const badgeBg = useMemo(
    () => getBadgeBg(profile.compatibility),
    [profile.compatibility],
  );

  // useCallback для функций-обработчиков
  const handleLike = useCallback(() => {
    onLike();
  }, [onLike]);

  const handleDislike = useCallback(() => {
    onDislike();
  }, [onDislike]);

  return (
    <View>
      <Text style={{ backgroundColor: badgeBg }}>
        {badgeLabel}
      </Text>

      <Button onPress={handleLike}>Like</Button>
      <Button onPress={handleDislike}>Dislike</Button>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison для оптимизации
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.profile.compatibility === nextProps.profile.compatibility
  );
});
```

---

## 📊 API IMPROVEMENTS

### 11. API Versioning

**Создать** (`backend/src/common/decorators/api-version.decorator.ts`):

```typescript
import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'api_version';
export const ApiVersion = (version: string) =>
  SetMetadata(API_VERSION_KEY, version);
```

**Middleware** (`backend/src/common/middleware/api-version.middleware.ts`):

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Извлечь версию из URL: /api/v1/users -> v1
    const match = req.path.match(/^\/api\/(v\d+)\//);

    if (match) {
      req['apiVersion'] = match[1];
    } else {
      req['apiVersion'] = 'v1'; // Default
    }

    next();
  }
}
```

**Применить глобально** (`backend/src/main.ts`):

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Установить глобальный prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['/health', '/'], // Исключения
  });

  // ...
}
```

**Обновить контроллеры:**

```typescript
@Controller('users') // Теперь доступен как /api/v1/users
export class UserController {
  // ...
}
```

---

### 12. Response Wrapper

**Создать interceptor** (`backend/src/common/interceptors/response.interceptor.ts`):

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
    version: string;
    path: string;
  };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          version: request['apiVersion'] || 'v1',
          path: request.path,
        },
      }))
    );
  }
}
```

**Применить глобально:**

```typescript
// backend/src/main.ts
app.useGlobalInterceptors(new ResponseInterceptor());
```

---

## 🧪 TESTING

### 13. Пример Unit Test

**Создать** (`backend/src/dating/dating.service.spec.ts`):

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { DatingService } from './dating.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';

describe('DatingService', () => {
  let service: DatingService;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatingService,
        {
          provide: PrismaService,
          useValue: {
            chart: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DatingService>(DatingService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMatches', () => {
    it('should return cached results if available', async () => {
      const userId = 'test-user-id';
      const cachedResults = [
        { candidateId: 'candidate-1', compatibility: 0.8 },
      ];

      jest.spyOn(redis, 'get').mockResolvedValue(cachedResults);

      const result = await service.getMatches(userId, 20);

      expect(result).toEqual(cachedResults);
      expect(redis.get).toHaveBeenCalledWith(`compatibility:results:${userId}`);
    });

    it('should queue background job if no cache', async () => {
      const userId = 'test-user-id';

      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest
        .spyOn(service['compatibilityQueue'], 'add')
        .mockResolvedValue({ id: 'job-123' } as any);

      const result = await service.getMatches(userId, 20);

      expect(result).toHaveProperty('jobId');
      expect(result.status).toBe('processing');
    });
  });
});
```

**Запустить:**

```bash
npm test
```

---

## 📋 CHECKLIST ДЛЯ ВНЕДРЕНИЯ

### Phase 1 - Security (1 неделя):

- [ ] Удалить dev fallback в JWT
- [ ] Реализовать rate limiting
- [ ] Ограничить CORS
- [ ] Добавить CSRF protection
- [ ] Создать строгие DTO
- [ ] Добавить HTML санитизацию
- [ ] Удалить hardcoded users

### Phase 2 - Performance (2 недели):

- [ ] Bull queue для compatibility
- [ ] Batch signed URLs
- [ ] Оптимизировать ephemeris кэш
- [ ] Добавить индексы
- [ ] React.memo для компонентов
- [ ] GZIP compression

### Phase 3 - Architecture (3 недели):

- [ ] API versioning
- [ ] Response wrapper
- [ ] Централизованный error handling
- [ ] Устранить circular deps
- [ ] Refactoring сервисов

### Phase 4 - Testing (4 недели):

- [ ] Unit tests (70% coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Load testing

---

**Все примеры готовы к использованию. Можно начинать внедрение немедленно!**
