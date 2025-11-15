import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { getCorsConfig } from './config/cors.config';
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
  const logger = new Logger('Bootstrap');

  // Validate environment variables on startup
  try {
    validateEnv();
    logger.log('✅ Environment variables validated successfully');
  } catch (error) {
    logger.error((error as Error).message);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, { cors: false });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.use(compression());
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration - environment-aware
  app.enableCors(getCorsConfig());

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

  logger.log('\n' + '='.repeat(60));
  logger.log('🚀 AstraLink Backend successfully started!');
  logger.log('='.repeat(60));
  logger.log(`📱 For Expo use: http://${localIP}:${port}/api`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
  logger.log(`🌐 Local IP: ${localIP}`);
  logger.log(`🔌 Port: ${port}`);
  logger.log('='.repeat(60) + '\n');
}
void bootstrap();
