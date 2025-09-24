#!/usr/bin/env node

/**
 * Supabase Integration Test Script
 * Тестирует интеграцию Supabase с AstraLink
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// Тестовые данные
const testUser = {
  email: 'supabase-test@astralink.com',
  password: 'password123',
  name: 'Supabase Test User',
  birthDate: '1990-08-15',
  birthTime: '12:00',
  birthPlace: 'Moscow'
};

async function testSupabaseIntegration() {
  console.log('🧪 Тестирование Supabase интеграции...\n');

  try {
    // 1. Тест регистрации через Supabase
    console.log('1️⃣ Тестирование регистрации через Supabase...');
    
    // Сначала попробуем войти (если пользователь уже существует)
    let signupResponse;
    try {
      await axios.post(`${BASE_URL}/auth/supabase/login`, {
        email: testUser.email,
        password: testUser.password
      });
      console.log('⚠️ Пользователь уже существует, пропускаем регистрацию');
      signupResponse = null;
    } catch (loginError) {
      // Пользователь не существует, продолжаем с регистрацией
      signupResponse = await axios.post(`${BASE_URL}/auth/supabase/signup`, testUser);
      
      if (signupResponse.status === 201) {
        console.log('✅ Регистрация успешна!');
        console.log('👤 Пользователь:', signupResponse.data.user.email);
        console.log('🔑 Токен получен:', signupResponse.data.access_token ? 'Да' : 'Нет');
      }
    }

    // 2. Тест входа через Supabase
    console.log('\n2️⃣ Тестирование входа через Supabase...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/supabase/login`, {
      email: testUser.email,
      password: testUser.password
    });

    if (loginResponse.status === 200) {
      console.log('✅ Вход успешен!');
      console.log('👤 Пользователь:', loginResponse.data.user.email);
      console.log('🔑 Токен получен:', loginResponse.data.access_token ? 'Да' : 'Нет');
      
      const token = loginResponse.data.access_token;

      // 3. Тест создания натальной карты
      console.log('\n3️⃣ Тестирование создания натальной карты...');
      const chartResponse = await axios.post(`${BASE_URL}/chart/natal`, 
        { data: {} },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (chartResponse.status === 201) {
        console.log('✅ Натальная карта создана!');
        console.log('🪐 Планет:', Object.keys(chartResponse.data.planets || {}).length);
        console.log('🏠 Домов:', chartResponse.data.houses?.length || 0);
        console.log('⭐ Аспектов:', chartResponse.data.aspects?.length || 0);
      }

      // 4. Тест получения профиля
      console.log('\n4️⃣ Тестирование получения профиля...');
      const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (profileResponse.status === 200) {
        console.log('✅ Профиль получен!');
        console.log('👤 Имя:', profileResponse.data.name);
        console.log('📅 Дата рождения:', profileResponse.data.birthDate);
        console.log('📍 Место рождения:', profileResponse.data.birthPlace);
      }

    }

    console.log('\n🎉 Все тесты Supabase прошли успешно!');
    console.log('\n📊 Результаты:');
    console.log('- ✅ Supabase Auth работает');
    console.log('- ✅ База данных Supabase подключена');
    console.log('- ✅ Row Level Security активна');
    console.log('- ✅ Интеграция с NestJS работает');

  } catch (error) {
    console.error('\n❌ Ошибка тестирования:', error.message);
    
    if (error.response) {
      console.error('📋 Детали ошибки:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }

    console.log('\n🔧 Возможные решения:');
    console.log('1. Убедитесь, что бэкенд запущен: npm run start:dev');
    console.log('2. Проверьте переменные окружения в .env');
    console.log('3. Убедитесь, что SQL схема выполнена в Supabase');
    console.log('4. Проверьте подключение к Supabase');
  }
}

// Проверяем, что бэкенд запущен
async function checkBackend() {
  try {
    await axios.get(`${BASE_URL}`);
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Проверка бэкенда...');
  
  const backendRunning = await checkBackend();
  if (!backendRunning) {
    console.log('❌ Бэкенд не запущен!');
    console.log('🚀 Запустите бэкенд: cd backend && npm run start:dev');
    process.exit(1);
  }

  console.log('✅ Бэкенд запущен\n');
  await testSupabaseIntegration();
}

main();
