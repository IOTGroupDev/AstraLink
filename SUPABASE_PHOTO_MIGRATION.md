# Supabase Photo Migration Guide

## Проблема

При попытке установить главную фотографию (`POST /api/user/photos/:photoId/set-primary`) возникает ошибка **400 Bad Request**.

```
❌ API ошибка: /user/photos/e6c571cb-0cc8-4d6a-8005-df39325cba05/set-primary 400
```

## Причина

Backend пытается вызвать RPC функцию `set_primary_photo` в Supabase, но эта функция **не существует** в базе данных.

## Решение

Необходимо применить SQL миграцию, которая создает RPC функцию `set_primary_photo`.

---

## Шаг 1: Проверка таблицы `user_photos`

Убедитесь, что таблица `public.user_photos` существует в вашей Supabase базе данных со следующей структурой:

```sql
CREATE TABLE IF NOT EXISTS public.user_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_user_photos_user_id ON public.user_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_photos_primary ON public.user_photos(user_id, is_primary);

-- RLS policies (если используете Row Level Security)
ALTER TABLE public.user_photos ENABLE ROW LEVEL SECURITY;

-- Policy: users can view their own photos
CREATE POLICY "Users can view own photos" ON public.user_photos
  FOR SELECT USING (auth.uid()::text = user_id);

-- Policy: users can insert their own photos
CREATE POLICY "Users can insert own photos" ON public.user_photos
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Policy: users can update their own photos
CREATE POLICY "Users can update own photos" ON public.user_photos
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Policy: users can delete their own photos
CREATE POLICY "Users can delete own photos" ON public.user_photos
  FOR DELETE USING (auth.uid()::text = user_id);
```

---

## Шаг 2: Применение RPC миграции

### Через Supabase Dashboard (рекомендуется)

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл `supabase_set_primary_photo.sql` и скопируйте содержимое
5. Вставьте SQL код в редактор
6. Нажмите **Run** (или `Ctrl+Enter`)
7. Убедитесь, что миграция выполнена успешно (зеленый чекмарк ✅)

### Через Supabase CLI (альтернативный способ)

```bash
# Если у вас установлен Supabase CLI
supabase db push --file supabase_set_primary_photo.sql
```

---

## Шаг 3: Проверка установки

После применения миграции выполните следующий SQL запрос для проверки:

```sql
-- Проверка существования функции
SELECT
  proname as function_name,
  prosecdef as is_security_definer,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'set_primary_photo';
```

**Ожидаемый результат:**
- `function_name`: `set_primary_photo`
- `is_security_definer`: `true`
- `definition`: SQL код функции

---

## Шаг 4: Тестирование

После применения миграции протестируйте установку главной фотографии:

### Через API:

```bash
curl -X POST \
  https://your-project.supabase.co/rest/v1/rpc/set_primary_photo \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"p_photo_id": "e6c571cb-0cc8-4d6a-8005-df39325cba05"}'
```

### Через приложение:

1. Откройте Edit Profile в приложении
2. Загрузите несколько фотографий
3. Нажмите на любую фотографию, чтобы установить её как главную
4. Убедитесь, что ошибка **400** больше не возникает ✅

---

## Как работает функция

```sql
set_primary_photo(p_photo_id uuid)
```

**Что делает:**
1. Проверяет аутентификацию пользователя (`auth.uid()`)
2. Проверяет, что фото существует и принадлежит текущему пользователю
3. Сбрасывает `is_primary = false` для всех фото пользователя
4. Устанавливает `is_primary = true` только для выбранного фото

**Безопасность:**
- `SECURITY DEFINER`: функция выполняется с правами владельца (обходит RLS)
- Проверка владельца: пользователь может изменить только свои фото
- `GRANT EXECUTE TO authenticated`: только аутентифицированные пользователи

---

## Альтернативное решение (если не хотите использовать RPC)

Если вы не хотите использовать RPC функцию, можно модифицировать backend код для прямого обновления через Supabase Admin Client:

### В `backend/src/user/user-photos.service.ts`:

```typescript
async setPrimaryDirect(userId: string, photoId: string): Promise<void> {
  const admin = this.supabaseService.getAdminClient();

  // Проверяем, что фото принадлежит пользователю
  const { data: photo, error: checkErr } = await admin
    .from('user_photos')
    .select('id, user_id')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single();

  if (checkErr || !photo) {
    throw new NotFoundException('Photo not found');
  }

  // Сбрасываем is_primary для всех фото пользователя
  await admin
    .from('user_photos')
    .update({ is_primary: false })
    .eq('user_id', userId);

  // Устанавливаем is_primary для выбранного фото
  const { error: updateErr } = await admin
    .from('user_photos')
    .update({ is_primary: true })
    .eq('id', photoId)
    .eq('user_id', userId);

  if (updateErr) {
    throw new BadRequestException('Failed to set primary photo');
  }
}
```

### В контроллере:

```typescript
@Post(':photoId/set-primary')
@HttpCode(HttpStatus.OK)
async setPrimary(
  @Request() req: AuthenticatedRequest,
  @Param('photoId') photoId: string,
) {
  const userId = this.getUserId(req);
  await this.photosService.setPrimaryDirect(userId, photoId); // Вместо setPrimaryWithToken
  return { success: true };
}
```

**Преимущества RPC:**
- ✅ Атомарная операция (транзакция)
- ✅ Меньше сетевых запросов
- ✅ Безопасность через SECURITY DEFINER

**Преимущества Direct Update:**
- ✅ Не требует SQL миграции
- ✅ Проще для отладки
- ✅ Больше контроля на стороне backend

---

## Troubleshooting

### Ошибка: `function public.set_primary_photo(uuid) does not exist`

**Решение:** Убедитесь, что вы применили SQL миграцию (см. Шаг 2)

### Ошибка: `Not authenticated`

**Решение:** Проверьте, что JWT токен передается в заголовке `Authorization: Bearer <token>`

### Ошибка: `Permission denied: photo belongs to another user`

**Решение:** Проверьте, что `photoId` принадлежит текущему пользователю

### Ошибка: `Photo not found`

**Решение:** Проверьте, что фото с указанным `photoId` существует в таблице `user_photos`

---

## Контакты

Если возникли проблемы с миграцией или работой функции, создайте issue в репозитории проекта.
