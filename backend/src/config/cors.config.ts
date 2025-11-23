import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Get CORS configuration based on environment
 * In production: only explicitly allowed origins
 * In development: more permissive for local development
 */
export const getCorsConfig = (): CorsOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Production: strict CORS policy
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .filter(Boolean);

    if (allowedOrigins.length === 0) {
      console.warn(
        '⚠️  WARNING: No ALLOWED_ORIGINS configured for production. CORS will reject all browser requests.',
      );
    }

    return {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Client-Type',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-RateLimit-Remaining',
        'X-RateLimit-Limit',
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204,
    };
  } else {
    // Development: more permissive for easier development
    return {
      origin: [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /\.exp\.direct$/,
        /\.expo\.dev$/,
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Client-Type',
      ],
      exposedHeaders: [
        'X-Total-Count',
        'X-RateLimit-Remaining',
        'X-RateLimit-Limit',
      ],
      maxAge: 3600, // 1 hour in dev
    };
  }
};
