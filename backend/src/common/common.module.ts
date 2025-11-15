import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { RedisModule } from '@/redis/redis.module';

/**
 * Global common module
 * Provides shared services like rate limiting
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [RateLimiterService],
  exports: [RateLimiterService],
})
export class CommonModule {}
