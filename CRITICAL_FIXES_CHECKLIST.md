# 🔴 Чеклист критических исправлений

## Статус: ТРЕБУЕТСЯ НЕМЕДЛЕННОЕ ВНИМАНИЕ

Этот документ содержит **конкретные шаги** для исправления критических проблем безопасности и качества кода.

---

## 1️⃣ JWT Token Expiration (2 часа) ⚠️ КРИТИЧНО

### Проблема
JWT токены принимаются даже после истечения срока действия.

### Файл
`backend/src/auth/strategies/jwt.strategy.ts`

### Текущий код (строки 20-34)
```typescript
constructor(configService: ConfigService) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: true,  // ❌ УДАЛИТЬ ЭТУ СТРОКУ
    secretOrKey: 'dummy-secret-for-development', // ❌ ЗАМЕНИТЬ
  });
}
```

### Исправленный код
```typescript
constructor(private configService: ConfigService) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    // ignoreExpiration: true - УДАЛЕНО
    secretOrKey: configService.get<string>('JWT_SECRET'),
  });
}
```

### Проверка
```bash
# В .env файле должно быть:
JWT_SECRET="minimum-32-characters-long-secret-key-here"
```

---

## 2️⃣ Включить глобальный Auth Guard (4 часа) ⚠️ КРИТИЧНО

### Проблема
Глобальный auth guard отключен, эндпоинты не защищены.

### Файл
`backend/src/app.module.ts`

### Текущий код (строки 84-87)
```typescript
// {
//   provide: APP_GUARD,
//   useClass: JwtAuthGuard,
// }, // Временно отключаем глобальный guard для тестирования
```

### Исправленный код
```typescript
{
  provide: APP_GUARD,
  useClass: SupabaseAuthGuard, // Используем Supabase guard
},
```

### Добавить в публичные эндпоинты
```typescript
// В auth.controller.ts, health.controller.ts
@Public()
@Post('signup')
async signup() { ... }

@Public()
@Get('health')
getHealth() { ... }
```

### Список публичных эндпоинтов
- `/api/auth/signup`
- `/api/auth/send-magic-link`
- `/api/auth/verify`
- `/api/auth/google-callback`
- `/health`

---

## 3️⃣ Отключить Dev Fallback в Production (1 час) ⚠️ КРИТИЧНО

### Проблема
JWT декодируется без проверки подписи в production.

### Файл
`backend/src/auth/guards/supabase-auth.guard.ts`

### Текущий код (строки 80-109)
```typescript
// Development fallback: decode JWT without verifying signature
try {
  const decoded = jwt.decode(token) as any;
  // ...
}
```

### Исправленный код
```typescript
// Development fallback ONLY in development
if (process.env.NODE_ENV === 'development') {
  try {
    console.log('⚠️  DEV MODE: Decoding JWT without verification');
    const decoded = jwt.decode(token) as any;
    // ... existing fallback code
  } catch (error) {
    console.error('Dev fallback JWT decode failed:', error);
    throw new UnauthorizedException('Invalid token');
  }
} else {
  // In production - reject if Supabase verification failed
  throw new UnauthorizedException('Token verification failed');
}
```

---

## 4️⃣ Убрать Test Users из Production (30 минут) ⚠️ КРИТИЧНО

### Файл
`backend/src/repositories/user.repository.ts`

### Текущий код (строки 92-100)
```typescript
if (!user && userId.startsWith('test-')) {
  return this.getTestUser(userId);
}
```

### Исправленный код
```typescript
// Test users ONLY in development
if (!user && userId.startsWith('test-') && process.env.NODE_ENV === 'development') {
  console.log('⚠️  DEV MODE: Using test user');
  return this.getTestUser(userId);
}
```

---

## 5️⃣ SecureStore для токенов (3 часа) ⚠️ КРИТИЧНО

### Проблема
Токены хранятся в AsyncStorage без шифрования.

### Файл
`frontend/src/services/tokenService.ts`

### Текущий код
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

### Исправленный код
```typescript
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class TokenService {
  private async getSecureItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      // Web fallback to localStorage (или AsyncStorage)
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  }

  private async setSecureItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  }

  async getToken(): Promise<string | null> {
    return this.getSecureItem(TOKEN_KEY);
  }

  async setToken(token: string): Promise<void> {
    return this.setSecureItem(TOKEN_KEY, token);
  }
}
```

---

## 6️⃣ Ограничить CORS в Production (1 час) ⚠️ ВЫСОКИЙ

### Файл
`backend/src/main.ts`

### Текущий код
```typescript
origin: [
  /^(http|https):\/\/localhost(:\d+)?$/,
  /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
  /\.exp\.direct$/,
  /\.expo\.dev$/,
],
```

### Исправленный код
```typescript
origin: process.env.NODE_ENV === 'production'
  ? [
      'https://your-production-domain.com',
      'https://app.your-domain.com',
    ]
  : [
      /^(http|https):\/\/localhost(:\d+)?$/,
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      /\.exp\.direct$/,
      /\.expo\.dev$/,
    ],
```

---

## 7️⃣ Удалить все console.log (4 часа) 🟡 ВЫСОКИЙ

### Backend

#### Создать Logger service
```bash
# Backend уже использует NestJS Logger
# Заменить все console.log на:
import { Logger } from '@nestjs/common';

export class SomeService {
  private readonly logger = new Logger(SomeService.name);

  someMethod() {
    // Было: console.log('message');
    this.logger.log('message');

    // Было: console.error('error');
    this.logger.error('error');

    // Было: console.warn('warning');
    this.logger.warn('warning');
  }
}
```

#### Поиск всех console.log
```bash
cd backend
grep -r "console\." src/ --exclude-dir=node_modules
```

### Frontend

#### Создать logger utility
```typescript
// frontend/src/utils/logger.ts
const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // В production отправлять в Sentry
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
};
```

#### Заменить все console.log
```bash
cd frontend
# Найти все
grep -r "console\." src/ --exclude-dir=node_modules

# Заменить
# console.log -> logger.log
# console.error -> logger.error
# console.warn -> logger.warn
```

---

## 8️⃣ Удалить deprecated код (2 часа) 🟡 ВЫСОКИЙ

### Удалить директории
```bash
# Frontend deprecated code
rm -rf frontend/src/screens/swap/
rm -rf frontend/src/components/swap/old/
rm frontend/src/services/api.legacy.ts

# Проверить импорты
grep -r "from.*swap" frontend/src/
grep -r "api.legacy" frontend/src/
```

### Проверить работоспособность
```bash
cd frontend
npm run start
# Проверить что приложение запускается
```

---

## 9️⃣ Обновить зависимости (2 часа) 🟡 ВЫСОКИЙ

### Backend
```bash
cd backend

# Проверить уязвимости
npm audit

# Исправить автоматически
npm audit fix

# Обновить @nestjs/cli
npm install @nestjs/cli@latest --save-dev

# Обновить @nestjs/swagger
npm install @nestjs/swagger@latest

# Проверить снова
npm audit
```

### Frontend
```bash
cd frontend

# Проверить уязвимости
npm audit

# Исправить автоматически (может потребовать --force)
npm audit fix

# Проверить работоспособность
npm run start
```

---

## 🔟 Исправить TypeScript bypasses (1 неделя) 🟡 СРЕДНИЙ

### Найти все @ts-ignore
```bash
grep -r "@ts-ignore" frontend/src/ | wc -l
grep -r "@ts-ignore" backend/src/ | wc -l
```

### Стратегия исправления

#### 1. Определить правильные типы
```typescript
// Было:
// @ts-ignore
const result = someFunction();

// Стало:
interface SomeResult {
  data: string;
  status: number;
}
const result: SomeResult = someFunction();
```

#### 2. Использовать type assertions осторожно
```typescript
// Было:
const value = data as any;

// Стало:
const value = data as SomeSpecificType;
```

#### 3. Добавить type guards
```typescript
function isValidResponse(response: unknown): response is ApiResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'data' in response
  );
}

if (isValidResponse(response)) {
  // TypeScript knows response is ApiResponse
}
```

---

## ✅ Проверка выполнения

После выполнения всех исправлений:

### Backend проверки
```bash
cd backend

# 1. Линтинг
npm run lint

# 2. Build
npm run build

# 3. Тесты
npm test

# 4. Запуск
npm run start:dev

# 5. Проверка auth
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Frontend проверки
```bash
cd frontend

# 1. TypeScript check
npx tsc --noEmit

# 2. Запуск
npm run start

# 3. Build
npx expo build

# 4. Проверка всех экранов
# Пройтись по всем экранам в приложении
```

### Security проверки
```bash
# 1. JWT expiration
# Создать токен, подождать expiration time, попробовать использовать
# Должен вернуть 401 Unauthorized

# 2. Auth guard
# Попробовать GET /api/user/profile без токена
# Должен вернуть 401 Unauthorized

# 3. Public endpoints
# GET /health - должен работать без токена
# POST /api/auth/signup - должен работать без токена

# 4. Test users
# В production попробовать userId: "test-123"
# Должен вернуть 404 Not Found
```

---

## 📊 Прогресс

- [ ] 1. JWT Token Expiration
- [ ] 2. Глобальный Auth Guard
- [ ] 3. Dev Fallback
- [ ] 4. Test Users
- [ ] 5. SecureStore
- [ ] 6. CORS
- [ ] 7. Console.log
- [ ] 8. Deprecated код
- [ ] 9. Зависимости
- [ ] 10. TypeScript bypasses

**Общий прогресс:** 0/10 (0%)

---

## 🚀 Следующие шаги

После выполнения критических исправлений:

1. **Setup CI/CD** (3 дня)
   - GitHub Actions
   - Автоматические тесты
   - Автоматический deploy

2. **Написать тесты** (2 недели)
   - Auth flow unit tests
   - API integration tests
   - Frontend component tests

3. **Setup мониторинга** (1 неделя)
   - Sentry для ошибок
   - Prometheus + Grafana для метрик
   - Structured logging

4. **Code review** (1 неделя)
   - Review всех изменений
   - Документирование архитектурных решений
   - Update README

---

**Оценка времени:** 2-3 недели при 1 full-time разработчике
**Приоритет:** КРИТИЧЕСКИЙ
**Deadline:** До production deployment
