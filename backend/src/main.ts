import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс для API
  app.setGlobalPrefix('api');

  // Валидация
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:8081',
      'http://192.168.1.14:3000', // Новый IP адрес
      'http://192.168.1.14:8081', // Новый IP адрес для Expo
      'http://192.168.1.69:3000',
      'http://192.168.1.69:8081',
      'exp://192.168.1.14:8081', // Для Expo Go с новым IP
      'exp://192.168.1.69:8081', // Для Expo Go
      'exp://qjjc4tg-anonymous-8081.exp.direct', // Для Expo туннеля
      'exp://localhost:8081', // Для Expo localhost
      '*', // Временно разрешаем все origins для отладки
    ],
    credentials: true,
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
  await app.listen(port, '0.0.0.0'); // Слушаем на всех интерфейсах
  console.log(`🚀 Backend запущен на порту ${port}`);
  console.log(`📚 Swagger документация: http://localhost:${port}/api/docs`);
  console.log(`🌐 Доступен по IP: http://192.168.1.14:${port}/api`);
}
void bootstrap();
