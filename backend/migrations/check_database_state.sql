-- Проверка наличия триггера в базе данных
-- Скопируйте этот SQL и выполните в Supabase SQL Editor

-- 1. Проверить существующие триггеры
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
   OR trigger_schema = 'public'
ORDER BY trigger_name;

-- 2. Проверить функции handle_new_user
SELECT
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_name LIKE '%handle_new_user%'
   OR routine_name LIKE '%new_user%';

-- 3. Проверить записи в public.users
SELECT COUNT(*) as total_users FROM public.users;

-- 4. Проверить записи в auth.users
SELECT COUNT(*) as total_auth_users FROM auth.users;

-- 5. Проверить есть ли расхождения
SELECT
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM public.users) as public_users,
    (SELECT COUNT(*) FROM auth.users) - (SELECT COUNT(*) FROM public.users) as difference;
