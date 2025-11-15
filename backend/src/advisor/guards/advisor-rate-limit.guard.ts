import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { RateLimiterService } from '@/common/services/rate-limiter.service';
import { SubscriptionService } from '@/subscription/subscription.service';
import { SubscriptionTier, getLimits } from '@/types/subscription';
import type { AuthenticatedRequest } from '@/types/auth';

@Injectable()
export class AdvisorRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(AdvisorRateLimitGuard.name);

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.userId || request.user?.id || request.user?.sub;

    if (!userId) {
      throw new BadRequestException('User ID not found');
    }

    // Get user subscription
    const subscription = await this.subscriptionService.getStatus(userId);

    if (!subscription || !subscription.isActive) {
      throw new ForbiddenException('Требуется активная подписка');
    }

    const limits = getLimits(subscription.tier);
    const advisorLimit = limits.advisorQueries as number;

    if (advisorLimit === 0 || subscription.tier === SubscriptionTier.FREE) {
      throw new ForbiddenException(
        'Советник доступен только для подписчиков Premium и Ultra',
      );
    }

    // Create rate limit key: advisor:<userId>:<date>
    const today = new Date().toISOString().split('T')[0];
    const key = `advisor:${userId}:${today}`;

    // Calculate TTL until end of day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);

    // Check rate limit
    const result = await this.rateLimiter.consume(key, {
      points: advisorLimit,
      duration: ttl,
    });

    if (!result.allowed) {
      const tierName = subscription.tier === SubscriptionTier.PREMIUM ? 'Premium' : 'Ultra';
      throw new ForbiddenException(
        `Достигнут лимит запросов к советнику (${advisorLimit} в сутки для ${tierName}). ` +
        `Попробуйте завтра или обновите подписку.`,
      );
    }

    // Add usage info to request for logging/analytics
    request['advisorUsage'] = {
      current: advisorLimit - result.remaining,
      limit: advisorLimit,
      tier: subscription.tier,
      remaining: result.remaining,
      resetTime: result.resetTime,
    };

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', result.totalLimit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.floor(result.resetTime / 1000).toString());

    this.logger.debug(`Advisor request allowed for user ${userId}`, {
      remaining: result.remaining,
      limit: result.totalLimit,
    });

    return true;
  }
}
