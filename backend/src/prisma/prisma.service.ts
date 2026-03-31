import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly connectRetries = 8;
  private readonly connectRetryDelayMs = 3000;

  constructor() {
    super({
      // ✅ Connection pooling configuration
      // Note: Pool size should also be configured in DATABASE_URL
      // Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },

      // ✅ Environment-aware logging
      // Development: log queries, errors, and warnings for debugging
      // Production: only log errors to reduce noise and improve performance
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'error' }],

      // ✅ Error formatting for better debugging
      errorFormat: 'colorless',
    });

    // ✅ Development-only query logging
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Params: ${e.params}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // ✅ Error event logging (all environments)
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Client Error', e);
    });

    // ✅ Warning event logging (all environments)
    this.$on('warn' as never, (e: any) => {
      this.logger.warn('Prisma Client Warning', e);
    });
  }

  async onModuleInit() {
    await this.connectWithRetry();
    this.logger.log('✅ Database connection established');

    // Note: Query performance monitoring via middleware ($use) is not available in this Prisma version.
    // Query logging is still active through event listeners configured in constructor.
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * ✅ Health check method
   * Verifies database connection is alive
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  private async connectWithRetry(): Promise<void> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.connectRetries; attempt += 1) {
      try {
        await this.$connect();
        return;
      } catch (error) {
        lastError = error;

        const message = error instanceof Error ? error.message : String(error);
        const isLastAttempt = attempt === this.connectRetries;

        if (isLastAttempt) {
          this.logger.error(
            `Database connection failed after ${attempt} attempts: ${message}`,
          );
          break;
        }

        this.logger.warn(
          `Database connection attempt ${attempt}/${this.connectRetries} failed: ${message}. Retrying in ${this.connectRetryDelayMs}ms...`,
        );
        await this.sleep(this.connectRetryDelayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
