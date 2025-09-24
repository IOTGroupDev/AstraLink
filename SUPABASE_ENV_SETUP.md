# 🔧 Настройка переменных окружения для Supabase

## 📋 Что нужно сделать

### 1. Создать файл `.env` в папке `backend/`

```bash
cd backend
cp .env.example .env  # если есть .env.example
# или создайте новый файл .env
```

### 2. Содержимое файла `.env`

```env
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Legacy Database (will be removed after Supabase migration)
DATABASE_URL="postgresql://astralink:password@localhost:5432/astralink?schema=public"

# JWT Secret (for legacy auth, will be removed)
JWT_SECRET="your-super-secret-jwt-key"

# Application
PORT=3000
NODE_ENV=development
```

### 3. Получить ключи Supabase

1. **Зайдите в Supabase Dashboard**
2. **Выберите ваш проект**
3. **Settings → API**
4. **Скопируйте:**
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role secret` → `SUPABASE_SERVICE_ROLE_KEY`

### 4. Обновить переменные

Замените в `.env`:
- `your-project.supabase.co` → ваш реальный URL
- `your-anon-key` → ваш реальный anon key
- `your-service-role-key` → ваш реальный service role key

## ✅ Проверка настройки

После создания `.env` файла:

```bash
# Запустите бэкенд
cd backend
npm run start:dev

# Должно появиться:
# ✅ Supabase client initialized
# ✅ Swiss Ephemeris инициализирован
```

## 🚀 Следующие шаги

1. **Создайте проект Supabase**
2. **Выполните SQL схему** (`backend/supabase-schema-safe.sql`)
3. **Обновите `.env`** с реальными ключами
4. **Протестируйте интеграцию** (`node scripts/test-supabase.js`)

## 🔄 Миграция с Docker

### Что больше не нужно:
- ❌ Docker контейнер PostgreSQL
- ❌ Локальная база данных
- ❌ Prisma миграции (для Supabase)

### Что используется:
- ✅ Supabase PostgreSQL
- ✅ Supabase Auth
- ✅ Supabase RLS
- ✅ NestJS бизнес-логика
