import { Global, Module } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';
import { RedisModule } from '@/redis/redis.module';
import { SensitiveProfileEncryptionService } from './services/sensitive-profile-encryption.service';
import { AdminGuard } from './guards/admin.guard';
import { AIRateLimitGuard } from './guards/ai-rate-limit.guard';

/**
 * Global common module
 * Provides shared services like rate limiting
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [
    RateLimiterService,
    SensitiveProfileEncryptionService,
    AdminGuard,
    AIRateLimitGuard,
  ],
  exports: [
    RateLimiterService,
    SensitiveProfileEncryptionService,
    AdminGuard,
    AIRateLimitGuard,
  ],
})
export class CommonModule {}
