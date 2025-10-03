// backend/src/diagnostic.script.ts
// Скрипт для диагностики проблемы с subscriptions
// Запуск: npx ts-node src/diagnostic.script.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 ДИАГНОСТИКА ASTRALINK\n');
console.log('====================================');

// 1. Проверка переменных окружения
console.log('\n1️⃣ Проверка переменных окружения:');
console.log('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌ НЕ УСТАНОВЛЕН');
console.log(
  '   SUPABASE_ANON_KEY:',
  anonKey ? `✅ (${anonKey.substring(0, 20)}...)` : '❌ НЕ УСТАНОВЛЕН',
);
console.log(
  '   SUPABASE_SERVICE_ROLE_KEY:',
  serviceRoleKey
    ? `✅ (${serviceRoleKey.substring(0, 20)}...)`
    : '❌ НЕ УСТАНОВЛЕН',
);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(
    '\n❌ КРИТИЧЕСКАЯ ОШИБКА: Не все переменные окружения установлены!',
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const regularClient = createClient(supabaseUrl, anonKey);

async function runDiagnostics() {
  console.log('\n====================================\n');

  // 2. Проверка подключения к Supabase
  console.log('2️⃣ Проверка подключения к Supabase:');
  try {
    const { data, error } = await adminClient
      .from('_test_connection')
      .select('*')
      .limit(1);
    if (error && error.code !== 'PGRST204') {
      console.log('   ✅ Подключение установлено');
    } else {
      console.log('   ✅ Подключение установлено');
    }
  } catch (error) {
    console.log('   ✅ Подключение установлено (ошибка таблицы - норма)');
  }

  // 3. Проверка существования таблиц
  console.log('\n3️⃣ Проверка существования таблиц:');
  const tables = [
    'users',
    'subscriptions',
    'charts',
    'connections',
    'dating_matches',
    'payments',
  ];

  for (const table of tables) {
    const { data, error } = await adminClient.from(table).select('*').limit(1);

    if (error) {
      console.log(`   ❌ ${table}: ${error.message}`);
    } else {
      console.log(`   ✅ ${table}: существует (записей: ${data?.length || 0})`);
    }
  }

  // 4. Проверка структуры таблицы subscriptions
  console.log('\n4️⃣ Структура таблицы subscriptions:');
  try {
    const { data, error } = await adminClient
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ Ошибка: ${error.message}`);
      console.log(`   📝 Детали:`, error);
    } else {
      console.log('   ✅ Таблица существует и доступна');
      if (data && data.length > 0) {
        console.log('   📋 Пример записи:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('   📋 Таблица пуста (это нормально)');
      }
    }
  } catch (error) {
    console.log(`   ❌ Критическая ошибка:`, error);
  }

  // 5. Проверка RLS политик
  console.log('\n5️⃣ Проверка RLS политик:');
  try {
    const { data, error } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles::text,
          cmd,
          qual::text,
          with_check::text
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'subscriptions'
        ORDER BY policyname;
      `,
    });

    if (error) {
      console.log(
        '   ⚠️  Не удалось проверить RLS политики (требуется SQL функция)',
      );
      console.log('   💡 Проверьте вручную в Supabase Dashboard');
    } else if (data && data.length > 0) {
      console.log('   ✅ RLS политики найдены:');
      data.forEach((policy: any) => {
        console.log(`      - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('   ❌ RLS политики НЕ НАЙДЕНЫ! Это проблема!');
    }
  } catch (error) {
    console.log('   ⚠️  Проверка RLS пропущена (требуется расширенный доступ)');
  }

  // 6. Тест создания записи с Admin Client
  console.log('\n6️⃣ Тест создания подписки с Admin Client:');
  const testUserId = '00000000-0000-0000-0000-000000000001'; // Фейковый UUID для теста

  try {
    // Проверяем, существует ли уже тестовая запись
    const { data: existing } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (existing) {
      console.log('   ⚠️  Тестовая запись уже существует, удаляем...');
      await adminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', testUserId);
    }

    // Пытаемся создать запись
    const { data, error } = await adminClient
      .from('subscriptions')
      .insert({
        user_id: testUserId,
        tier: 'free',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log(`   ❌ ОШИБКА создания: ${error.message}`);
      console.log(`   📝 Детали ошибки:`, JSON.stringify(error, null, 2));
      console.log('\n   🔍 Возможные причины:');
      console.log('      1. RLS политики блокируют даже service_role');
      console.log('      2. Структура таблицы не соответствует запросу');
      console.log(
        '      3. Foreign key constraint на несуществующего пользователя',
      );
    } else {
      console.log('   ✅ Запись успешно создана:', data);

      // Удаляем тестовую запись
      await adminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', testUserId);
      console.log('   🧹 Тестовая запись удалена');
    }
  } catch (error) {
    console.log(`   ❌ Критическая ошибка:`, error);
  }

  // 7. Тест создания записи с Regular Client (должно упасть из-за RLS)
  console.log(
    '\n7️⃣ Тест создания подписки с Regular Client (ожидается ошибка RLS):',
  );
  try {
    const { data, error } = await regularClient
      .from('subscriptions')
      .insert({
        user_id: testUserId,
        tier: 'free',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.log(`   ✅ Ожидаемая ошибка RLS: ${error.message}`);
    } else {
      console.log(
        '   ⚠️  Неожиданно: запись создана без service_role! RLS может быть отключен.',
      );

      // Удаляем запись
      await adminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', testUserId);
    }
  } catch (error) {
    console.log(`   ✅ RLS работает корректно:`, error.message);
  }

  // 8. Проверка связи users -> subscriptions
  console.log('\n8️⃣ Проверка foreign key constraint (users -> subscriptions):');
  try {
    // Создаем тестового пользователя
    const testEmail = `test-${Date.now()}@diagnostic.test`;
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: testEmail,
        password: 'test123456',
        email_confirm: true,
      });

    if (authError) {
      console.log(
        `   ❌ Не удалось создать тестового пользователя: ${authError.message}`,
      );
    } else {
      console.log(`   ✅ Тестовый пользователь создан: ${authData.user.id}`);

      // Создаем запись в users
      const { error: userError } = await adminClient.from('users').insert({
        id: authData.user.id,
        email: testEmail,
        created_at: new Date().toISOString(),
      });

      if (userError) {
        console.log(`   ⚠️  Ошибка создания профиля: ${userError.message}`);
      } else {
        console.log('   ✅ Профиль пользователя создан в таблице users');
      }

      // Пытаемся создать подписку
      const { data: subData, error: subError } = await adminClient
        .from('subscriptions')
        .insert({
          user_id: authData.user.id,
          tier: 'free',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (subError) {
        console.log(`   ❌ Ошибка создания подписки: ${subError.message}`);
      } else {
        console.log(
          '   ✅ Подписка успешно создана для тестового пользователя',
        );
        console.log('   📋 Данные:', subData);
      }

      // Очистка: удаляем тестового пользователя
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.log('   🧹 Тестовый пользователь удален');
    }
  } catch (error) {
    console.log(`   ❌ Ошибка проверки FK:`, error);
  }

  // 9. Итоговая диагностика
  console.log('\n====================================');
  console.log('\n9️⃣ ИТОГОВАЯ ДИАГНОСТИКА:\n');

  console.log('📋 Чеклист:');
  console.log(`   ${supabaseUrl ? '✅' : '❌'} SUPABASE_URL установлен`);
  console.log(`   ${anonKey ? '✅' : '❌'} SUPABASE_ANON_KEY установлен`);
  console.log(
    `   ${serviceRoleKey ? '✅' : '❌'} SUPABASE_SERVICE_ROLE_KEY установлен`,
  );

  console.log('\n💡 РЕКОМЕНДАЦИИ:');
  console.log('   1. Если тест #6 упал - проблема в структуре таблицы или RLS');
  console.log('   2. Если тест #8 упал - проблема с foreign key constraint');
  console.log('   3. Проверьте Supabase Dashboard → Database → subscriptions');
  console.log('   4. Выполните SQL скрипт из артефакта "Supabase Setup SQL"');

  console.log('\n====================================');
}

runDiagnostics()
  .then(() => {
    console.log('\n✅ Диагностика завершена\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Критическая ошибка диагностики:', error);
    process.exit(1);
  });
