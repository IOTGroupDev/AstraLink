// backend/src/scripts/seed.dating.ts
// Заполнение базы тестовыми пользователями (30 шт) + профили + натальные карты (упрощённые)
// Запуск: npm run seed:dating

import 'dotenv/config';
import { createClient, User } from '@supabase/supabase-js';
import * as winston from 'winston';

type CityKey = 'Москва' | 'Санкт-Петербург' | 'Екатеринбург' | 'Новосибирск';

// Winston logger for seeding script
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: [new winston.transports.Console()],
});

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  logger.error(
    '❌ Требуются SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в backend/.env',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

// Набор городов должен совпадать с [ChartService.getLocationCoordinates()](../chart/chart.service.ts:856)
const cities: CityKey[] = [
  'Москва',
  'Санкт-Петербург',
  'Екатеринбург',
  'Новосибирск',
];

// Утилиты
const pad2 = (n: number) => String(n).padStart(2, '0');
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

// Распределение дат рождения 1988..2001, валидные даты
function randomBirthDate(yearMin = 1988, yearMax = 2001): string {
  const year = rand(yearMin, yearMax);
  const month = rand(1, 12);
  const dayMaxPerMonth = [
    31,
    year % 4 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ][month - 1];
  const day = rand(1, dayMaxPerMonth);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function randomBirthTime(): string {
  return `${pad2(rand(0, 23))}:${pad2(rand(0, 59))}`;
}

function pickCity(): CityKey {
  return cities[rand(0, cities.length - 1)];
}

const planetKeys = [
  'sun',
  'moon',
  'mercury',
  'venus',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

const zodiac = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

// Преобразование долготы в знак, чтобы соответствовать формату [ChartService.calculatePlanets()](../chart/chart.service.ts:291)
function longitudeToSign(longitude: number): string {
  const idx = Math.floor((((longitude % 360) + 360) % 360) / 30);
  return zodiac[idx % 12];
}

// Генерация простых данных натальной карты (без swisseph), достаточных для синастрии
function generateNatalData(
  birthDateISO: string,
  birthTime: string,
  birthPlace: CityKey,
) {
  // Слегка скоррелируем распределение по индексу, чтобы у разных пользователей дистрибуция отличалась
  const baseShift = rand(0, 359);

  const planets: any = {};
  planetKeys.forEach((p, i) => {
    const longitude = (((baseShift + i * 33 + rand(0, 25)) % 360) + 360) % 360;
    planets[p] = {
      longitude,
      sign: longitudeToSign(longitude),
      degree: longitude % 30,
      speed: Math.random() * 1.5, // положительная, чтобы не ретроград
      isRetrograde: false,
    };
  });

  const houses: any = {};
  const houseOffset = rand(0, 359);
  for (let i = 1; i <= 12; i++) {
    const cusp = (((houseOffset + (i - 1) * 30) % 360) + 360) % 360;
    houses[i] = {
      cusp,
      sign: longitudeToSign(cusp),
    };
  }

  // Аспекты не обязательны — [ChartService.getSynastry()](../chart/chart.service.ts:221) сам вычислит кросс-аспекты
  const aspects: any[] = [];

  return {
    type: 'natal',
    birthDate: new Date(`${birthDateISO}T${birthTime}:00.000Z`).toISOString(),
    location: birthPlace,
    planets,
    houses,
    aspects,
    calculatedAt: new Date().toISOString(),
  };
}

async function getOrCreateAuthUser(
  email: string,
  password: string,
): Promise<User> {
  // Сначала попробуем создать
  const { data: created, error: createErr } = await admin.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
    },
  );

  if (created?.user) {
    return created.user;
  }

  // Если уже существует — достанем через listUsers
  if (createErr) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const found = list.users.find(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!found) throw createErr;
    return found;
  }

  throw new Error('Неизвестная ошибка создания пользователя');
}

async function upsertProfile(
  user: User,
  name: string,
  birthDate: string,
  birthTime: string,
  birthPlace: CityKey,
) {
  // upsert профиль в public.users
  const { error } = await admin.from('users').upsert(
    {
      id: user.id,
      email: user.email,
      name,
      birth_date: birthDate,
      birth_time: birthTime,
      birth_place: birthPlace,
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' as any }, // supabase-js v2 тип onConflict: string
  );

  if (error) {
    throw new Error(`Ошибка upsert профиля: ${error.message}`);
  }
}

async function replaceChart(userId: string, chartData: any) {
  // Удалим старые карты пользователя (если есть), чтобы не плодить записи
  await admin.from('charts').delete().eq('user_id', userId);

  const { error } = await admin.from('charts').insert({
    user_id: userId,
    data: chartData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Ошибка вставки карты: ${error.message}`);
  }
}

async function main() {
  logger.info('🌱 Seeding dating data...');

  const usersCount = 30;
  const baseName = 'Тест';
  const emailBase = 'astralink.dev';
  const password = 'password';

  for (let i = 1; i <= usersCount; i++) {
    const email = `test${pad2(i)}@${emailBase}`;
    const name = `${baseName} ${i}`;
    const birthDate = randomBirthDate();
    const birthTime = randomBirthTime();
    const city = pickCity();

    try {
      const user = await getOrCreateAuthUser(email, password);
      await upsertProfile(user, name, birthDate, birthTime, city);

      const chart = generateNatalData(birthDate, birthTime, city);
      await replaceChart(user.id, chart);

      logger.info(`✅ ${pad2(i)}/${usersCount} — ${email} (${city})`);
    } catch (e: any) {
      logger.error(`❌ ${pad2(i)} — ${email}: ${e?.message || e}`);
    }
  }

  logger.info('🎉 Done.');
}

main().catch((e) => {
  logger.error('❌ Seed failed:', e);
  process.exit(1);
});
