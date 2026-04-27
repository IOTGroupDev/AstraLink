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

/**
 * Additional production safety checks
 * Prevents common misconfigurations in production environment
 */
function validateProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip checks in non-production
  }

  const logger = new Logger('ProductionCheck');
  const errors: string[] = [];

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret) {
    if (jwtSecret.length < 64) {
      errors.push('JWT_SECRET must be at least 64 characters in production');
    }

    const testPatterns = ['test', 'example', 'secret', 'changeme', 'password'];
    if (
      testPatterns.some((pattern) => jwtSecret.toLowerCase().includes(pattern))
    ) {
      errors.push('JWT_SECRET contains test/example values - SECURITY RISK');
    }
  }

  // Check CORS configuration
  if (!process.env.ALLOWED_ORIGINS) {
    logger.warn(
      '⚠️  ALLOWED_ORIGINS not set - CORS will reject all browser requests',
    );
  }

  // Check Supabase keys
  if (process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('example')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY contains example value');
  }

  if (errors.length > 0) {
    logger.error('🚨 PRODUCTION CONFIGURATION ERRORS:');
    errors.forEach((err) => logger.error(`  ❌ ${err}`));
    throw new Error(
      'Production configuration validation failed. Fix errors above.',
    );
  }

  logger.log('✅ Production secrets validation passed');
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Validate environment variables on startup
  try {
    validateEnv();
    logger.log('✅ Environment variables validated successfully');

    // Additional production checks
    validateProductionSecrets();
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

  // ✅ GZIP compression with optimized settings
  app.use(
    compression({
      // Compression level: 6 is optimal balance between speed and compression ratio
      // 1 = fastest/least compression, 9 = slowest/best compression
      level: 6,
      // Only compress responses larger than 1KB (smaller responses add overhead)
      threshold: 1024,
      // Filter: compress all text-based responses (JSON, HTML, CSS, JS)
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );
  // API Versioning - all endpoints will be prefixed with /api/v1
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS configuration - environment-aware
  app.enableCors(getCorsConfig());

  const nodeEnv = process.env.NODE_ENV || 'production';
  const swaggerEnabled =
    (nodeEnv === 'development' || nodeEnv === 'dev') &&
    process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('AstraLink API')
      .setDescription('API для астрологического приложения AstraLink')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  const localIP = getLocalIP();

  await app.listen(port, '0.0.0.0');

  logger.log('\n' + '='.repeat(60));
  logger.log('🚀 AstraLink Backend successfully started!');
  logger.log('='.repeat(60));
  logger.log(`📱 For Expo use: http://${localIP}:${port}/api`);
  logger.log(
    swaggerEnabled
      ? `📚 Swagger: http://localhost:${port}/api/docs`
      : '📚 Swagger: disabled',
  );
  logger.log(`🌐 Local IP: ${localIP}`);
  logger.log(`🔌 Port: ${port}`);
  logger.log('='.repeat(60) + '\n');
}
void bootstrap();
