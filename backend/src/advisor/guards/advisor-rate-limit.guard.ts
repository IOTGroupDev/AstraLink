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
    // TODO: Implement rate limiting once Redis methods (incr, expire) are added to RedisService
    // TODO: Implement getSubscription method in SubscriptionService

    // For now, this guard is disabled - rate limiting not active
    // The guard is commented out in advisor.controller.ts

    throw new ForbiddenException(
      'Advisor rate limiting is not implemented yet. This guard should not be used.',
    );

    /* Original implementation - commented out due to missing methods:
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId || request.user?.id || request.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    const subscription = await this.subscriptionService.getSubscription(userId);

    if (!subscription || !subscription.isActive) {
      throw new ForbiddenException('Требуется активная подписка');
    }

    const limits = getLimits(subscription.tier);
    const advisorLimit = limits.advisorQueries as number;

    if (advisorLimit === 0 || subscription.tier === SubscriptionTier.FREE) {
      throw new ForbiddenException(
        'Советник доступен только для подписчиков Premium и MAX',
      );
    }

    const key = `advisor:rate_limit:${userId}`;
    const today = new Date().toISOString().split('T')[0];
    const dayKey = `${key}:${today}`;

    const currentUsage = await this.redisService.get(dayKey);
    const usageCount = currentUsage ? parseInt(currentUsage, 10) : 0;

    if (usageCount >= advisorLimit) {
      const tierName = subscription.tier === SubscriptionTier.PREMIUM ? 'Premium' : 'MAX';
      throw new ForbiddenException(
        `Достигнут лимит запросов к советнику (${advisorLimit} в сутки для ${tierName}). Попробуйте завтра.`,
      );
    }

    await this.redisService.incr(dayKey);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

    await this.redisService.expire(dayKey, ttl);

    request['advisorUsage'] = {
      current: usageCount + 1,
      limit: advisorLimit,
      tier: subscription.tier,
      remaining: advisorLimit - usageCount - 1,
    };

    return true;
    */
  }
}
