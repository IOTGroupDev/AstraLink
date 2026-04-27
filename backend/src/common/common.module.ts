import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { RedisModule } from '@/redis/redis.module';
import { SensitiveProfileEncryptionService } from './services/sensitive-profile-encryption.service';

/**
 * Global common module
 * Provides shared services like rate limiting
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [RateLimiterService, SensitiveProfileEncryptionService],
  exports: [RateLimiterService, SensitiveProfileEncryptionService],
})
export class CommonModule {}
