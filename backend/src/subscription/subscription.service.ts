// backend/src/subscription/subscription.service.ts
// ✅ MIGRATED TO PRISMA - Full Prisma integration

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import {
  SubscriptionTier,
  SubscriptionStatusResponse,
  FEATURE_MATRIX,
  TRIAL_CONFIG,
  normalizeSubscriptionTier,
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
    private configService: ConfigService,
  ) {}

  private getStripeClient() {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey) {
      throw new BadRequestException('Stripe is not configured');
    }

    return new Stripe(secretKey);
  }

  private getStripePremiumAmount(): number {
    const amount = Number(
      this.configService.get<string>('STRIPE_PREMIUM_AMOUNT') || '999',
    );

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException('Invalid Stripe premium amount');
    }

    return amount;
  }

  private getStripeCurrency(): string {
    const currency = (
      this.configService.get<string>('STRIPE_CURRENCY') || 'usd'
    )
      .trim()
      .toLowerCase();

    if (!/^[a-z]{3}$/.test(currency)) {
      throw new BadRequestException('Invalid Stripe currency');
    }

    return currency;
  }

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
        return {
          ...cached,
          tier: normalizeSubscriptionTier(cached.tier),
          features:
            FEATURE_MATRIX[normalizeSubscriptionTier(cached.tier)]?.features ||
            cached.features,
        };
      }

      // ✅ PRISMA: Получаем подписку через Prisma
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return await this.createFreeSubscription(userId);
      }

      const tier = normalizeSubscriptionTier(subscription.tier);
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
    const normalizedTier = normalizeSubscriptionTier(tier);

    if (normalizedTier === SubscriptionTier.FREE) {
      throw new BadRequestException('Нельзя "улучшить" до Free');
    }

    if (paymentMethod === 'mock') {
      return this.processMockPayment(
        userId,
        normalizedTier,
        transactionId,
        locale,
      );
    }

    throw new BadRequestException(
      `Платежный метод ${paymentMethod} пока не поддерживается`,
    );
  }

  async createStripePaymentSheet(userId: string, tier: SubscriptionTier) {
    const normalizedTier = normalizeSubscriptionTier(tier);

    if (normalizedTier === SubscriptionTier.FREE) {
      throw new BadRequestException('Cannot pay for Free subscription');
    }

    await this.validateUserExists(userId);

    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: this.getStripePremiumAmount(),
      currency: this.getStripeCurrency(),
      payment_method_types: ['card'],
      metadata: {
        userId,
        tier: normalizedTier,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new BadRequestException('Stripe did not return a client secret');
    }

    return {
      paymentIntentClientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  async confirmStripePayment(
    userId: string,
    tier: SubscriptionTier,
    paymentIntentId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const normalizedTier = normalizeSubscriptionTier(tier);

    if (!paymentIntentId?.startsWith('pi_')) {
      throw new BadRequestException('Invalid Stripe payment intent');
    }

    const stripe = this.getStripeClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.metadata?.userId !== userId) {
      throw new BadRequestException('Stripe payment does not belong to user');
    }

    if (
      normalizeSubscriptionTier(paymentIntent.metadata?.tier) !== normalizedTier
    ) {
      throw new BadRequestException('Stripe payment tier mismatch');
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Stripe payment is not completed');
    }

    return this.processPaidPayment(
      userId,
      normalizedTier,
      paymentIntent.id,
      paymentIntent.amount,
      paymentIntent.currency.toUpperCase(),
      locale,
    );
  }

  private async processMockPayment(
    userId: string,
    tier: SubscriptionTier,
    transactionId?: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    return this.processPaidPayment(
      userId,
      tier,
      transactionId,
      1999,
      'RUB',
      locale,
    );
  }

  private async processPaidPayment(
    userId: string,
    tier: SubscriptionTier,
    transactionId: string | undefined,
    amount: number,
    currency: string,
    _locale: 'ru' | 'en' | 'es' = 'ru',
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
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          stripeSessionId: transactionId,
        },
        select: {
          id: true,
        },
      });

      if (!existingPayment) {
        await this.prisma.payment.create({
          data: {
            userId,
            amount,
            currency,
            status: 'completed',
            stripeSessionId: transactionId,
            tier,
          },
        });
      }
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

    // 1) Натальная карта неизменна: не пересчитываем ее при покупке.
    // Только дозаполняем AI narrative для текущего locale/fingerprint, если его нет.
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

    // Secondary horoscope periods are intentionally not AI-prewarmed here.
    // They are slow and costly; the app can show rule-based fallbacks and
    // generate AI for non-daily periods only from explicit period requests.
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
          price: 1999,
          currency: 'RUB',
          period: 'month',
          features: FEATURE_MATRIX[SubscriptionTier.PREMIUM].features,
          limits: FEATURE_MATRIX[SubscriptionTier.PREMIUM].limits,
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
