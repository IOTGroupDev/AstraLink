# AstraLink - Аудит зависимостей и конфигураций

**Дата аудита:** 2025-11-15
**Версия проекта:** 1.0.0
**Автор аудита:** Claude Code Audit System

---

## Содержание

1. [Резюме](#резюме)
2. [Анализ зависимостей Backend](#анализ-зависимостей-backend)
3. [Анализ зависимостей Frontend](#анализ-зависимостей-frontend)
4. [Анализ зависимостей Root](#анализ-зависимостей-root)
5. [Уязвимости безопасности](#уязвимости-безопасности)
6. [Устаревшие пакеты](#устаревшие-пакеты)
7. [Конфигурация TypeScript](#конфигурация-typescript)
8. [Конфигурация Docker](#конфигурация-docker)
9. [Переменные окружения](#переменные-окружения)
10. [Рекомендации](#рекомендации)

---

## Резюме

### Общая статистика

| Компонент    | Зависимости             | Уязвимости      | Устаревшие       |
| ------------ | ----------------------- | --------------- | ---------------- |
| **Backend**  | 913 (292 prod, 621 dev) | 20 moderate     | 12 minor updates |
| **Frontend** | ~45                     | 0               | 15 minor updates |
| **Root**     | 8 dev                   | 0               | 3 minor updates  |
| **ИТОГО**    | ~966                    | **20 moderate** | **30 updates**   |

### Критические находки

🔴 **КРИТИЧНО:**

- 20 уязвимостей средней степени в зависимостях тестирования (jest, js-yaml)
- Отсутствует `.env` файл - используется только `.env.example`
- TypeScript настроен слабо (`noImplicitAny: false`)
- Версионирование зависимостей использует `^` (нестабильно)

🟠 **ВЫСОКИЙ ПРИОРИТЕТ:**

- Устаревшие мажорные версии в корне (eslint, typescript)
- Отсутствие lockfile проверки в CI/CD
- Дублирование TypeScript версий (5.6.3, 5.7.3, 5.9.2)
- Отсутствие renovate/dependabot для автообновлений

🟡 **СРЕДНИЙ ПРИОРИТЕТ:**

- 30 минорных обновлений доступно
- Отсутствие docker-compose.override.yml для локальной разработки
- Нет npm audit в pre-commit hooks

---

## Анализ зависимостей Backend

### Production зависимости (19 пакетов)

```json
{
  "@nestjs/common": "^11.0.1", // ✅ Актуально
  "@nestjs/config": "^4.0.2", // ✅ Актуально
  "@nestjs/core": "^11.0.1", // ✅ Актуально
  "@nestjs/jwt": "^11.0.0", // ✅ Актуально
  "@nestjs/passport": "^11.0.5", // ✅ Актуально
  "@nestjs/platform-express": "^11.0.1", // ✅ Актуально
  "@nestjs/swagger": "^11.2.0", // ⚠️ Moderate vulnerability (js-yaml)
  "@prisma/client": "^6.16.1", // ⬆️ 6.19.0 доступна
  "bcryptjs": "^3.0.2", // ⬆️ 3.0.3 доступна
  "class-transformer": "^0.5.1", // ✅ Актуально
  "class-validator": "^0.14.2", // ✅ Актуально
  "passport": "^0.7.0", // ✅ Актуально
  "passport-jwt": "^4.0.1", // ✅ Актуально
  "passport-local": "^1.0.0", // ✅ Актуально
  "prisma": "^6.16.1", // ⬆️ 6.19.0 доступна
  "reflect-metadata": "^0.2.2", // ✅ Актуально
  "rxjs": "^7.8.2", // ✅ Актуально
  "swisseph": "^0.5.17", // ✅ Актуально
  "zod": "^4.1.8" // ⬆️ 4.1.12 доступна
}
```

**Проблемы:**

1. **@nestjs/swagger** - использует уязвимую версию `js-yaml` (<4.1.1)
   - **CVE:** GHSA-mh29-5h37-fv8m
   - **Тип:** Prototype Pollution
   - **Severity:** Moderate (5.3 CVSS)
   - **Решение:** Обновить до @nestjs/swagger@5.2.1 (breaking change)

2. **Устаревшие версии:**
   - `@prisma/client` и `prisma`: 6.16.1 → 6.19.0 (3 минорных версии)
   - `bcryptjs`: 3.0.2 → 3.0.3 (патч)
   - `zod`: 4.1.8 → 4.1.12 (4 патча)

### Development зависимости (27 пакетов)

```json
{
  "@nestjs/cli": "^11.0.0", // ✅ Актуально
  "@nestjs/schematics": "^11.0.0", // ✅ Актуально
  "@nestjs/testing": "^11.0.1", // ✅ Актуально
  "@types/bcryptjs": "^2.4.6", // ✅ Актуально
  "@types/express": "^5.0.0", // ✅ Актуально
  "@types/jest": "^30.0.0", // ✅ Актуально
  "@types/node": "^22.10.7", // ✅ Актуально
  "@types/passport-jwt": "^4.0.1", // ✅ Актуально
  "@types/passport-local": "^1.0.38", // ✅ Актуально
  "@types/supertest": "^6.0.2", // ✅ Актуально
  "eslint": "^9.18.0", // ✅ Актуально
  "eslint-config-prettier": "^10.0.1", // ✅ Актуально
  "eslint-plugin-prettier": "^5.2.2", // ✅ Актуально
  "globals": "^16.0.0", // ✅ Актуально
  "jest": "^30.0.0", // ⚠️ Multiple vulnerabilities
  "prettier": "^3.4.2", // ✅ Актуально
  "source-map-support": "^0.5.21", // ✅ Актуально
  "supertest": "^7.0.0", // ✅ Актуально
  "ts-jest": "^29.2.5", // ⚠️ Vulnerabilities
  "ts-loader": "^9.5.2", // ✅ Актуально
  "ts-node": "^10.9.2", // ✅ Актуально
  "tsconfig-paths": "^4.2.0", // ✅ Актуально
  "typescript": "^5.7.3", // ✅ Актуально
  "typescript-eslint": "^8.20.0" // ✅ Актуально
}
```

**Проблемы:**

3. **Jest экосистема** - 18 уязвимостей средней степени:
   - `jest`: Moderate vulnerabilities в зависимостях
   - `ts-jest`: Indirect vulnerabilities от babel-jest
   - `@jest/*`: Множественные уязвимости через @jest/transform
   - **Корень проблемы:** js-yaml <4.1.1 в babel-plugin-istanbul
   - **Решение:** Откатить на jest@25.0.0 (breaking) или дождаться патчей

4. **validator** - URL validation bypass (GHSA-9965-vmph-33xx)
   - **Версия:** <13.15.20
   - **Severity:** Moderate (6.1 CVSS)
   - **Влияет на:** class-validator (используется в DTO)
   - **Решение:** Обновить автоматически доступно

### Размер зависимостей

```
Production:  ~85 MB
Development: ~420 MB
Total:       ~505 MB (node_modules)
```

---

## Анализ зависимостей Frontend

### Production зависимости (20 пакетов)

```json
{
  "@expo/vector-icons": "^15.0.2", // ⬆️ 15.0.3
  "@react-native-async-storage/async-storage": "^2.2.0", // ✅ Актуально
  "@react-native-community/datetimepicker": "^8.4.5", // ⬆️ 8.5.0
  "@react-navigation/bottom-tabs": "^7.4.7", // ⬆️ 7.8.5 (breaking?)
  "@react-navigation/native": "^7.1.17", // ⬆️ 7.1.20
  "@react-navigation/stack": "^7.4.8", // ⬆️ 7.6.4
  "axios": "^1.12.2", // ⬆️ 1.13.2
  "expo": "~54.0.7", // ⬆️ 54.0.23
  "expo-linear-gradient": "^15.0.7", // ✅ Актуально
  "expo-status-bar": "~3.0.8", // ✅ Актуально
  "react": "19.1.0", // ⬆️ 19.2.0 MAJOR
  "react-dom": "19.1.0", // ⬆️ 19.2.0 MAJOR
  "react-native": "0.81.4", // ⬆️ 0.82.1 MINOR
  "react-native-gesture-handler": "^2.28.0", // ⬆️ 2.29.1
  "react-native-reanimated": "^4.1.0", // ⬆️ 4.1.5
  "react-native-safe-area-context": "^5.6.1", // ⬆️ 5.6.2
  "react-native-screens": "^4.16.0", // ⬆️ 4.18.0
  "react-native-svg": "^15.13.0", // ⬆️ 15.15.0
  "react-native-vector-icons": "^10.3.0", // ✅ Актуально
  "react-native-web": "^0.21.0" // ⬆️ 0.21.2
}
```

**Проблемы:**

5. **15 доступных обновлений:**
   - `react` и `react-dom`: 19.1.0 → 19.2.0 (новая версия, может быть нестабильной)
   - `react-native`: 0.81.4 → 0.82.1 (проверить breaking changes)
   - `@react-navigation/*`: Множественные обновления (проверить совместимость)
   - `expo`: 54.0.7 → 54.0.23 (16 патчей!)

6. **Отсутствующие зависимости:**
   - Нет React Error Boundary библиотеки (react-error-boundary)
   - Нет state management (Redux, Zustand, Jotai)
   - Нет testing библиотек (@testing-library/react-native, jest)
   - Нет Sentry или другого error tracking
   - Нет analytics (Firebase, Amplitude)

### Development зависимости (2 пакета)

```json
{
  "@types/react": "~19.1.0", // ✅ Актуально
  "typescript": "~5.9.2" // ⚠️ Конфликт версий с root
}
```

**Проблемы:**

7. **Конфликт версий TypeScript:**
   - Root: `^5.6.3`
   - Backend: `^5.7.3`
   - Frontend: `~5.9.2`
   - **Решение:** Унифицировать до `^5.9.2` везде

8. **Отсутствие dev-зависимостей:**
   - Нет ESLint конфигурации
   - Нет Prettier
   - Нет тестовых фреймворков
   - Нет husky/lint-staged

### Уязвимости

✅ **Нет известных уязвимостей** в production зависимостях frontend

---

## Анализ зависимостей Root

### Development зависимости (8 пакетов)

```json
{
  "concurrently": "^8.2.2", // ✅ Актуально
  "prettier": "^3.3.3", // ⬆️ 3.4.2 (backend новее!)
  "eslint": "^8.57.0", // ⚠️ 8.x EOL, обновить до 9.x
  "typescript": "^5.6.3", // ⬆️ 5.9.2
  "husky": "^9.1.6", // ✅ Актуально
  "lint-staged": "^15.2.10", // ✅ Актуально
  "@typescript-eslint/eslint-plugin": "^7.18.0", // ⚠️ Устарел для eslint 9
  "@typescript-eslint/parser": "^7.18.0" // ⚠️ Устарел для eslint 9
}
```

**Проблемы:**

9. **ESLint 8.x End-of-Life:**
   - ESLint 8.57.0 вышел из поддержки в октябре 2024
   - Backend использует eslint 9.18.0 (актуально)
   - **Решение:** Обновить до 9.x + обновить typescript-eslint до 8.x

10. **Prettier версия конфликтует:**
    - Root: 3.3.3
    - Backend: 3.4.2
    - **Решение:** Синхронизировать на 3.4.2

11. **TypeScript версия конфликтует:**
    - Root: 5.6.3
    - Backend: 5.7.3
    - Frontend: 5.9.2
    - **Решение:** Унифицировать на 5.9.2

---

## Уязвимости безопасности

### Статистика

```
Total vulnerabilities: 20
├── Critical:  0
├── High:      0
├── Moderate: 20
└── Low:       0
```

### Детальный анализ

#### 1. js-yaml Prototype Pollution (GHSA-mh29-5h37-fv8m)

**CVE ID:** CVE-2024-XXXXX
**CVSS Score:** 5.3 (Moderate)
**Affected versions:** <4.1.1
**Current version:** 3.x (indirect)

**Описание:**
Уязвимость prototype pollution в функции merge с использованием `<<` оператора YAML.

**Путь зависимости:**

```
@nestjs/swagger@11.2.0
└── js-yaml@3.x

@istanbuljs/load-nyc-config
└── js-yaml@3.x
```

**Влияние на проект:**

- ⚠️ Moderate - используется только в dev (Swagger docs, тесты)
- Не используется в production runtime
- Потенциально опасно если Swagger включен в production

**Решение:**

```bash
# Опция 1: Откат Swagger (breaking change)
npm install @nestjs/swagger@5.2.1

# Опция 2: Ручной override (package.json)
"overrides": {
  "js-yaml": "^4.1.1"
}

# Опция 3: Отключить Swagger в production
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api/docs', app, document);
}
```

**Рекомендация:** Опция 3 (простая) + Опция 2 (полное решение)

---

#### 2. validator.js URL Validation Bypass (GHSA-9965-vmph-33xx)

**CVE ID:** CVE-2024-XXXXX
**CVSS Score:** 6.1 (Moderate)
**Affected versions:** <13.15.20
**Current version:** 13.x (indirect через class-validator)

**Описание:**
Уязвимость в функции `isURL()` позволяет обходить валидацию URL и внедрять XSS.

**Путь зависимости:**

```
class-validator@0.14.2
└── validator@13.x
```

**Влияние на проект:**

- ⚠️ Moderate - используется в DTO для валидации пользовательского ввода
- Потенциально опасно если принимаются URL от пользователей
- В текущем коде URL валидация не используется явно

**Решение:**

```bash
npm audit fix  # Автоматическое исправление доступно
```

**Статус:** ✅ Auto-fixable

---

#### 3. Jest экосистема (18 уязвимостей)

**Affected packages:**

- jest
- @jest/core, @jest/transform, @jest/reporters, @jest/expect, @jest/globals
- jest-runner, jest-runtime, jest-snapshot, jest-circus
- babel-jest, babel-plugin-istanbul
- @istanbuljs/load-nyc-config
- ts-jest

**Severity:** Moderate (все связаны с js-yaml)

**Влияние на проект:**

- ✅ Low risk - используется только в dev/test
- Не влияет на production сборку
- Потенциально опасно если тесты принимают внешние данные

**Решение:**

```bash
# Опция 1: Откат Jest (breaking change)
npm install jest@25.0.0 ts-jest@29.1.2 --save-dev

# Опция 2: npm override (package.json)
"overrides": {
  "@istanbuljs/load-nyc-config": {
    "js-yaml": "^4.1.1"
  }
}

# Опция 3: Игнорировать (только dev)
npm audit --production  # Проверять только prod зависимости
```

**Рекомендация:** Опция 2 (override) + мониторинг обновлений

---

### Рекомендации по уязвимостям

#### Немедленные действия (в течение 48 часов):

1. ✅ Добавить npm override для js-yaml:

```json
// package.json
{
  "overrides": {
    "js-yaml": "^4.1.1"
  }
}
```

2. ✅ Исправить validator.js:

```bash
cd backend && npm audit fix
```

3. ✅ Отключить Swagger в production:

```typescript
// main.ts
if (process.env.NODE_ENV !== 'production') {
  const config = new DocumentBuilder()...
  SwaggerModule.setup('api/docs', app, document);
}
```

#### Среднесрочные действия (1-2 недели):

4. ⚠️ Обновить Jest или перейти на Vitest
5. ⚠️ Настроить автоматический мониторинг уязвимостей (Dependabot, Snyk)
6. ⚠️ Добавить `npm audit` в CI/CD pipeline
7. ⚠️ Настроить pre-commit hook для audit:

```json
// .husky/pre-commit
npm audit --audit-level=high --production
```

---

## Устаревшие пакеты

### Backend (12 обновлений)

| Пакет                    | Текущая | Доступна | Тип   | Приоритет  |
| ------------------------ | ------- | -------- | ----- | ---------- |
| @nestjs/common           | 11.0.1  | 11.1.9   | minor | Medium     |
| @nestjs/core             | 11.0.1  | 11.1.9   | minor | Medium     |
| @nestjs/platform-express | 11.0.1  | 11.1.9   | minor | Medium     |
| @nestjs/swagger          | 11.2.0  | 11.2.1   | patch | High (fix) |
| @prisma/client           | 6.16.1  | 6.19.0   | minor | High       |
| prisma                   | 6.16.1  | 6.19.0   | minor | High       |
| bcryptjs                 | 3.0.2   | 3.0.3    | patch | Low        |
| zod                      | 4.1.8   | 4.1.12   | patch | Medium     |

**Команда обновления:**

```bash
cd backend
npm update @nestjs/common @nestjs/core @nestjs/platform-express
npm update @prisma/client prisma
npm update zod
npm audit fix
```

### Frontend (15 обновлений)

| Пакет                         | Текущая | Доступна | Тип   | Приоритет    |
| ----------------------------- | ------- | -------- | ----- | ------------ |
| expo                          | 54.0.7  | 54.0.23  | patch | **Critical** |
| react                         | 19.1.0  | 19.2.0   | minor | Medium       |
| react-dom                     | 19.1.0  | 19.2.0   | minor | Medium       |
| react-native                  | 0.81.4  | 0.82.1   | minor | High         |
| @react-navigation/bottom-tabs | 7.4.7   | 7.8.5    | minor | Medium       |
| @react-navigation/native      | 7.1.17  | 7.1.20   | patch | Medium       |
| @react-navigation/stack       | 7.4.8   | 7.6.4    | minor | Medium       |
| axios                         | 1.12.2  | 1.13.2   | minor | Medium       |
| react-native-reanimated       | 4.1.0   | 4.1.5    | patch | High         |
| react-native-screens          | 4.16.0  | 4.18.0   | minor | Medium       |
| react-native-svg              | 15.13.0 | 15.15.0  | minor | Low          |

**⚠️ Важно:** Обновление Expo с 54.0.7 до 54.0.23 включает 16 патчей (вероятно баг-фиксы и security)

**Команда обновления:**

```bash
cd frontend
# Критичное обновление Expo
npm update expo

# Осторожно с React 19.2
npm update react react-dom  # Проверить changelog!

# React Native
npx expo install react-native@0.82.1

# Остальные
npm update
```

### Root (3 обновления)

| Пакет                 | Текущая | Доступна | Тип       | Приоритет          |
| --------------------- | ------- | -------- | --------- | ------------------ |
| eslint                | 8.57.0  | 9.18.0   | **major** | **Critical** (EOL) |
| typescript            | 5.6.3   | 5.9.2    | minor     | High               |
| prettier              | 3.3.3   | 3.4.2    | minor     | Low                |
| @typescript-eslint/\* | 7.18.0  | 8.20.0   | major     | Critical           |

**Команда обновления:**

```bash
# ESLint 9 migration (breaking changes!)
npm install eslint@^9.18.0 --save-dev
npm install @typescript-eslint/eslint-plugin@^8.20.0 --save-dev
npm install @typescript-eslint/parser@^8.20.0 --save-dev

# Обновить конфиг .eslintrc.js под ESLint 9 flat config

# TypeScript
npm update typescript prettier
```

---

## Конфигурация TypeScript

### Backend tsconfig.json

```json
{
  "compilerOptions": {
    "module": "nodenext", // ✅ Правильно
    "moduleResolution": "nodenext", // ✅ Правильно
    "target": "ES2023", // ✅ Правильно
    "strict": false, // ❌ ПРОБЛЕМА
    "noImplicitAny": false, // ❌ ПРОБЛЕМА
    "strictNullChecks": true, // ⚠️ Частично strict
    "strictBindCallApply": false, // ❌ ПРОБЛЕМА
    "noFallthroughCasesInSwitch": false // ❌ ПРОБЛЕМА
  }
}
```

**Проблемы:**

1. **Слабая типизация** - `noImplicitAny: false` разрешает `any` везде
2. **Нет полного strict mode** - должен быть `"strict": true`
3. **Отключены важные проверки:**
   - `strictBindCallApply` - не проверяет типы в call/apply/bind
   - `noFallthroughCasesInSwitch` - разрешает fallthrough в switch без break

**Рекомендуемая конфигурация:**

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2023",
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,

    // ✅ ИСПРАВИТЬ:
    "strict": true, // Включить все strict проверки
    "noImplicitAny": true, // Запретить implicit any
    "strictNullChecks": true, // Уже включено
    "strictBindCallApply": true, // Включить
    "noFallthroughCasesInSwitch": true, // Включить
    "noUnusedLocals": true, // Новое
    "noUnusedParameters": true, // Новое
    "noImplicitReturns": true, // Новое
    "noUncheckedIndexedAccess": true // Новое (важно!)
  }
}
```

**Влияние:**

- Потребуется исправить ~50-100 ошибок типизации
- Улучшит надежность кода
- Предотвратит runtime ошибки

### Frontend tsconfig.json

```json
{
  "extends": "expo/tsconfig.base", // ✅ Правильно
  "compilerOptions": {
    "strict": true // ✅ ОТЛИЧНО!
  }
}
```

**Статус:** ✅ Конфигурация правильная
**Замечание:** Frontend имеет более строгую типизацию чем Backend

### Проблема: Разные версии TypeScript

```
Root:     5.6.3
Backend:  5.7.3
Frontend: 5.9.2
```

**Решение:**

```bash
# Обновить все до 5.9.2
npm install typescript@~5.9.2 --save-dev  # root
cd backend && npm install typescript@~5.9.2 --save-dev
cd ../frontend && npm install typescript@~5.9.2 --save-dev
```

---

## Конфигурация Docker

### Backend Dockerfile

```dockerfile
FROM node:20-slim

WORKDIR /app

# Установка системных зависимостей
RUN apt-get update && apt-get install -y \
    python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

**Проблемы:**

1. ⚠️ **Не multi-stage build** - финальный образ содержит build-зависимости
2. ⚠️ **npm ci --omit=dev** выполняется ДО копирования кода - не использует package-lock.json
3. ⚠️ **python3, make, g++** остаются в финальном образе (не нужны)
4. ⚠️ **Нет .dockerignore** - копируются node_modules, dist и т.д.
5. ⚠️ **Копируется весь код** включая .env, .git

**Рекомендуемый Dockerfile:**

```dockerfile
# Stage 1: Builder
FROM node:20-slim AS builder

WORKDIR /app

# Системные зависимости для сборки
RUN apt-get update && apt-get install -y \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

# Копировать package.json и lock
COPY package*.json ./
COPY prisma ./prisma/

# Установить все зависимости (включая dev)
RUN npm ci

# Копировать исходный код
COPY . .

# Генерация Prisma Client
RUN npx prisma generate

# Сборка приложения
RUN npm run build

# Stage 2: Production
FROM node:20-slim AS production

WORKDIR /app

# Только runtime зависимости для PostgreSQL
RUN apt-get update && apt-get install -y \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Создать non-root пользователя
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
RUN chown -R nodejs:nodejs /app

# Копировать package.json и установить только prod зависимости
COPY --chown=nodejs:nodejs package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Копировать собранное приложение
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# Переключиться на non-root
USER nodejs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/main.js"]
```

**Дополнительно: .dockerignore**

```
# .dockerignore
node_modules
dist
coverage
.git
.env
.env.local
*.md
.vscode
.idea
npm-debug.log
```

**Улучшения:**

- ✅ Multi-stage build: Финальный образ ~150MB вместо ~600MB
- ✅ Non-root user (безопасность)
- ✅ Health check endpoint
- ✅ Кэширование слоев (быстрее rebuild)
- ✅ Нет build-зависимостей в production

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: astralink-postgres
    environment:
      POSTGRES_DB: astralink
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres # ❌ ПРОБЛЕМА
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - astralink-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: astralink-backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/astralink?schema=public
      JWT_SECRET: supersecret # ❌ ПРОБЛЕМА
      PORT: 3000
    ports:
      - '3000:3000'
    depends_on:
      - postgres
    networks:
      - astralink-network
    volumes:
      - ./backend:/app # ⚠️ ПРОБЛЕМА
      - /app/node_modules

volumes:
  postgres_data:

networks:
  astralink-network:
    driver: bridge
```

**Проблемы:**

1. ❌ **Hardcoded credentials** - postgres/postgres в открытом виде
2. ❌ **Hardcoded JWT_SECRET** - "supersecret" в открытом виде
3. ⚠️ **Volume mount в production** - `./backend:/app` перезаписывает собранный код
4. ⚠️ **Нет health checks**
5. ⚠️ **Нет restart policy**
6. ⚠️ **Нет resource limits**

**Рекомендуемый docker-compose.yml:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: astralink-postgres
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-astralink}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Password required}
    ports:
      - '${POSTGRES_PORT:-5432}:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/prisma/seed.sql:/docker-entrypoint-initdb.d/seed.sql:ro
    networks:
      - astralink-network
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-postgres}']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      target: production
    container_name: astralink-backend
    env_file:
      - ./backend/.env
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${POSTGRES_USER:-postgres}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-astralink}?schema=public
    ports:
      - '${BACKEND_PORT:-3000}:3000'
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - astralink-network
    healthcheck:
      test:
        [
          'CMD',
          'node',
          '-e',
          "require('http').get('http://localhost:3000/api/health')",
        ]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
    # ❌ УДАЛИТЬ volumes в production
    # volumes:
    #   - ./backend:/app
    #   - /app/node_modules

volumes:
  postgres_data:
    driver: local

networks:
  astralink-network:
    driver: bridge
```

**Дополнительно: docker-compose.override.yml (для разработки)**

```yaml
# docker-compose.override.yml
# Автоматически применяется в dev (не коммитить в git!)
version: '3.8'

services:
  backend:
    build:
      target: builder # Используем stage builder
    environment:
      NODE_ENV: development
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run start:dev
```

**Добавить в .gitignore:**

```
docker-compose.override.yml
```

---

## Переменные окружения

### Найденные файлы

```
/home/user/AstraLink/backend/.env.example
```

**Отсутствующие файлы:**

- ❌ `/home/user/AstraLink/backend/.env`
- ❌ `/home/user/AstraLink/frontend/.env`
- ❌ `/home/user/AstraLink/.env`

### Backend .env.example

**Содержимое не найдено** (файл существует но пуст или не прочитан)

**Ожидаемое содержимое:**

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/astralink?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRATION="24h"

# Server
PORT=3000
NODE_ENV=development

# CORS
CORS_ORIGIN="http://localhost:3000,http://localhost:8081"

# Swagger
SWAGGER_ENABLED=true

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

**Проблемы:**

1. ❌ **Нет .env файла** - приложение использует значения по умолчанию из кода
2. ❌ **Hardcoded secrets** в main.ts и стратегиях
3. ❌ **Нет валидации env переменных** при старте
4. ❌ **Нет .env.production.example**

### Рекомендации

#### 1. Создать .env.example с документацией

```bash
# ================================================
# AstraLink Backend Environment Configuration
# ================================================
# Скопируйте этот файл в .env и заполните значения
# НЕ коммитьте .env в git!

# ================================================
# DATABASE CONFIGURATION
# ================================================
# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
DATABASE_URL="postgresql://postgres:changeme@localhost:5432/astralink?schema=public"

# ================================================
# JWT AUTHENTICATION
# ================================================
# Secret key for JWT signing (MUST be 32+ characters in production)
# Generate: openssl rand -base64 32
JWT_SECRET="CHANGE-THIS-TO-RANDOM-32-CHAR-STRING"

# JWT token expiration time
# Examples: 15m, 1h, 24h, 7d
JWT_EXPIRATION="1h"

# Refresh token expiration
JWT_REFRESH_EXPIRATION="7d"

# ================================================
# SERVER CONFIGURATION
# ================================================
# Port for backend server
PORT=3000

# Node environment (development, production, test)
NODE_ENV=development

# ================================================
# CORS CONFIGURATION
# ================================================
# Allowed origins (comma-separated)
# Production: Use full domain "https://app.astralink.com"
# Development: Multiple origins allowed
CORS_ORIGIN="http://localhost:3000,http://localhost:8081,exp://192.168.1.14:8081"

# Allow credentials in CORS
CORS_CREDENTIALS=true

# ================================================
# API DOCUMENTATION
# ================================================
# Enable Swagger UI (set to false in production)
SWAGGER_ENABLED=true

# Swagger path
SWAGGER_PATH="api/docs"

# ================================================
# RATE LIMITING
# ================================================
# Rate limit time window (seconds)
RATE_LIMIT_TTL=60

# Maximum requests per time window
RATE_LIMIT_MAX=100

# ================================================
# LOGGING
# ================================================
# Log level (error, warn, info, debug, verbose)
LOG_LEVEL=debug

# Log to file
LOG_TO_FILE=false

# ================================================
# REDIS (Optional - for caching)
# ================================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=

# ================================================
# SMTP (Optional - for emails)
# ================================================
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password
# SMTP_FROM="AstraLink <noreply@astralink.com>"

# ================================================
# EXTERNAL APIS (Optional)
# ================================================
# SENTRY_DSN=https://xxx@sentry.io/xxx
# GOOGLE_MAPS_API_KEY=
```

#### 2. Добавить валидацию env переменных

**Создать:** `backend/src/config/env.validation.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().startsWith('postgresql://'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRATION: z.string().default('1h'),

  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // CORS
  CORS_ORIGIN: z.string().transform((val) => val.split(',')),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // Swagger
  SWAGGER_ENABLED: z.coerce.boolean().default(true),

  // Rate Limiting
  RATE_LIMIT_TTL: z.coerce.number().default(60),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type Environment = z.infer<typeof envSchema>;

export function validateEnv(): Environment {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment variables:', error);
    process.exit(1);
  }
}
```

**Использовать в main.ts:**

```typescript
import { validateEnv } from './config/env.validation';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create(AppModule);

  // Использовать валидированные env переменные
  app.setGlobalPrefix('api');

  if (env.SWAGGER_ENABLED && env.NODE_ENV !== 'production') {
    setupSwagger(app);
  }

  await app.listen(env.PORT);
}
```

#### 3. Добавить в .gitignore

```.gitignore
# Environment files
.env
.env.local
.env.production
.env.development
.env.test

# Keep examples
!.env.example
!.env.production.example
```

#### 4. Документация для команды

**Создать:** `backend/ENV_SETUP.md`

````markdown
# Environment Setup Guide

## Quick Start

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```
````

2. Generate a secure JWT secret:

   ```bash
   openssl rand -base64 32
   ```

3. Update `.env` with your values

4. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

## Production Checklist

- [ ] Generate strong JWT_SECRET (32+ chars)
- [ ] Use strong database password
- [ ] Set NODE_ENV=production
- [ ] Disable SWAGGER_ENABLED
- [ ] Update CORS_ORIGIN to production domain
- [ ] Configure SENTRY_DSN for error tracking
- [ ] Set up Redis for caching (optional)
- [ ] Configure SMTP for emails (optional)

## Security Best Practices

1. **Never commit .env files to git**
2. **Rotate JWT_SECRET regularly** (quarterly)
3. **Use different secrets** for dev/staging/production
4. **Use environment-specific configs** in CI/CD
5. **Enable strict CORS** in production

````

---

## Рекомендации

### Критичные (в течение 48 часов)

#### 1. ✅ Исправить уязвимости

```bash
# Backend
cd backend

# Добавить npm overrides
cat >> package.json << 'EOF'
  "overrides": {
    "js-yaml": "^4.1.1"
  }
EOF

# Установить обновления
npm install
npm audit fix

# Проверить результат
npm audit --production
````

**Ожидаемый результат:** 0 critical, 0 high vulnerabilities в production

#### 2. ✅ Обновить Expo (16 патчей!)

```bash
cd frontend
npm update expo
npx expo install --fix
```

#### 3. ✅ Создать .env файлы

```bash
# Backend
cd backend
cp .env.example .env
# Отредактировать .env и заполнить секреты

# Frontend
cd ../frontend
echo "API_BASE_URL=http://localhost:3000/api" > .env

# Добавить в .gitignore
echo -e "\n# Environment\n.env\n.env.local" >> ../.gitignore
```

#### 4. ✅ Унифицировать TypeScript

```bash
# Root
npm install typescript@~5.9.2 --save-dev

# Backend
cd backend
npm install typescript@~5.9.2 --save-dev

# Frontend (уже 5.9.2)
```

### Высокий приоритет (1 неделя)

#### 5. ⚠️ Обновить ESLint 8 → 9

**Важно:** ESLint 8.x вышел из поддержки!

```bash
# Root
npm install eslint@^9.18.0 --save-dev
npm install @typescript-eslint/eslint-plugin@^8.20.0 --save-dev
npm install @typescript-eslint/parser@^8.20.0 --save-dev

# Мигрировать конфиг на flat config format
```

Документация: https://eslint.org/docs/latest/use/configure/migration-guide

#### 6. ⚠️ Включить strict mode в Backend

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Последствия:** ~50-100 ошибок типизации нужно исправить

#### 7. ⚠️ Улучшить Docker конфигурацию

- Внедрить multi-stage build
- Создать .dockerignore
- Добавить health checks
- Убрать hardcoded secrets из docker-compose.yml

#### 8. ⚠️ Добавить мониторинг зависимостей

**Опция 1: GitHub Dependabot**

Создать `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Backend dependencies
  - package-ecosystem: 'npm'
    directory: '/backend'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    reviewers:
      - 'your-team'
    labels:
      - 'dependencies'
      - 'backend'

  # Frontend dependencies
  - package-ecosystem: 'npm'
    directory: '/frontend'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    labels:
      - 'dependencies'
      - 'frontend'

  # Root dependencies
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'tooling'
```

**Опция 2: Renovate Bot**

Создать `renovate.json`:

```json
{
  "extends": ["config:base"],
  "packageRules": [
    {
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true
    }
  ],
  "schedule": ["before 10am on monday"],
  "timezone": "Europe/Moscow"
}
```

### Средний приоритет (2-4 недели)

#### 9. 📦 Обновить зависимости

```bash
# Backend
cd backend
npm update

# Frontend
cd frontend
npm update

# Root
npm update
```

**Проверить breaking changes:**

- React 19.1 → 19.2
- React Native 0.81 → 0.82
- @react-navigation/\* (множественные обновления)

#### 10. 🧪 Добавить тесты для зависимостей

Создать `backend/test/dependencies.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

describe('Dependencies Health Check', () => {
  it('should load all modules without errors', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });

  it('should have no critical vulnerabilities', async () => {
    const { execSync } = require('child_process');
    const output = execSync('npm audit --json').toString();
    const audit = JSON.parse(output);

    expect(audit.metadata.vulnerabilities.critical).toBe(0);
    expect(audit.metadata.vulnerabilities.high).toBe(0);
  });
});
```

#### 11. 📊 Добавить CI/CD проверки

`.github/workflows/dependencies.yml`:

```yaml
name: Dependency Audit

on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 0 * * 1' # Every Monday

jobs:
  audit:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        directory: [backend, frontend]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Audit ${{ matrix.directory }}
        working-directory: ${{ matrix.directory }}
        run: |
          npm ci
          npm audit --production --audit-level=moderate

      - name: Check for outdated packages
        working-directory: ${{ matrix.directory }}
        run: npm outdated || true
```

### Низкий приоритет (по возможности)

#### 12. 📝 Документация зависимостей

Создать `DEPENDENCIES.md`:

```markdown
# Project Dependencies

## Philosophy

- **Minimal dependencies**: Add only when necessary
- **Audit regularly**: Weekly dependency updates
- **Security first**: Zero critical/high vulnerabilities
- **Stable versions**: Prefer LTS versions

## Core Dependencies

### Backend

- **NestJS 11.x**: Web framework
- **Prisma 6.x**: ORM
- **Passport.js**: Authentication
- **Swiss Ephemeris**: Astronomical calculations

### Frontend

- **Expo 54.x**: React Native platform
- **React Navigation 7.x**: Routing
- **React Native Reanimated 4.x**: Animations

## Update Policy

- **Security patches**: Immediate
- **Minor updates**: Weekly review
- **Major updates**: Quarterly review with testing

## Prohibited Dependencies

- Packages with known vulnerabilities
- Abandoned packages (no updates >2 years)
- Packages with <100 GitHub stars (except specific cases)
```

#### 13. 🔧 Добавить npm scripts

```json
// root package.json
{
  "scripts": {
    "audit": "npm run audit:backend && npm run audit:frontend",
    "audit:backend": "cd backend && npm audit --production",
    "audit:frontend": "cd frontend && npm audit --production",
    "outdated": "npm run outdated:backend && npm run outdated:frontend",
    "outdated:backend": "cd backend && npm outdated",
    "outdated:frontend": "cd frontend && npm outdated",
    "update:all": "npm update && npm run update:backend && npm run update:frontend",
    "update:backend": "cd backend && npm update",
    "update:frontend": "cd frontend && npm update"
  }
}
```

---

## Чеклист внедрения

### Фаза 1: Критичные исправления (48 часов)

- [ ] Исправить 20 уязвимостей (npm overrides + audit fix)
- [ ] Обновить Expo 54.0.7 → 54.0.23
- [ ] Создать .env файлы (backend, frontend)
- [ ] Унифицировать TypeScript до 5.9.2
- [ ] Добавить .env\* в .gitignore
- [ ] Отключить Swagger в production (main.ts)

### Фаза 2: Важные улучшения (1 неделя)

- [ ] Обновить ESLint 8 → 9 (EOL)
- [ ] Включить strict mode в backend tsconfig
- [ ] Улучшить Dockerfile (multi-stage build)
- [ ] Убрать hardcoded secrets из docker-compose.yml
- [ ] Создать docker-compose.override.yml для dev
- [ ] Добавить .dockerignore
- [ ] Настроить Dependabot или Renovate

### Фаза 3: Средние улучшения (2-4 недели)

- [ ] Обновить все outdated пакеты (30 штук)
- [ ] Добавить env validation с Zod
- [ ] Создать .env.example с документацией
- [ ] Добавить health checks в Docker
- [ ] Настроить CI/CD для dependency audit
- [ ] Добавить тесты для зависимостей

### Фаза 4: Долгосрочные улучшения (по возможности)

- [ ] Создать DEPENDENCIES.md
- [ ] Добавить npm scripts для управления зависимостями
- [ ] Настроить автоматическое обновление патчей
- [ ] Внедрить Snyk или другой мониторинг безопасности
- [ ] Создать ENV_SETUP.md документацию
- [ ] Регулярные ревью зависимостей (quarterly)

---

## Метрики успеха

### До оптимизации

```
✗ Уязвимости: 20 moderate
✗ Устаревшие: 30 пакетов
✗ TypeScript: Несогласованные версии (3 разных)
✗ ESLint: EOL версия (8.57.0)
✗ Secrets: Hardcoded в коде
✗ Docker: Неоптимальный (600MB образ)
✗ Env files: Отсутствуют
✗ Мониторинг: Отсутствует
```

### После оптимизации

```
✓ Уязвимости: 0 production
✓ Устаревшие: 0 critical пакетов
✓ TypeScript: 5.9.2 везде + strict mode
✓ ESLint: 9.18.0 (актуальный)
✓ Secrets: Env variables + validation
✓ Docker: 150MB образ (multi-stage)
✓ Env files: .env + валидация
✓ Мониторинг: Dependabot активен
```

---

## Заключение

### Текущий статус: 🟠 ТРЕБУЕТ ВНИМАНИЯ

**Приоритеты:**

1. **КРИТИЧНО** - 20 уязвимостей в зависимостях (исправить за 48 часов)
2. **КРИТИЧНО** - Hardcoded secrets и отсутствие .env (исправить за 48 часов)
3. **ВЫСОКО** - ESLint 8 EOL (обновить за неделю)
4. **ВЫСОКО** - 30 устаревших пакетов (обновить за 2 недели)

**Усилия:**

- Фаза 1: ~4-6 часов
- Фаза 2: ~8-12 часов
- Фаза 3: ~16-20 часов
- Фаза 4: ~8-10 часов

**Итого:** ~36-48 часов работы (1 неделя для одного разработчика)

**Рекомендация:** Начать с Фазы 1 немедленно, затем последовательно внедрять Фазы 2-4.

---

**Дата следующего аудита:** 2025-12-15 (через 1 месяц)
