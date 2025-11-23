import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../../subscription/subscription.service';
import { AnalyticsService } from '../../analytics/analytics.service';
import { SUBSCRIPTION_KEY } from '../decorators/requires-subscription.decorator';
import { SubscriptionTier } from '../../types';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
    private analyticsService: AnalyticsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Получаем требуемые уровни подписки из декоратора
    const requiredTiers = this.reflector.get<SubscriptionTier[]>(
      SUBSCRIPTION_KEY,
      context.getHandler(),
    );

    // Если декоратор не установлен - доступ разрешен
    if (!requiredTiers || requiredTiers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId || request.user?.id;

    if (!userId) {
      this.logger.warn('Subscription check failed: no userId in request');
      throw new ForbiddenException({
        message: 'Требуется авторизация',
        code: 'AUTH_REQUIRED',
      });
    }

    try {
      // Получаем статус подписки пользователя
      const subscription = await this.subscriptionService.getStatus(userId);

      this.logger.debug(
        `Checking subscription for user ${userId}: ${subscription.tier}, active: ${subscription.isActive}`,
      );

      // Проверка 1: Активность подписки (включая trial)
      if (!subscription.isActive && !subscription.isTrial) {
        // Записываем попытку доступа без подписки (для аналитики)
        await this.analyticsService.recordBlockedFeatureAttempt(
          userId,
          context.getHandler().name,
          subscription.tier,
        );

        throw new ForbiddenException({
          message: 'Требуется активная подписка',
          code: 'SUBSCRIPTION_REQUIRED',
          requiredTiers,
          currentTier: subscription.tier,
          upgradeUrl: '/api/subscription/plans',
          isTrialAvailable: !subscription.trialEndsAt, // Trial еще не использовался
        });
      }

      // Проверка 2: Уровень подписки
      if (!requiredTiers.includes(subscription.tier)) {
        // Записываем попытку доступа с недостаточным уровнем
        await this.analyticsService.recordBlockedFeatureAttempt(
          userId,
          context.getHandler().name,
          subscription.tier,
        );

        throw new ForbiddenException({
          message: `Требуется подписка: ${this.formatTiers(requiredTiers)}`,
          code: 'INSUFFICIENT_TIER',
          requiredTiers,
          currentTier: subscription.tier,
          upgradeUrl: '/api/subscription/plans',
        });
      }

      // Проверка 3: Лимиты использования (опционально)
      // Например, для MAX: проверяем, не превышен ли лимит консультаций
      if (subscription.tier === SubscriptionTier.MAX) {
        const limits = await this.subscriptionService.checkUsageLimits(userId);
        if (limits.consultationsUsed >= 2) {
          throw new ForbiddenException({
            message: 'Превышен лимит консультаций (2/год)',
            code: 'LIMIT_EXCEEDED',
            currentUsage: limits.consultationsUsed,
            maxUsage: 2,
          });
        }
      }

      // Записываем успешное использование функции
      await this.analyticsService.recordFeatureUsage(
        userId,
        context.getHandler().name,
        subscription.tier,
      );

      // Добавляем subscription в request для контроллеров
      request.subscription = subscription;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Subscription check error: ${errorMessage}`, error);
      throw new ForbiddenException({
        message: 'Ошибка проверки подписки',
        code: 'SUBSCRIPTION_CHECK_ERROR',
      });
    }
  }

  private formatTiers(tiers: SubscriptionTier[]): string {
    const tierNames = {
      [SubscriptionTier.FREE]: 'Free',
      [SubscriptionTier.PREMIUM]: 'Premium',
      [SubscriptionTier.MAX]: 'MAX',
    };
    return tiers.map((t) => tierNames[t]).join(' или ');
  }
}
