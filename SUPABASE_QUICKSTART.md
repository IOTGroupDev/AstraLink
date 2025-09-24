# 🚀 Supabase Quick Start для AstraLink

Быстрое руководство по настройке Supabase для проекта AstraLink.

## 📋 Предварительные требования

- ✅ Аккаунт Supabase (бесплатный)
- ✅ Node.js и npm установлены
- ✅ Бэкенд AstraLink запущен

## 🎯 Быстрая настройка (5 минут)

### 1. Создание проекта Supabase

1. **Перейдите на [supabase.com](https://supabase.com)**
2. **Войдите в аккаунт** или создайте новый
3. **Нажмите "New Project"**
4. **Заполните данные:**
   - **Name**: `AstraLink`
   - **Database Password**: создайте надежный пароль (минимум 8 символов)
   - **Region**: выберите ближайший регион
5. **Нажмите "Create new project"**
6. **Дождитесь создания** (2-3 минуты)

### 2. Получение ключей API

1. **В панели Supabase** перейдите в **Settings** → **API**
2. **Скопируйте:**
   - **Project URL** (например: `https://xxx.supabase.co`)
   - **anon public** key (начинается с `eyJ...`)
   - **service_role** key (начинается с `eyJ...`)

### 3. Автоматическая настройка

```bash
# Запустите скрипт настройки
cd /Users/andrei/cursor/AstraLink
node scripts/setup-supabase.js --configure
```

**Введите данные:**
- Project URL: `https://your-project.supabase.co`
- Anon Key: `eyJ...`
- Service Role Key: `eyJ...`

### 4. Создание схемы базы данных

1. **В панели Supabase** перейдите в **SQL Editor**
2. **Создайте новый запрос**
3. **Скопируйте содержимое** файла `backend/supabase-schema.sql`
4. **Выполните запрос** (нажмите Run)

### 5. Тестирование интеграции

```bash
# Убедитесь, что бэкенд запущен
cd backend && npm run start:dev

# В другом терминале запустите тесты
cd /Users/andrei/cursor/AstraLink
node scripts/test-supabase.js
```

## ✅ Ожидаемый результат

После успешной настройки вы увидите:

```
🧪 Тестирование Supabase интеграции...

1️⃣ Тестирование регистрации через Supabase...
✅ Регистрация успешна!

2️⃣ Тестирование входа через Supabase...
✅ Вход успешен!

3️⃣ Тестирование создания натальной карты...
✅ Натальная карта создана!

4️⃣ Тестирование получения профиля...
✅ Профиль получен!

🎉 Все тесты Supabase прошли успешно!
```

## 🔧 Ручная настройка (если нужно)

### Переменные окружения

Создайте/обновите `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# Existing configuration
DATABASE_URL="postgresql://astralink:password@localhost:5432/astralink?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
```

### Настройка аутентификации

1. **В панели Supabase** → **Authentication** → **Settings**
2. **Site URL**: `http://localhost:3000`
3. **Redirect URLs**: добавьте:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:8081`

## 🧪 Тестирование API

### Регистрация через Supabase

```bash
curl -X POST http://localhost:3000/api/auth/supabase/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@supabase.com",
    "password": "password123",
    "name": "Test User",
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "birthPlace": "Moscow"
  }'
```

### Вход через Supabase

```bash
curl -X POST http://localhost:3000/api/auth/supabase/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@supabase.com",
    "password": "password123"
  }'
```

## 🚨 Устранение неполадок

### Ошибка подключения к Supabase

```
❌ Supabase URL and Anon Key are required
```

**Решение:** Проверьте переменные окружения в `.env`

### Ошибка аутентификации

```
❌ Недействительный токен
```

**Решение:** Убедитесь, что SQL схема выполнена в Supabase

### Ошибка базы данных

```
❌ relation "users" does not exist
```

**Решение:** Выполните SQL схему в Supabase SQL Editor

## 📚 Полезные ссылки

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Supabase Documentation](https://supabase.com/docs)
- [SQL Editor](https://supabase.com/dashboard/project/[your-project]/sql)
- [API Settings](https://supabase.com/dashboard/project/[your-project]/settings/api)

## 🎉 Готово!

После успешной настройки у вас будет:

- ✅ **Supabase Auth** - современная аутентификация
- ✅ **PostgreSQL** - масштабируемая база данных
- ✅ **Row Level Security** - безопасность на уровне строк
- ✅ **Real-time** - подписки на изменения
- ✅ **Storage** - загрузка файлов (для будущего)

**Теперь вы можете использовать новые эндпоинты:**
- `POST /api/auth/supabase/signup`
- `POST /api/auth/supabase/login`

**И старые эндпоинты остаются для совместимости:**
- `POST /api/auth/signup`
- `POST /api/auth/login`
