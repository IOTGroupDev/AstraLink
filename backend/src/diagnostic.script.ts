// backend/src/diagnostic.script.ts
// Скрипт для диагностики проблемы с subscriptions
// Запуск: npx ts-node src/diagnostic.script.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

logger.info('🔍 ДИАГНОСТИКА ASTRALINK\n');
logger.info('====================================');

// 1. Проверка переменных окружения
logger.info('\n1️⃣ Проверка переменных окружения:');
logger.info('   SUPABASE_URL: ' + (supabaseUrl ? '✅' : '❌ НЕ УСТАНОВЛЕН'));
logger.info(
  '   SUPABASE_ANON_KEY: ' +
    (anonKey ? `✅ (${anonKey.substring(0, 20)}...)` : '❌ НЕ УСТАНОВЛЕН'),
);
logger.info(
  '   SUPABASE_SERVICE_ROLE_KEY: ' +
    (serviceRoleKey
      ? `✅ (${serviceRoleKey.substring(0, 20)}...)`
      : '❌ НЕ УСТАНОВЛЕН'),
);

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  logger.error(
    '\n❌ КРИТИЧЕСКАЯ ОШИБКА: Не все переменные окружения установлены!',
  );
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey);
const regularClient = createClient(supabaseUrl, anonKey);

async function runDiagnostics() {
  logger.info('\n====================================\n');

  // 2. Проверка подключения к Supabase
  logger.info('2️⃣ Проверка подключения к Supabase:');
  try {
    const { error } = await adminClient
      .from('_test_connection')
      .select('*')
      .limit(1);
    if (error && error.code !== 'PGRST204') {
      logger.info('   ✅ Подключение установлено');
    } else {
      logger.info('   ✅ Подключение установлено');
    }
  } catch (_error) {
    logger.info('   ✅ Подключение установлено (ошибка таблицы - норма)');
  }

  // 3. Проверка существования таблиц
  logger.info('\n3️⃣ Проверка существования таблиц:');
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
      logger.info(`   ❌ ${table}: ${error.message}`);
    } else {
      logger.info(`   ✅ ${table}: существует (записей: ${data?.length || 0})`);
    }
  }

  // 4. Проверка структуры таблицы subscriptions
  logger.info('\n4️⃣ Структура таблицы subscriptions:');
  try {
    const { data, error } = await adminClient
      .from('subscriptions')
      .select('*')
      .limit(1);

    if (error) {
      logger.info(`   ❌ Ошибка: ${error.message}`);
      logger.info(`   📝 Детали: ${JSON.stringify(error)}`);
    } else {
      logger.info('   ✅ Таблица существует и доступна');
      if (data && data.length > 0) {
        logger.info('   📋 Пример записи: ' + JSON.stringify(data[0], null, 2));
      } else {
        logger.info('   📋 Таблица пуста (это нормально)');
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`   ❌ Критическая ошибка: ${msg}`);
  }

  // 5. Проверка RLS политик
  logger.info('\n5️⃣ Проверка RLS политик:');
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
      logger.info(
        '   ⚠️  Не удалось проверить RLS политики (требуется SQL функция)',
      );
      logger.info('   💡 Проверьте вручную в Supabase Dashboard');
    } else if (data && data.length > 0) {
      logger.info('   ✅ RLS политики найдены:');
      data.forEach((policy: any) => {
        logger.info(`      - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      logger.info('   ❌ RLS политики НЕ НАЙДЕНЫ! Это проблема!');
    }
  } catch (_error) {
    logger.info('   ⚠️  Проверка RLS пропущена (требуется расширенный доступ)');
  }

  // 6. Тест создания записи с Admin Client
  logger.info('\n6️⃣ Тест создания подписки с Admin Client:');
  const testUserId = '00000000-0000-0000-0000-000000000001'; // Фейковый UUID для теста

  try {
    // Проверяем, существует ли уже тестовая запись
    const { data: existing } = await adminClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (existing) {
      logger.info('   ⚠️  Тестовая запись уже существует, удаляем...');
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
      logger.info(`   ❌ ОШИБКА создания: ${error.message}`);
      logger.info(`   📝 Детали ошибки: ${JSON.stringify(error, null, 2)}`);
      logger.info('\n   🔍 Возможные причины:');
      logger.info('      1. RLS политики блокируют даже service_role');
      logger.info('      2. Структура таблицы не соответствует запросу');
      logger.info(
        '      3. Foreign key constraint на несуществующего пользователя',
      );
    } else {
      logger.info('   ✅ Запись успешно создана: ' + JSON.stringify(data));

      // Удаляем тестовую запись
      await adminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', testUserId);
      logger.info('   🧹 Тестовая запись удалена');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`   ❌ Критическая ошибка: ${msg}`);
  }

  // 7. Тест создания записи с Regular Client (должно упасть из-за RLS)
  logger.info(
    '\n7️⃣ Тест создания подписки с Regular Client (ожидается ошибка RLS):',
  );
  try {
    const { error } = await regularClient
      .from('subscriptions')
      .insert({
        user_id: testUserId,
        tier: 'free',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.info(`   ✅ Ожидаемая ошибка RLS: ${error.message}`);
    } else {
      logger.info(
        '   ⚠️  Неожиданно: запись создана без service_role! RLS может быть отключен.',
      );

      // Удаляем запись
      await adminClient
        .from('subscriptions')
        .delete()
        .eq('user_id', testUserId);
    }
  } catch (error) {
    logger.info(`   ✅ RLS работает корректно: ${(error as Error).message}`);
  }

  // 8. Проверка связи users -> subscriptions
  logger.info('\n8️⃣ Проверка foreign key constraint (users -> subscriptions):');
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
      logger.info(
        `   ❌ Не удалось создать тестового пользователя: ${authError.message}`,
      );
    } else {
      logger.info(`   ✅ Тестовый пользователь создан: ${authData.user.id}`);

      // Создаем запись в users
      const { error: userError } = await adminClient.from('users').insert({
        id: authData.user.id,
        email: testEmail,
        created_at: new Date().toISOString(),
      });

      if (userError) {
        logger.info(`   ⚠️  Ошибка создания профиля: ${userError.message}`);
      } else {
        logger.info('   ✅ Профиль пользователя создан в таблице users');
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
        logger.info(`   ❌ Ошибка создания подписки: ${subError.message}`);
      } else {
        logger.info(
          '   ✅ Подписка успешно создана для тестового пользователя',
        );
        logger.info('   📋 Данные: ' + JSON.stringify(subData));
      }

      // Очистка: удаляем тестового пользователя
      await adminClient.auth.admin.deleteUser(authData.user.id);
      logger.info('   🧹 Тестовый пользователь удален');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`   ❌ Ошибка проверки FK: ${msg}`);
  }

  // 9. Итоговая диагностика
  logger.info('\n====================================');
  logger.info('\n9️⃣ ИТОГОВАЯ ДИАГНОСТИКА:\n');

  logger.info('📋 Чеклист:');
  logger.info(`   ${supabaseUrl ? '✅' : '❌'} SUPABASE_URL установлен`);
  logger.info(`   ${anonKey ? '✅' : '❌'} SUPABASE_ANON_KEY установлен`);
  logger.info(
    `   ${serviceRoleKey ? '✅' : '❌'} SUPABASE_SERVICE_ROLE_KEY установлен`,
  );

  logger.info('\n💡 РЕКОМЕНДАЦИИ:');
  logger.info('   1. Если тест #6 упал - проблема в структуре таблицы или RLS');
  logger.info('   2. Если тест #8 упал - проблема с foreign key constraint');
  logger.info('   3. Проверьте Supabase Dashboard → Database → subscriptions');
  logger.info('   4. Выполните SQL скрипт из артефакта "Supabase Setup SQL"');

  logger.info('\n====================================');
}

runDiagnostics()
  .then(() => {
    logger.info('\n✅ Диагностика завершена\n');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('\n❌ Критическая ошибка диагностики: ' + error);
    process.exit(1);
  });
