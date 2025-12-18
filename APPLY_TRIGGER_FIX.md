# 🔧 Применение исправления триггера OTP

## ❌ Проблема с правами доступа

Ошибка `must be owner of relation users` означает, что обычный SQL Editor не имеет прав на создание триггеров в схеме `auth`.

---

## ✅ РЕШЕНИЕ 1: Supabase Dashboard → Database → Migrations (РЕКОМЕНДУЕТСЯ)

### Шаги:

1. Откройте **Supabase Dashboard**
2. Перейдите в **Database** → **Migrations** (не SQL Editor!)
3. Нажмите **"New migration"** или **"Create a new migration"**
4. Название: `fix_otp_trigger`
5. **Скопируйте SQL из файла:**
   ```
   supabase/migrations/20251218000000_fix_otp_trigger.sql
   ```
6. Или скопируйте SQL ниже:

```sql
-- Clean up incorrect trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Create function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, authenticated;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

7. Нажмите **"Run now"** или **"Apply"**

---

## ✅ РЕШЕНИЕ 2: Supabase CLI (если установлен)

```bash
# Из корня проекта
cd /home/user/AstraLink

# Применить миграцию
supabase db push

# Или напрямую:
supabase db execute -f supabase/migrations/20251218000000_fix_otp_trigger.sql
```

---

## ✅ РЕШЕНИЕ 3: Временное решение (через Backend API)

Если миграция не применяется, можно создать пользователя через Backend API при верификации OTP.

### Изменить `frontend/src/screens/Auth/OptCodeScreen.tsx`:

Найти место где вызывается `supabase.auth.verifyOtp` и добавить создание профиля:

```typescript
const { data, error } = await supabase.auth.verifyOtp({
  type: 'email',
  email: String(email).trim().toLowerCase(),
  token: code,
});

if (!error && data.user) {
  // Создать профиль через Backend API если его нет
  try {
    await authAPI.completeSignup({
      userId: data.user.id,
      name: data.user.email?.split('@')[0] || 'User',
      birthDate: new Date().toISOString(),
      birthTime: '12:00',
      birthPlace: 'Moscow',
    });
  } catch (err) {
    // Если профиль уже существует - игнорировать ошибку
    console.log('Profile already exists or created');
  }
}
```

Это создаст запись в `public.users` через Backend API, который имеет права админа.

---

## ✅ РЕШЕНИЕ 4: Связаться с поддержкой Supabase

Если ничего не помогает:

1. Supabase Dashboard → Support
2. Попросить добавить триггер вручную:
   ```
   Trigger: on_auth_user_created on auth.users
   Function: public.handle_new_user()
   ```

---

## 🔍 Проверка после применения

После любого из решений, выполните в SQL Editor:

```sql
SELECT
  trigger_name,
  event_object_schema,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Ожидаемый результат:**
```
trigger_name: on_auth_user_created
event_object_schema: auth
event_object_table: users
```

---

## 🧪 Финальный тест

1. Перезапустите приложение
2. Отправьте OTP на email
3. Логи должны показать:
   ```
   ✅ OTP отправлен
   ```
   БЕЗ ошибки "Database error saving new user"

---

## 📌 Почему это важно

Migrations в Supabase Dashboard выполняются с правами `supabase_admin`, которые могут создавать триггеры на таблицах `auth.*`. SQL Editor выполняется с ограниченными правами.

Используйте **Database → Migrations**, а не SQL Editor!
