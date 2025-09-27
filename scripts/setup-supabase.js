#!/usr/bin/env node

/**
 * Supabase Setup Script for AstraLink
 * Этот скрипт поможет настроить Supabase проект для AstraLink
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('🚀 AstraLink Supabase Setup\n');

console.log('📋 Инструкции:');
console.log('1. Перейдите на https://supabase.com');
console.log('2. Войдите в аккаунт или создайте новый');
console.log('3. Нажмите "New Project"');
console.log('4. Заполните данные проекта\n');

const questions = [
  {
    key: 'projectName',
    question: 'Название проекта (например: AstraLink): ',
    default: 'AstraLink',
  },
  {
    key: 'databasePassword',
    question: 'Пароль базы данных (минимум 8 символов): ',
    default: '',
  },
  {
    key: 'region',
    question: 'Регион (например: us-east-1, eu-west-1): ',
    default: 'us-east-1',
  },
];

const answers = {};

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question.question, (answer) => {
      resolve(answer || question.default);
    });
  });
}

async function main() {
  console.log('🔧 Настройка проекта Supabase:\n');

  for (const question of questions) {
    answers[question.key] = await askQuestion(question);
  }

  console.log('\n✅ Данные проекта:');
  console.log(`Название: ${answers.projectName}`);
  console.log(`Регион: ${answers.region}`);
  console.log(`Пароль БД: ${answers.databasePassword ? '***' : 'не указан'}`);

  console.log('\n📝 Следующие шаги:');
  console.log('1. Создайте проект в Supabase с указанными параметрами');
  console.log('2. Дождитесь завершения создания проекта (2-3 минуты)');
  console.log('3. Перейдите в Settings → API');
  console.log('4. Скопируйте Project URL и anon public key');
  console.log(
    '5. Запустите этот скрипт снова с командой: node setup-supabase.js --configure'
  );

  console.log('\n🔗 Полезные ссылки:');
  console.log('- Supabase Dashboard: https://supabase.com/dashboard');
  console.log('- Документация: https://supabase.com/docs');
  console.log(
    '- SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql'
  );

  rl.close();
}

// Проверяем аргументы командной строки
if (process.argv.includes('--configure')) {
  console.log('🔧 Конфигурация Supabase...\n');

  rl.question('Project URL (https://xxx.supabase.co): ', (url) => {
    rl.question('Anon Key: ', (anonKey) => {
      rl.question('Service Role Key (опционально): ', (serviceKey) => {
        const envContent = `
# Supabase Configuration
SUPABASE_URL="${url}"
SUPABASE_ANON_KEY="${anonKey}"
SUPABASE_SERVICE_ROLE_KEY="${serviceKey}"

# Existing configuration (keep for migration)
DATABASE_URL="postgresql://astralink:password@localhost:5432/astralink?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"
`;

        const envPath = path.join(__dirname, '..', 'backend', '.env');

        try {
          fs.writeFileSync(envPath, envContent);
          console.log('\n✅ Файл .env обновлен!');
          console.log('📍 Путь:', envPath);

          console.log('\n🚀 Следующие шаги:');
          console.log('1. Выполните SQL схему в Supabase SQL Editor');
          console.log('2. Запустите бэкенд: cd backend && npm run start:dev');
          console.log('3. Протестируйте эндпоинты Supabase');
        } catch (error) {
          console.error('❌ Ошибка записи файла:', error.message);
        }

        rl.close();
      });
    });
  });
} else {
  main();
}
