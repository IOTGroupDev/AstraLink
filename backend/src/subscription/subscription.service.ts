// backend/src/subscription/subscription.service.ts
// ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ - скопируйте целиком

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SubscriptionTier,
  SubscriptionStatusResponse,
  FEATURE_MATRIX,
  TRIAL_CONFIG,
} from '../types';
import { AIService } from '../services/ai.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private supabaseService: SupabaseService,
    private aiService: AIService,
    private horoscopeService: HoroscopeGeneratorService,
  ) {}

  /**
   * Получить статус подписки пользователя
   */
  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      this.logger.log(`Getting subscription status for user: ${userId}`);

      // ✅ КРИТИЧНО: Используем fromAdmin!
      const { data: subscription, error } = await this.supabaseService
        .fromAdmin('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`Error getting subscription: ${error.message}`);
        throw new BadRequestException('Ошибка получения статуса подписки');
      }

      if (!subscription) {
        this.logger.log(`No subscription found, creating free subscription`);
        return await this.createFreeSubscription(userId);
      }

      this.logger.log(`Subscription found: ${JSON.stringify(subscription)}`);

      const tier = subscription.tier as SubscriptionTier;
      const expiresAt = subscription.expires_at
        ? new Date(subscription.expires_at)
        : null;
      const trialEndsAt = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at)
        : null;
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

    // ✅ КРИТИЧНО: Используем fromAdmin!
    const { error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .upsert(
        {
          user_id: userId,
          tier: SubscriptionTier.FREE,
          trial_ends_at: TRIAL_CONFIG.enabled
            ? trialEndsAt.toISOString()
            : null,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
        {
          onConflict: 'user_id',
        },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating subscription: ${error.message}`);
      throw new BadRequestException(
        `Ошибка создания подписки: ${error.message}`,
      );
    }

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
    // ✅ КРИТИЧНО: Используем fromAdmin!
    const { data: subscription, error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      throw new BadRequestException('Подписка не найдена');
    }

    if (subscription.trial_ends_at) {
      const trialEndsAt = new Date(subscription.trial_ends_at);
      const now = new Date();

      if (trialEndsAt < now) {
        throw new BadRequestException('Trial период уже был использован');
      } else {
        throw new BadRequestException('Trial период уже активен');
      }
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.duration);

    // ✅ КРИТИЧНО: Используем fromAdmin!
    const { error: updateError } = await this.supabaseService
      .fromAdmin('subscriptions')
      .update({
        tier: TRIAL_CONFIG.tier,
        trial_ends_at: trialEndsAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new BadRequestException('Ошибка активации trial');
    }

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

    // ✅ Обновляем или создаем подписку атомарно (upsert по user_id)
    const { data: subData, error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .upsert(
        {
          user_id: userId,
          tier,
          expires_at: expiresAt.toISOString(),
          is_cancelled: false,
          updated_at: now.toISOString(),
          created_at: now.toISOString(),
        },
        { onConflict: 'user_id' },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Error upgrading subscription: ${error.message}`);
      throw new BadRequestException('Ошибка обновления подписки');
    }

    if (transactionId) {
      // ✅ КРИТИЧНО: Используем fromAdmin!
      await this.supabaseService.fromAdmin('payments').insert({
        user_id: userId,
        amount: tier === SubscriptionTier.PREMIUM ? 1499 : 1999,
        currency: 'RUB',
        status: 'completed',
        provider: 'mock',
        transaction_id: transactionId,
        tier,
        created_at: now.toISOString(),
      });
    }

    this.logger.log(`User ${userId} upgraded to ${tier}`);

    // PREMIUM: пересчитать/перезаписать интерпретацию натальной карты через AI и прогреть гороскопы
    try {
      // 1) Находим последнюю карту пользователя (через Admin)
      const { data: charts } =
        await this.supabaseService.getUserChartsAdmin(userId);
      const chartRec =
        Array.isArray(charts) && charts.length > 0 ? charts[0] : null;

      // 2) Если есть AI — генерируем premium-интерпретацию и сохраняем в карту
      if (chartRec && this.aiService.isAvailable()) {
        const chartData = chartRec.data || {};
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

          await this.supabaseService
            .fromAdmin('charts')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', chartRec.id);
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
    // ✅ КРИТИЧНО: Используем fromAdmin!
    const { error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .update({
        is_cancelled: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Ошибка отмены подписки');
    }

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
    // ✅ КРИТИЧНО: Используем fromAdmin!
    await this.supabaseService
      .fromAdmin('subscriptions')
      .update({
        tier: SubscriptionTier.FREE,
        expires_at: null,
        is_cancelled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

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
}
