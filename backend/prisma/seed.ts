import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Начинаем заполнение базы данных...');

  // Создаем пользователя
  const hashedPassword = await bcrypt.hash('password', 10);
  
  const user = await prisma.user.create({
    data: {
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Тестовый Пользователь',
      birthDate: new Date('1990-05-15'),
      birthTime: '14:30',
      birthPlace: 'Москва',
      role: 'user',
    },
  });

  console.log('✅ Пользователь создан:', user.email);

  // Создаем Chart с фиктивными данными
  const chart = await prisma.chart.create({
    data: {
      userId: user.id,
      data: {
        type: 'natal',
        planets: {
          sun: { sign: 'Taurus', house: 2, degree: 25.5 },
          moon: { sign: 'Cancer', house: 4, degree: 12.3 },
          mercury: { sign: 'Gemini', house: 3, degree: 8.7 },
          venus: { sign: 'Taurus', house: 2, degree: 18.2 },
          mars: { sign: 'Aries', house: 1, degree: 5.9 },
          jupiter: { sign: 'Sagittarius', house: 9, degree: 15.4 },
          saturn: { sign: 'Capricorn', house: 10, degree: 22.1 },
          uranus: { sign: 'Capricorn', house: 10, degree: 3.8 },
          neptune: { sign: 'Aquarius', house: 11, degree: 7.6 },
          pluto: { sign: 'Scorpio', house: 8, degree: 11.2 },
        },
        houses: {
          1: { sign: 'Aries', degree: 0 },
          2: { sign: 'Taurus', degree: 0 },
          3: { sign: 'Gemini', degree: 0 },
          4: { sign: 'Cancer', degree: 0 },
          5: { sign: 'Leo', degree: 0 },
          6: { sign: 'Virgo', degree: 0 },
          7: { sign: 'Libra', degree: 0 },
          8: { sign: 'Scorpio', degree: 0 },
          9: { sign: 'Sagittarius', degree: 0 },
          10: { sign: 'Capricorn', degree: 0 },
          11: { sign: 'Aquarius', degree: 0 },
          12: { sign: 'Pisces', degree: 0 },
        },
        aspects: [
          { planet1: 'sun', planet2: 'moon', aspect: 'trine', orb: 2.3 },
          { planet1: 'venus', planet2: 'mars', aspect: 'sextile', orb: 1.8 },
          { planet1: 'jupiter', planet2: 'saturn', aspect: 'conjunction', orb: 0.5 },
        ],
      },
    },
  });

  console.log('✅ Chart создан для пользователя');

  // Создаем Connection
  const connection = await prisma.connection.create({
    data: {
      userId: user.id,
      targetName: 'Анна Петрова',
      targetData: {
        birthDate: '1988-03-22',
        birthTime: '09:15',
        birthPlace: 'Санкт-Петербург',
        timezone: 'Europe/Moscow',
      },
    },
  });

  console.log('✅ Connection создан:', connection.targetName);

  // Создаем DatingMatch с разной совместимостью
  const match1 = await prisma.datingMatch.create({
    data: {
      userId: user.id,
      candidateData: {
        name: 'Мария Иванова',
        age: 28,
        birthDate: '1995-07-10',
        birthTime: '16:45',
        birthPlace: 'Екатеринбург',
        interests: ['астрология', 'йога', 'путешествия'],
        bio: 'Люблю изучать звезды и медитировать',
      },
      compatibility: 85,
      liked: false,
      rejected: false,
    },
  });

  const match2 = await prisma.datingMatch.create({
    data: {
      userId: user.id,
      candidateData: {
        name: 'Елена Смирнова',
        age: 32,
        birthDate: '1991-11-05',
        birthTime: '22:30',
        birthPlace: 'Новосибирск',
        interests: ['музыка', 'танцы', 'искусство'],
        bio: 'Творческая личность, увлекаюсь астрологией',
      },
      compatibility: 72,
      liked: true,
      rejected: false,
    },
  });

  console.log('✅ DatingMatch созданы:', match1.id, match2.id);

  // Создаем Subscription
  const subscription = await prisma.subscription.create({
    data: {
      userId: user.id,
      tier: 'premium',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
    },
  });

  console.log('✅ Subscription создана:', subscription.tier);

  console.log('🎉 База данных успешно заполнена!');
}

main()
  .catch((e) => {
    console.error('❌ Ошибка при заполнении базы данных:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
