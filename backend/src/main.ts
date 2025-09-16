import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Глобальный префикс для API
  app.setGlobalPrefix('api');
  
  // Валидация
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:8081'],
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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend запущен на порту ${port}`);
  console.log(`📚 Swagger документация: http://localhost:${port}/api/docs`);
}
bootstrap();