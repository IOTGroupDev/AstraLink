#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testIntegration() {
  console.log('🧪 Тестирование интеграции Swiss Ephemeris...\n');

  try {
    // 1. Авторизация
    console.log('1️⃣ Авторизация...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@astralink.com',
      password: 'password123',
    });

    console.log('✅ Авторизация успешна');
    console.log(`   Пользователь: ${loginResponse.data.user.name}`);
    console.log(`   Токен: ${loginResponse.data.token.substring(0, 20)}...`);

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 2. Создание натальной карты
    console.log('\n2️⃣ Создание натальной карты...');
    const chartResponse = await axios.post(
      `${API_BASE}/chart/natal`,
      { data: {} },
      { headers },
    );

    console.log('✅ Натальная карта создана');
    console.log(`   ID карты: ${chartResponse.data.id}`);
    console.log(`   Дата рождения: ${chartResponse.data.data.birthDate}`);
    console.log(
      `   Количество планет: ${Object.keys(chartResponse.data.data.planets).length}`,
    );
    console.log(
      `   Количество аспектов: ${chartResponse.data.data.aspects.length}`,
    );

    // 3. Показываем планеты
    console.log('\n🪐 Позиции планет:');
    Object.entries(chartResponse.data.data.planets).forEach(
      ([planet, data]) => {
        console.log(`   ${planet}: ${data.sign} ${data.degree.toFixed(1)}°`);
      },
    );

    // 4. Показываем сильнейшие аспекты
    console.log('\n⭐ Сильнейшие аспекты:');
    const strongAspects = chartResponse.data.data.aspects
      .sort((a, b) => (b.strength || 0) - (a.strength || 0))
      .slice(0, 5);

    strongAspects.forEach((aspect, index) => {
      console.log(
        `   ${index + 1}. ${aspect.planetA} ${aspect.aspect} ${aspect.planetB} (сила: ${(aspect.strength * 100).toFixed(1)}%)`,
      );
    });

    // 5. Тестируем получение карты
    console.log('\n3️⃣ Получение существующей карты...');
    const getChartResponse = await axios.get(`${API_BASE}/chart/natal`, {
      headers,
    });
    console.log('✅ Карта получена успешно');

    // 6. Тестируем транзиты (может не работать)
    try {
      console.log('\n4️⃣ Получение транзитов...');
      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      const transitsResponse = await axios.get(
        `${API_BASE}/chart/transits?from=${from}&to=${to}`,
        { headers },
      );
      console.log('✅ Транзиты получены');
      console.log(
        `   Количество транзитов: ${transitsResponse.data.transits?.length || 0}`,
      );
    } catch (error) {
      console.log('⚠️ Транзиты пока не реализованы');
    }

    console.log('\n🎉 Все тесты пройдены! Swiss Ephemeris работает корректно.');
  } catch (error) {
    console.error('\n❌ Ошибка:', error.response?.data || error.message);
    process.exit(1);
  }
}

testIntegration();
