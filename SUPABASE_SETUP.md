# Supabase Integration Setup

Этот документ описывает настройку интеграции с Supabase для проекта AstraLink.

## 🚀 Шаги настройки

### 1. Создание проекта Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Войдите в аккаунт или создайте новый
3. Нажмите "New Project"
4. Выберите организацию
5. Заполните данные проекта:
   - **Name**: `AstraLink`
   - **Database Password**: создайте надежный пароль
   - **Region**: выберите ближайший регион
6. Нажмите "Create new project"

### 2. Получение ключей API

1. В панели Supabase перейдите в **Settings** → **API**
2. Скопируйте следующие значения:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

### 3. Настройка переменных окружения

Обновите файл `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Existing configuration (keep for migration)
DATABASE_URL="postgresql://astralink:password@localhost:5432/astralink?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
```

### 4. Создание схемы базы данных

1. В панели Supabase перейдите в **SQL Editor**
2. Создайте новый запрос
3. Скопируйте содержимое файла `backend/supabase-schema.sql`
4. Выполните запрос

### 5. Настройка аутентификации

1. В панели Supabase перейдите в **Authentication** → **Settings**
2. Настройте **Site URL**: `http://localhost:3000`
3. Добавьте **Redirect URLs**:
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:8081` (для Expo)

### 6. Тестирование интеграции

Запустите бэкенд:

```bash
cd backend
npm run start:dev
```

Тестируйте новые эндпоинты:

```bash
# Регистрация через Supabase
curl -X POST http://localhost:3000/api/auth/supabase/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User",
    "birthDate": "1990-01-01",
    "birthTime": "12:00",
    "birthPlace": "Moscow"
  }'

# Вход через Supabase
curl -X POST http://localhost:3000/api/auth/supabase/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📊 Структура базы данных

### Таблицы

- **users** - профили пользователей (расширяет auth.users)
- **charts** - астрологические карты
- **connections** - связи между пользователями
- **dating_matches** - совпадения для dating
- **subscriptions** - подписки пользователей

### Row Level Security (RLS)

Все таблицы защищены политиками RLS:

- Пользователи могут видеть/изменять только свои данные
- Автоматическое создание профиля при регистрации

## 🔧 Дополнительные настройки

### Real-time подписки

```typescript
// Подписка на изменения в таблице charts
const subscription = await supabaseService.subscribe('charts', (payload) => {
  console.log('Chart updated:', payload);
});
```

### Storage (для будущего использования)

```typescript
// Загрузка файлов
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('user-avatar.jpg', file);
```

## 🚨 Важные замечания

1. **Безопасность**: Никогда не коммитьте ключи API в репозиторий
2. **Миграция**: Старые эндпоинты (`/auth/login`, `/auth/signup`) остаются для совместимости
3. **Тестирование**: Используйте тестовые данные для разработки
4. **Мониторинг**: Следите за использованием в панели Supabase

## 📚 Документация

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
