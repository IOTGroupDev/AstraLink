// import { PrismaClient } from '@prisma/client';
//
// const prisma = new PrismaClient();
//
// async function main() {
//   console.log('🌱 Seeding database...');
//
//   // Создаем тестового пользователя
//   const testUser = await prisma.user.upsert({
//     where: { email: 'test@astralink.com' },
//     update: {},
//     create: {
//       email: 'test@astralink.com',
//       name: 'Тестовый Пользователь',
//       birthDate: new Date('1990-08-15'),
//       birthTime: '14:30',
//       birthPlace: 'Москва, Россия',
//     },
//   });
//
//   console.log('👤 Создан тестовый пользователь:', testUser);
//
//   // Создаем вторую связь для тестирования
//   const secondUser = await prisma.user.upsert({
//     where: { email: 'anna@astralink.com' },
//     update: {},
//     create: {
//       email: 'anna@astralink.com',
//       name: 'Анна',
//       birthDate: new Date('1992-12-22'),
//       birthTime: '09:15',
//       birthPlace: 'Санкт-Петербург, Россия',
//     },
//   });
//
//   console.log('👤 Создан второй тестовый пользователь:', secondUser);
//
//   // Создаем тестовую связь
//   const connection = await prisma.connection.create({
//     data: {
//       userId: testUser.id,
//       targetName: 'Анна',
//       targetData: {
//         birthDate: '1992-12-22',
//         birthTime: '09:15',
//         birthPlace: 'Санкт-Петербург, Россия',
//         zodiacSign: 'Capricorn',
//       },
//     },
//   });
//
//   console.log('🔗 Создана тестовая связь:', connection);
//
//   console.log('✅ Seeding завершен!');
// }
//
// void main()
//   .catch((e) => {
//     console.error('❌ Ошибка при seeding:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
