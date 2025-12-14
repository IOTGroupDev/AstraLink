// backend/src/subscription/subscription.service.ts
// ✅ MIGRATED TO PRISMA - Full Prisma integration

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionTier,
  SubscriptionStatusResponse,
  FEATURE_MATRIX,
  TRIAL_CONFIG,
} from '../types';
import { AIService } from '../services/ai.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    private horoscopeService: HoroscopeGeneratorService,
    private redis: RedisService,
  ) {}

  /**
   * Получить статус подписки пользователя
   */
  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      this.logger.log(`Getting subscription status for user: ${userId}`);

      // ✅ PRISMA: Получаем подписку через Prisma
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        this.logger.log(`No subscription found, creating free subscription`);
        return await this.createFreeSubscription(userId);
      }

      this.logger.log(`Subscription found: ${JSON.stringify(subscription)}`);

      const tier = subscription.tier as SubscriptionTier;
      const expiresAt = subscription.expiresAt;
      const trialEndsAt = subscription.trialEndsAt;
      const now = new Date();

      const isTrial = trialEndsAt ? trialEndsAt > now : false;

      let isActive = false;
      if (tier === SubscriptionTier.FREE) {
        isActive = true;
      } else if (isTrial) {
        isActive = true;
      } else if (expiresAt && expiresAt > now) {
        isActive = true;
      }

      if (!isActive && tier !== SubscriptionTier.FREE) {
        this.logger.log(`Subscription expired, downgrading to free`);
        await this.downgradeToFree(userId);
        return this.getStatus(userId);
      }

      const features = FEATURE_MATRIX[tier]?.features || [];

      let daysRemaining: number | undefined;
      if (isTrial && trialEndsAt) {
        daysRemaining = Math.max(
          0,
          Math.ceil(
            (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      } else if (isActive && expiresAt) {
        daysRemaining = Math.max(
          0,
          Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
      }

      return {
        tier,
        expiresAt: expiresAt?.toISOString(),
        isActive,
        isTrial,
        trialEndsAt: trialEndsAt?.toISOString(),
        features,
        daysRemaining,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error in getStatus: ${errorMessage}`);
      throw new BadRequestException(
        `Ошибка получения статуса подписки: ${errorMessage}`,
      );
    }
  }

  /**
   * Создать бесплатную подписку
   */
  private async createFreeSubscription(
    userId: string,
  ): Promise<SubscriptionStatusResponse> {
    this.logger.log(`Creating free subscription for user: ${userId}`);

    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.duration);

    // ✅ PRISMA: Используем upsert для создания или обновления
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier: SubscriptionTier.FREE,
        trialEndsAt: TRIAL_CONFIG.enabled ? trialEndsAt : null,
      },
      update: {
        tier: SubscriptionTier.FREE,
        trialEndsAt: TRIAL_CONFIG.enabled ? trialEndsAt : null,
        updatedAt: now,
      },
    });

    this.logger.log(`✅ Subscription created successfully`);

    return {
      tier: SubscriptionTier.FREE,
      isActive: true,
      isTrial: false,
      features: FEATURE_MATRIX[SubscriptionTier.FREE].features,
      trialEndsAt: TRIAL_CONFIG.enabled ? trialEndsAt.toISOString() : undefined,
    };
  }

  /**
   * Активировать Trial
   */
  async activateTrial(userId: string): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    // ✅ PRISMA: Получаем подписку
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new BadRequestException('Подписка не найдена');
    }

    if (subscription.trialEndsAt) {
      const trialEndsAt = subscription.trialEndsAt;
      const now = new Date();

      if (trialEndsAt < now) {
        throw new BadRequestException('Trial период уже был использован');
      } else {
        throw new BadRequestException('Trial период уже активен');
      }
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.duration);

    // ✅ PRISMA: Обновляем подписку
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        tier: TRIAL_CONFIG.tier,
        trialEndsAt,
      },
    });

    // ✅ Очистка кэша подписки в Redis
    const cacheKey = `subscription:${userId}`;
    await this.redis.del(cacheKey);

    this.logger.log(`Trial activated for user ${userId}`);

    return {
      success: true,
      message: `Trial активирован на ${TRIAL_CONFIG.duration} дней`,
      expiresAt: trialEndsAt.toISOString(),
    };
  }

  /**
   * Обновить подписку
   */
  async upgrade(
    userId: string,
    tier: SubscriptionTier,
    paymentMethod: 'apple' | 'google' | 'mock' = 'mock',
    transactionId?: string,
  ) {
    if (tier === SubscriptionTier.FREE) {
      throw new BadRequestException('Нельзя "улучшить" до Free');
    }

    if (paymentMethod === 'mock') {
      return this.processMockPayment(userId, tier, transactionId);
    }

    throw new BadRequestException(
      `Платежный метод ${paymentMethod} пока не поддерживается`,
    );
  }

  /**
   * Mock платеж
   */
  private async processMockPayment(
    userId: string,
    tier: SubscriptionTier,
    transactionId?: string,
  ) {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    // ✅ PRISMA: Обновляем или создаем подписку атомарно
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tier,
        expiresAt,
        isCancelled: false,
      },
      update: {
        tier,
        expiresAt,
        isCancelled: false,
      },
    });

    // ✅ Очистка кэша подписки в Redis
    const cacheKey = `subscription:${userId}`;
    await this.redis.del(cacheKey);
    this.logger.debug(`Cleared subscription cache for user ${userId}`);

    if (transactionId) {
      // ✅ PRISMA: Создаем запись о платеже
      await this.prisma.payment.create({
        data: {
          userId,
          amount: tier === SubscriptionTier.PREMIUM ? 1499 : 1999,
          currency: 'RUB',
          status: 'completed',
          stripeSessionId: transactionId,
          tier,
        },
      });
    }

    this.logger.log(`User ${userId} upgraded to ${tier}`);

    // PREMIUM: пересчитать/перезаписать интерпретацию натальной карты через AI и прогреть гороскопы
    try {
      // 1) Находим последнюю карту пользователя (через Prisma)
      const chartRec = await this.prisma.chart.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      // 2) Если есть AI — генерируем premium-интерпретацию и сохраняем в карту
      if (chartRec && this.aiService.isAvailable()) {
        const chartData = (chartRec.data as any) || {};
        try {
          const aiText = await this.aiService.generateChartInterpretation({
            planets: chartData?.planets,
            houses: chartData?.houses,
            aspects: chartData?.aspects || [],
            userProfile: undefined,
          });

          const updatedData = {
            ...chartData,
            interpretation: aiText,
            interpretationVersion: 'ai-v1',
            generatedBy: 'ai',
          };

          // ✅ PRISMA: Обновляем карту
          await this.prisma.chart.update({
            where: { id: chartRec.id },
            data: { data: updatedData },
          });
        } catch (e) {
          this.logger.warn(
            `AI interpretation generation failed for ${userId}: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }

      // 3) Прогреваем PREMIUM-гороскоп (day/tomorrow/week/month) в Redis-кэше
      try {
        await Promise.all(
          (['day', 'tomorrow', 'week', 'month'] as const).map((p) =>
            this.horoscopeService.generateHoroscope(userId, p, true),
          ),
        );
      } catch (e) {
        this.logger.warn(
          `Horoscope prewarm failed for ${userId}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    } catch (e) {
      this.logger.warn(
        `Premium post-upgrade assets step failed for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    return {
      success: true,
      message: `Подписка ${tier} активирована`,
      subscription: {
        tier,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /**
   * Отменить подписку
   */
  async cancel(userId: string) {
    // ✅ PRISMA: Обновляем статус подписки
    await this.prisma.subscription.update({
      where: { userId },
      data: { isCancelled: true },
    });

    // ✅ Очистка кэша подписки в Redis
    const cacheKey = `subscription:${userId}`;
    await this.redis.del(cacheKey);

    this.logger.log(`Subscription cancelled for user ${userId}`);

    return {
      success: true,
      message: 'Подписка отменена. Доступ сохранится до конца периода.',
    };
  }

  /**
   * Даунгрейд до Free
   */
  private async downgradeToFree(userId: string) {
    // ✅ PRISMA: Даунгрейд до FREE
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        tier: SubscriptionTier.FREE,
        expiresAt: null,
        isCancelled: false,
      },
    });

    // ✅ Очистка кэша подписки в Redis
    const cacheKey = `subscription:${userId}`;
    await this.redis.del(cacheKey);

    this.logger.log(`User ${userId} downgraded to FREE`);
  }

  /**
   * Получить доступные планы
   */
  async getPlans() {
    return {
      plans: [
        {
          tier: SubscriptionTier.FREE,
          name: 'Free',
          price: 0,
          currency: 'RUB',
          features: FEATURE_MATRIX[SubscriptionTier.FREE].features,
          limits: FEATURE_MATRIX[SubscriptionTier.FREE].limits,
        },
        {
          tier: SubscriptionTier.PREMIUM,
          name: 'Premium',
          price: 1499,
          currency: 'RUB',
          period: 'month',
          features: FEATURE_MATRIX[SubscriptionTier.PREMIUM].features,
          limits: FEATURE_MATRIX[SubscriptionTier.PREMIUM].limits,
        },
        {
          tier: SubscriptionTier.MAX,
          name: 'MAX',
          price: 1999,
          currency: 'RUB',
          period: 'month',
          features: FEATURE_MATRIX[SubscriptionTier.MAX].features,
          limits: FEATURE_MATRIX[SubscriptionTier.MAX].limits,
        },
      ],
      trial: {
        enabled: TRIAL_CONFIG.enabled,
        duration: TRIAL_CONFIG.duration,
        tier: TRIAL_CONFIG.tier,
      },
    };
  }

  /**
   * Проверить лимиты использования
   */
  async checkUsageLimits(_userId: string) {
    return {
      consultationsUsed: 0,
      consultationsLimit: 2,
    };
  }

  /**
   * Получить историю платежей пользователя
   */
  async getPaymentHistory(userId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((payment: any) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      currency: payment.currency,
      status: payment.status,
      provider: null, // not in current schema
      createdAt: payment.createdAt.toISOString(),
    }));
  }
}
