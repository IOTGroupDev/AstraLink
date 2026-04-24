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
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { RedisService } from '../redis/redis.service';
import { NatalChartService } from '../chart/services';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly statusCacheTtlSec = 60;

  private getStatusCacheKey(userId: string): string {
    return `subscription:status:${userId}`;
  }

  private getRecordCacheKey(userId: string): string {
    return `subscription:record:${userId}`;
  }

  private getLegacyCacheKey(userId: string): string {
    return `subscription:${userId}`;
  }

  constructor(
    private prisma: PrismaService,
    private natalChartService: NatalChartService,
    private horoscopeService: HoroscopeGeneratorService,
    private redis: RedisService,
  ) {}

  /**
   * Validate that a user exists in the database
   */
  private async validateUserExists(userId: string): Promise<void> {
    const user = await this.prisma.public_users.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException(
        `User with ID ${userId} does not exist. Cannot create subscription.`,
      );
    }
  }

  /**
   * Получить статус подписки пользователя
   */
  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      const cacheKey = this.getStatusCacheKey(userId);
      const cached = await this.redis.get<SubscriptionStatusResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      // ✅ PRISMA: Получаем подписку через Prisma
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return await this.createFreeSubscription(userId);
      }

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

      const response = {
        tier,
        expiresAt: expiresAt?.toISOString(),
        isActive,
        isTrial,
        trialEndsAt: trialEndsAt?.toISOString(),
        features,
        daysRemaining,
      };

      await this.redis.set(cacheKey, response, this.statusCacheTtlSec);
      return response;
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
    // Validate user exists before creating subscription
    await this.validateUserExists(userId);

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

    const response = {
      tier: SubscriptionTier.FREE,
      isActive: true,
      isTrial: false,
      features: FEATURE_MATRIX[SubscriptionTier.FREE].features,
      trialEndsAt: TRIAL_CONFIG.enabled ? trialEndsAt.toISOString() : undefined,
    };

    await this.redis.set(
      this.getStatusCacheKey(userId),
      response,
      this.statusCacheTtlSec,
    );

    return response;
  }

  /**
   * Активировать Trial
   */
  async activateTrial(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<{ success: boolean; message: string; expiresAt: string }> {
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
    const cacheKey = this.getStatusCacheKey(userId);
    await Promise.all([
      this.redis.del(cacheKey),
      this.redis.del(this.getRecordCacheKey(userId)),
      this.redis.del(this.getLegacyCacheKey(userId)),
    ]);
    await this.redis.set(
      cacheKey,
      {
        tier: TRIAL_CONFIG.tier,
        expiresAt: undefined,
        isActive: true,
        isTrial: true,
        trialEndsAt: trialEndsAt.toISOString(),
        features: FEATURE_MATRIX[TRIAL_CONFIG.tier].features,
        daysRemaining: TRIAL_CONFIG.duration,
      },
      this.statusCacheTtlSec,
    );

    await this.refreshPremiumAssetsForUser(userId, locale);

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
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    if (tier === SubscriptionTier.FREE) {
      throw new BadRequestException('Нельзя "улучшить" до Free');
    }

    if (paymentMethod === 'mock') {
      return this.processMockPayment(userId, tier, transactionId, locale);
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
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    // Validate user exists before creating subscription
    await this.validateUserExists(userId);

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
    const cacheKey = this.getStatusCacheKey(userId);
    await Promise.all([
      this.redis.del(cacheKey),
      this.redis.del(this.getRecordCacheKey(userId)),
      this.redis.del(this.getLegacyCacheKey(userId)),
    ]);

    // ✅ Очистка кэша гороскопов сразу после апгрейда
    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
    } catch (e) {
      this.logger.warn(
        `Failed to clear horoscope cache after upgrade for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

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

    const statusResponse: SubscriptionStatusResponse = {
      tier,
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      isTrial: false,
      trialEndsAt: undefined,
      features: FEATURE_MATRIX[tier].features,
      daysRemaining: Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        ),
      ),
    };

    await this.redis.set(cacheKey, statusResponse, this.statusCacheTtlSec);

    await this.refreshPremiumAssetsForUser(userId, locale);

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
   * Пост-апгрейд: сразу запросить AI-данные (интерпретация + гороскопы)
   */
  async refreshPremiumAssetsForUser(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    // Очистим кэш гороскопов, чтобы не вернуть старые FREE ответы
    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
    } catch (e) {
      this.logger.warn(
        `Failed to clear horoscope cache for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    // 1) Полный premium refresh натальной карты:
    // пересчет карты + структурная интерпретация + расширенный AI narrative
    try {
      await this.natalChartService.refreshPremiumChartAssets(userId, locale);
    } catch (e) {
      this.logger.warn(
        `Premium natal chart refresh failed for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    // 2) Синхронно собираем дневной PREMIUM-гороскоп:
    // он должен быть готов уже к моменту успешного ответа на апгрейд.
    try {
      await this.horoscopeService.generateHoroscope(
        userId,
        'day',
        true,
        locale,
      );
    } catch (e) {
      this.logger.warn(
        `Daily horoscope prewarm failed for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    // 3) Остальные периоды догреваем в фоне и последовательно,
    // чтобы не устраивать 3-4 одновременных тяжелых AI-запроса.
    void this.prewarmSecondaryHoroscopes(userId, locale).catch((e) => {
      this.logger.warn(
        `Secondary horoscope prewarm failed for ${userId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    });
  }

  private async prewarmSecondaryHoroscopes(
    userId: string,
    locale: 'ru' | 'en' | 'es',
  ): Promise<void> {
    for (const period of ['tomorrow', 'week', 'month'] as const) {
      try {
        await this.horoscopeService.generateHoroscope(
          userId,
          period,
          true,
          locale,
        );
      } catch (e) {
        this.logger.warn(
          `Horoscope prewarm failed for ${userId} period=${period}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }
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
    await Promise.all([
      this.redis.del(this.getStatusCacheKey(userId)),
      this.redis.del(this.getRecordCacheKey(userId)),
      this.redis.del(this.getLegacyCacheKey(userId)),
    ]);

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
    await Promise.all([
      this.redis.del(this.getStatusCacheKey(userId)),
      this.redis.del(this.getRecordCacheKey(userId)),
      this.redis.del(this.getLegacyCacheKey(userId)),
    ]);
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
