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
    await this.$connect();
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
}
