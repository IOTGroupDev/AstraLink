# Winston Logger Migration Guide

## Цель

Заменить все `console.log/warn/error/debug` на proper Winston logger для production-ready логирования.

## Проблема

**Найдено:** 263 использования console.log
- Backend: 160 вхождений в 9 файлах
- Frontend: 103 вхождения в 20 файлах

**Риски:**
- Невозможно контролировать уровни логирования
- Нет structured logging для анализа
- Логи не сохраняются в production
- Нельзя отключить debug логи в production

## Решение - Winston Logger

### 1. Установка

```bash
cd backend
npm install winston
npm install --save-dev @types/node
```

### 2. Использование

#### Before (❌ Плохо):
```typescript
console.log('User logged in:', userId);
console.error('Auth error:', error);
console.warn('Subscription expiring soon');
console.debug('Chart calculation:', data);
```

#### After (✅ Хорошо):
```typescript
import { WinstonLoggerService } from '@/common/winston-logger.service';

export class AuthService {
  private readonly logger = new WinstonLoggerService(this.configService);

  constructor() {
    this.logger.setContext(AuthService.name);
  }

  async login(email: string) {
    this.logger.log(`User login attempt: ${email}`);

    try {
      // ... code ...
      this.logger.logAuth('login_success', userId, { email });
    } catch (error) {
      this.logger.error('Login failed', error.stack, 'AuthService');
    }
  }
}
```

## Миграция файлов

### Priority 1: Critical Services (сделать первыми)

#### 1. Auth Files (76 console.log)
```bash
# Files to update:
backend/src/auth/supabase-auth.service.ts        # 76 console.log
backend/src/auth/middleware/auth.middleware.ts   # 1 console.log
```

**Замены:**
```typescript
// ❌ Before
console.log(`Checking natal chart for user ${userId}`);
console.error('Error getting user profile:', error);

// ✅ After
this.logger.log(`Checking natal chart for user ${userId}`);
this.logger.error('Error getting user profile', error.stack);
```

#### 2. Chat Service (3 console.log)
```bash
backend/src/chat/chat.service.ts  # 3 console.log
```

#### 3. Config Files (1 console.log)
```bash
backend/src/config/cors.config.ts  # 1 console.log
```

### Priority 2: Diagnostic & Utilities

#### 4. Diagnostic Script (68 console.log - OK для диагностики)
```bash
backend/src/diagnostic.script.ts  # 68 console.log - оставить как есть
```
> ℹ️ Diagnostic scripts могут использовать console.log

#### 5. Logging Interceptor (3 console.log)
```bash
backend/src/common/logging.interceptor.ts  # 3 console.log
```

Заменить на Winston:
```typescript
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new WinstonLoggerService(configService);

  constructor() {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();

    this.logger.logRequest(req);

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const responseTime = Date.now() - start;
        this.logger.logResponse(req, res, responseTime);
      }),
    );
  }
}
```

### Priority 3: Other Services

#### 6. Location Utils (1 console.log)
```bash
backend/src/utils/location.utils.ts  # 1 console.log
```

#### 7. Seeds & Scripts (6 console.log)
```bash
backend/src/scripts/seed.dating.ts  # 6 console.log
```

## Frontend Migration (103 console.log)

### Strategy для Frontend:

Использовать lightweight debug library вместо Winston (Winston тяжелый для React Native).

### Рекомендация: debug или loglevel

```bash
cd frontend
npm install loglevel
```

```typescript
// frontend/src/services/logger.ts
import log from 'loglevel';

const ENV = process.env.NODE_ENV || 'development';

// Set level based on environment
if (ENV === 'production') {
  log.setLevel('warn'); // Only warnings and errors in production
} else {
  log.setLevel('debug'); // All logs in development
}

export const logger = log;

// Usage:
import { logger } from '@/services/logger';

logger.info('User logged in');
logger.warn('Subscription expiring soon');
logger.error('API call failed', error);
logger.debug('State updated:', state);
```

### Frontend Priority Files:

1. **HoroscopeScreen.tsx** (21 console.log) - HIGHEST
2. **EditProfileScreen.tsx** (11 console.log)
3. **DatingScreen.tsx** (10 console.log)
4. **chart.api.ts** (10 console.log)

## Environment Configuration

### .env Variables

```env
# Logging configuration
NODE_ENV=production
LOG_LEVEL=info  # debug | info | warn | error

# Production only
LOG_TO_FILE=true
LOG_DIR=./logs
```

### Log Levels по окружениям:

| Environment | Level | Output |
|-------------|-------|--------|
| Development | debug | Console (colorized) |
| Staging | info | Console + Files |
| Production | warn | Files only (error.log, combined.log) |

## Преимущества Winston

### ✅ Structured Logging
```typescript
this.logger.log('User action', {
  userId: '123',
  action: 'login',
  ip: '192.168.1.1',
  timestamp: new Date(),
});

// Output (JSON):
{
  "level": "info",
  "message": "User action",
  "userId": "123",
  "action": "login",
  "ip": "192.168.1.1",
  "timestamp": "2025-11-23T10:30:00Z"
}
```

### ✅ Log Rotation (добавить позже)
```bash
npm install winston-daily-rotate-file
```

```typescript
new winston.transports.DailyRotateFile({
  filename: 'logs/application-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
});
```

### ✅ External Log Aggregation
```typescript
// Можно добавить transports для:
- Sentry (error tracking)
- Datadog (monitoring)
- CloudWatch (AWS)
- Elasticsearch (ELK stack)
```

## Migration Checklist

### Backend
- [ ] Install Winston (`npm install winston`)
- [ ] Create WinstonLoggerService ✅
- [ ] Update common.module to export logger
- [ ] Replace console.log in auth/supabase-auth.service.ts (76)
- [ ] Replace console.log in chat/chat.service.ts (3)
- [ ] Replace console.log in common/logging.interceptor.ts (3)
- [ ] Replace console.log in auth/middleware/auth.middleware.ts (1)
- [ ] Replace console.log in config/cors.config.ts (1)
- [ ] Replace console.log in utils/location.utils.ts (1)
- [ ] Replace console.log in scripts/seed.dating.ts (6)
- [ ] Add LOG_LEVEL to .env.example
- [ ] Update main.ts to use Winston as app logger
- [ ] Test in development
- [ ] Test in production

### Frontend
- [ ] Install loglevel (`npm install loglevel`)
- [ ] Create logger service
- [ ] Replace console.log in HoroscopeScreen.tsx (21)
- [ ] Replace console.log in EditProfileScreen.tsx (11)
- [ ] Replace console.log in DatingScreen.tsx (10)
- [ ] Replace console.log in chart.api.ts (10)
- [ ] Replace console.log in ProfileScreen.tsx (7)
- [ ] Replace console.log in other files (44 more)
- [ ] Configure log levels per environment
- [ ] Test in development
- [ ] Test in production

## Rollout Plan

### Week 1: Backend Critical Services
1. Setup Winston infrastructure
2. Migrate Auth services (77 console.log)
3. Migrate Chat service (3 console.log)
4. Test in staging

### Week 2: Backend Complete
1. Migrate remaining backend files (10 console.log)
2. Update all interceptors and middleware
3. Add log rotation
4. Production deployment

### Week 3: Frontend
1. Setup loglevel infrastructure
2. Migrate critical screens (52 console.log)
3. Migrate API services (10 console.log)
4. Test in staging

### Week 4: Frontend Complete & Monitoring
1. Migrate remaining frontend files (41 console.log)
2. Setup external monitoring (Sentry)
3. Production deployment
4. Monitor logs for issues

## Expected Results

### Before
- ❌ 263 console.log statements
- ❌ No log levels
- ❌ Logs lost in production
- ❌ No structured logging
- ❌ Debug logs in production

### After
- ✅ 0 console.log statements
- ✅ Proper log levels (debug/info/warn/error)
- ✅ Logs persisted to files
- ✅ Structured JSON logging
- ✅ Debug logs disabled in production
- ✅ Log rotation (keep 14 days)
- ✅ Ready for external monitoring

## Quick Reference

### Common Patterns

```typescript
// ❌ OLD
console.log('User:', user.id);
console.error('Error:', error);
console.warn('Warning:', message);
console.debug('Debug:', data);

// ✅ NEW
this.logger.log(`User: ${user.id}`);
this.logger.error('Error occurred', error.stack);
this.logger.warn(`Warning: ${message}`);
this.logger.debug(`Debug: ${JSON.stringify(data)}`);

// ✅ BEST (Structured)
this.logger.log('User action', { userId: user.id });
this.logger.error('Error occurred', error.stack, 'ServiceName');
this.logger.warn('Warning', { message });
this.logger.debug('Debug data', { data });
```

### Security Logging

```typescript
// Failed login attempts
this.logger.logSecurity('failed_login_attempt', 'medium', {
  email,
  ip: req.ip,
  attemptCount: 3,
});

// Rate limit exceeded
this.logger.logSecurity('rate_limit_exceeded', 'high', {
  userId,
  endpoint: req.path,
  ip: req.ip,
});

// Suspicious activity
this.logger.logSecurity('suspicious_activity', 'high', {
  userId,
  activity: 'multiple_failed_passwords',
  ip: req.ip,
});
```

## Performance Impact

Winston performance: **~0.1ms per log**
- ✅ Minimal overhead
- ✅ Async writes to files
- ✅ No blocking operations

Console.log: **~0.05ms per log**
- ❌ But no features
- ❌ No persistence
- ❌ No filtering

**Trade-off:** Acceptable 0.05ms overhead for production-grade logging.

---

**Status:** 🚧 In Progress
**Priority:** P0 - Critical
**Estimated Time:** 2-3 days full migration
