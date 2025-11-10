import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import { AppModule } from './app.module';
import * as os from 'os';

// Функция для получения локального IP
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue; // ← Проверка на undefined

    for (const address of iface) {
      // Пропускаем внутренние и не IPv4 адреса
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
  return 'localhost';
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(compression());
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // // CORS — dev: отражаем Origin и разрешаем стандартные заголовки/методы
  // app.enableCors({
  //   origin: true, // отразит Origin запроса, добавит Access-Control-Allow-Origin
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  //   allowedHeaders:
  //     'Authorization, Content-Type, X-Requested-With, Accept, Origin',
  //   credentials: false, // мы используем Bearer-токены, cookie не нужны
  //   preflightContinue: false,
  //   optionsSuccessStatus: 204,
  // });

  app.enableCors({
    origin: [
      // web на этом же хосте
      /^(http|https):\/\/localhost(:\d+)?$/,
      // LAN (замени на свой диапазон при необходимости)
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
      // Expo dev URLs (tunnel/LAN)
      /\.exp\.direct$/,
      /\.expo\.dev$/,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Debug'],
  });

  // Swagger документация
  const config = new DocumentBuilder()
    .setTitle('AstraLink API')
    .setDescription('API для астрологического приложения AstraLink')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  const localIP = getLocalIP();

  await app.listen(port, '0.0.0.0');

  console.log('\n' + '='.repeat(60));
  console.log('🚀 AstraLink Backend успешно запущен!');
  console.log('='.repeat(60));
  console.log(`📱 Для Expo используйте: http://${localIP}:${port}/api`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  console.log(`🌐 Локальный IP: ${localIP}`);
  console.log(`🔌 Порт: ${port}`);
  console.log('='.repeat(60) + '\n');
}
void bootstrap();
