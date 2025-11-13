import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { SubscriptionTier, getLimits } from '@/types/subscription';
import type { AuthenticatedRequest } from '@/types/auth';

@Injectable()
export class AdvisorRateLimitGuard implements CanActivate {
  constructor(
    private readonly redisService: RedisService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId || request.user?.id || request.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    // Get user's subscription
    const subscription = await this.subscriptionService.getSubscription(userId);

    if (!subscription || !subscription.isActive) {
      throw new ForbiddenException('Требуется активная подписка');
    }

    // Get limits for user's tier
    const limits = getLimits(subscription.tier);
    const advisorLimit = limits.advisorQueries as number;

    // FREE tier has no access
    if (advisorLimit === 0 || subscription.tier === SubscriptionTier.FREE) {
      throw new ForbiddenException(
        'Советник доступен только для подписчиков Premium и MAX',
      );
    }

    // Check rate limit in Redis
    const key = `advisor:rate_limit:${userId}`;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dayKey = `${key}:${today}`;

    // Get current usage count
    const currentUsage = await this.redisService.get(dayKey);
    const usageCount = currentUsage ? parseInt(currentUsage, 10) : 0;

    // Check if limit exceeded
    if (usageCount >= advisorLimit) {
      const tierName = subscription.tier === SubscriptionTier.PREMIUM ? 'Premium' : 'MAX';
      throw new ForbiddenException(
        `Достигнут лимит запросов к советнику (${advisorLimit} в сутки для ${tierName}). Попробуйте завтра.`,
      );
    }

    // Increment counter
    await this.redisService.incr(dayKey);

    // Set expiration to end of day (24 hours from start of day)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

    await this.redisService.expire(dayKey, ttl);

    // Add usage info to request for logging
    request['advisorUsage'] = {
      current: usageCount + 1,
      limit: advisorLimit,
      tier: subscription.tier,
      remaining: advisorLimit - usageCount - 1,
    };

    return true;
  }
}
