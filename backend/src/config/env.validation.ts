import { z } from 'zod';

/**
 * Environment variables schema validation
 * Ensures all required configuration is present and valid on application startup
 */
export const envSchema = z.object({
  // Database
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DIRECT_URL: z
    .string()
    .url('DIRECT_URL must be a valid PostgreSQL connection string')
    .optional(),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  // Security
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long for security'),

  // AI Providers (at least one is required)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Server
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a number')
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('3000'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Redis (optional)
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL').optional(),

  // Monitoring (optional)
  SENTRY_DSN: z.string().url('SENTRY_DSN must be a valid URL').optional(),

  // Rate Limiting
  MAX_AI_REQUESTS_PER_HOUR: z
    .string()
    .regex(/^\d+$/, 'MAX_AI_REQUESTS_PER_HOUR must be a number')
    .transform(Number)
    .pipe(z.number().int().positive())
    .default('1000'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables on application startup
 * @throws {Error} if validation fails with detailed error messages
 */
export function validateEnv(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);

    // Custom validation: at least one AI provider must be configured
    if (!parsed.ANTHROPIC_API_KEY && !parsed.OPENAI_API_KEY) {
      throw new Error(
        'At least one AI provider key is required: ANTHROPIC_API_KEY or OPENAI_API_KEY',
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `❌ Environment validation failed:\n${errorMessages}\n\n` +
          `Please check your .env file and ensure all required variables are set.\n` +
          `See .env.example for reference.`,
      );
    }
    throw error;
  }
}
