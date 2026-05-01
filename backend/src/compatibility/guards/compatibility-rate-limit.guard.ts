import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RateLimiterService } from '@/common/services/rate-limiter.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { SubscriptionTier } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';

export const COMPATIBILITY_WEEK_SECONDS = 7 * 24 * 60 * 60;
export const COMPATIBILITY_WEEKLY_LIMITS: Record<
  SubscriptionTier.PREMIUM | SubscriptionTier.MAX,
  number
> = {
  [SubscriptionTier.PREMIUM]: 3,
  [SubscriptionTier.MAX]: 10,
};

@Injectable()
export class CompatibilityRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId =
      request.user?.userId || request.user?.id || request.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    const subscription = await this.subscriptionService.getStatus(userId);
    if (
      !subscription.isActive ||
      (subscription.tier !== SubscriptionTier.PREMIUM &&
        subscription.tier !== SubscriptionTier.MAX)
    ) {
      throw new ForbiddenException(
        'Проверка совместимости доступна только для Premium и MAX',
      );
    }

    const shouldUseAi =
      typeof request.body === 'object' &&
      request.body !== null &&
      (request.body as { useAi?: unknown }).useAi === true;

    if (!shouldUseAi) {
      return true;
    }

    const limit = COMPATIBILITY_WEEKLY_LIMITS[subscription.tier];
    const response = context.switchToHttp().getResponse();
    const rateLimitConfig = {
      points: limit,
      duration: COMPATIBILITY_WEEK_SECONDS,
    };
    const currentStatus = await this.rateLimiter.getStatus(
      `compatibility:${userId}`,
      rateLimitConfig,
    );

    if (!currentStatus.allowed) {
      (request.body as { useAi?: boolean }).useAi = false;
      response.setHeader(
        'X-RateLimit-Limit',
        currentStatus.totalLimit.toString(),
      );
      response.setHeader(
        'X-RateLimit-Remaining',
        currentStatus.remaining.toString(),
      );
      response.setHeader(
        'X-RateLimit-Reset',
        Math.floor(currentStatus.resetTime / 1000).toString(),
      );
      response.setHeader('X-Compatibility-AI-Skipped', 'weekly-limit');

      return true;
    }

    const result = await this.rateLimiter.consume(
      `compatibility:${userId}`,
      rateLimitConfig,
    );

    response.setHeader('X-RateLimit-Limit', result.totalLimit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader(
      'X-RateLimit-Reset',
      Math.floor(result.resetTime / 1000).toString(),
    );

    return true;
  }
}
