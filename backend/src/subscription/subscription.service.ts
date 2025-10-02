// import { Injectable, BadRequestException } from '@nestjs/common';
// import { SupabaseService } from '../supabase/supabase.service';
// import type { SubscriptionStatusResponse } from '../types';
//
// @Injectable()
// export class SubscriptionService {
//   constructor(private supabaseService: SupabaseService) {}
//
//   async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
//     const { data: subscription, error } = await this.supabaseService
//       .from('subscriptions')
//       .select('*')
//       .eq('user_id', userId)
//       .single();
//
//     if (error && error.code !== 'PGRST116') {
//       // PGRST116 is "not found"
//       throw new BadRequestException('Ошибка получения статуса подписки');
//     }
//
//     const level = subscription?.tier || 'free';
//     const expiresAt = subscription?.expires_at
//       ? new Date(subscription.expires_at)
//       : new Date();
//     const isActive =
//       subscription && subscription.expires_at
//         ? new Date(subscription.expires_at) > new Date()
//         : false;
//
//     const features = this.getFeaturesForLevel(level);
//
//     return {
//       level,
//       expiresAt: expiresAt.toISOString(),
//       isActive,
//       features,
//     };
//   }
//
//   async upgrade(userId: string, level: string) {
//     const validLevels = ['AstraPlus', 'DatingPremium', 'MAX'];
//     if (!validLevels.includes(level)) {
//       throw new BadRequestException('Неверный уровень подписки');
//     }
//
//     const expiresAt = new Date();
//     expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 месяц
//
//     const { data: subscription, error } = await this.supabaseService
//       .from('subscriptions')
//       .upsert({
//         user_id: userId,
//         tier: level,
//         expires_at: expiresAt.toISOString(),
//       })
//       .select()
//       .single();
//
//     if (error) {
//       throw new BadRequestException('Ошибка обновления подписки');
//     }
//
//     return {
//       success: true,
//       message: 'Подписка обновлена',
//       subscription: {
//         level: subscription.tier,
//         expiresAt: subscription.expires_at,
//       },
//     };
//   }
//
//   private getFeaturesForLevel(level: string): string[] {
//     switch (level) {
//       case 'free':
//         return ['Базовая натальная карта', 'Ограниченные транзиты'];
//       case 'AstraPlus':
//         return [
//           'Полная натальная карта',
//           'Расширенные транзиты',
//           'Синастрия',
//           'Композитные карты',
//         ];
//       case 'DatingPremium':
//         return [
//           'Все функции AstraPlus',
//           'Расширенный поиск совместимости',
//           'Приоритет в знакомствах',
//         ];
//       case 'MAX':
//         return [
//           'Все функции',
//           'Персональный астролог',
//           'Неограниченные консультации',
//         ];
//       default:
//         return [];
//     }
//   }
// }

// backend/src/subscription/subscription.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SubscriptionTier,
  SubscriptionStatusResponse,
  FEATURE_MATRIX,
  TRIAL_CONFIG,
} from '../types';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Получить статус подписки пользователя
   */
  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    try {
      const { data: subscription, error } = await this.supabaseService
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        this.logger.error(`Error getting subscription: ${error.message}`);
        throw new BadRequestException('Ошибка получения статуса подписки');
      }

      // Если подписки нет - создаем Free с возможностью Trial
      if (!subscription) {
        return await this.createFreeSubscription(userId);
      }

      const tier = subscription.tier as SubscriptionTier;
      const expiresAt = subscription.expires_at
        ? new Date(subscription.expires_at)
        : null;
      const trialEndsAt = subscription.trial_ends_at
        ? new Date(subscription.trial_ends_at)
        : null;

      const now = new Date();

      // Проверяем активность trial
      const isTrial = trialEndsAt ? trialEndsAt > now : false;

      // Проверяем активность подписки
      let isActive = false;
      if (tier === SubscriptionTier.FREE) {
        isActive = true; // Free всегда активна
      } else if (isTrial) {
        isActive = true; // Trial активен
      } else if (expiresAt && expiresAt > now) {
        isActive = true; // Платная подписка активна
      }

      // Если подписка истекла, сбрасываем до Free
      if (!isActive && tier !== SubscriptionTier.FREE) {
        await this.downgradeToFree(userId);
        return this.getStatus(userId); // Рекурсивно получаем новый статус
      }

      const features = FEATURE_MATRIX[tier].features;

      // Рассчитываем оставшиеся дни
      let daysRemaining: number | undefined;
      if (isTrial && trialEndsAt) {
        daysRemaining = Math.ceil(
          (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
      } else if (isActive && expiresAt) {
        daysRemaining = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
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
      this.logger.error(`Error in getStatus: ${error.message}`);
      throw error;
    }
  }

  /**
   * Создать бесплатную подписку с возможностью Trial
   */
  private async createFreeSubscription(
    userId: string,
  ): Promise<SubscriptionStatusResponse> {
    const now = new Date();
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.duration);

    const { error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .insert({
        user_id: userId,
        tier: SubscriptionTier.FREE,
        trial_ends_at: TRIAL_CONFIG.enabled ? trialEndsAt.toISOString() : null,
        created_at: now.toISOString(),
      });

    if (error) {
      this.logger.error(`Error creating subscription: ${error.message}`);
      throw new BadRequestException('Ошибка создания подписки');
    }

    return {
      tier: SubscriptionTier.FREE,
      isActive: true,
      isTrial: false,
      features: FEATURE_MATRIX[SubscriptionTier.FREE].features,
      trialEndsAt: TRIAL_CONFIG.enabled ? trialEndsAt.toISOString() : undefined,
    };
  }

  /**
   * Активировать Trial (7 дней Premium бесплатно)
   */
  async activateTrial(userId: string): Promise<{
    success: boolean;
    message: string;
    expiresAt: string;
  }> {
    const { data: subscription, error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !subscription) {
      throw new BadRequestException('Подписка не найдена');
    }

    // Проверяем, был ли уже использован trial
    if (subscription.trial_ends_at) {
      const trialEndsAt = new Date(subscription.trial_ends_at);
      const now = new Date();

      if (trialEndsAt < now) {
        throw new BadRequestException('Trial период уже был использован');
      } else {
        throw new BadRequestException('Trial период уже активен');
      }
    }

    // Активируем Trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_CONFIG.duration);

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

    this.logger.log(
      `Trial activated for user ${userId} until ${trialEndsAt.toISOString()}`,
    );

    return {
      success: true,
      message: `Trial активирован на ${TRIAL_CONFIG.duration} дней`,
      expiresAt: trialEndsAt.toISOString(),
    };
  }

  /**
   * Обновить подписку (Mock платеж для разработки)
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

    // Mock платеж для разработки
    if (paymentMethod === 'mock') {
      return this.processMockPayment(userId, tier, transactionId);
    }

    // TODO: Реальная интеграция с Apple/Google In-App Purchase
    throw new BadRequestException(
      `Платежный метод ${paymentMethod} пока не поддерживается`,
    );
  }

  /**
   * Mock платеж (для разработки и демо)
   */
  private async processMockPayment(
    userId: string,
    tier: SubscriptionTier,
    transactionId?: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // +1 месяц

    const { data: subscription, error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .upsert({
        user_id: userId,
        tier,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Ошибка обновления подписки');
    }

    // Записываем mock платеж
    await this.supabaseService.from('payments').insert({
      user_id: userId,
      subscription_id: subscription.id,
      amount: FEATURE_MATRIX[tier].price,
      currency: 'USD',
      provider: 'mock',
      provider_payment_id: transactionId || `mock_${Date.now()}`,
      status: 'completed',
    });

    this.logger.log(`Mock payment completed for user ${userId}: ${tier}`);

    return {
      success: true,
      message: `Подписка ${FEATURE_MATRIX[tier].name} активирована (Mock)`,
      subscription: {
        tier,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  /**
   * Понизить до Free (при истечении подписки)
   */
  private async downgradeToFree(userId: string) {
    const { error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .update({
        tier: SubscriptionTier.FREE,
        expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Error downgrading to free: ${error.message}`);
    }

    this.logger.log(`User ${userId} downgraded to Free`);
  }

  /**
   * Отменить подписку (сохраняется до конца оплаченного периода)
   */
  async cancel(userId: string) {
    const status = await this.getStatus(userId);

    if (status.tier === SubscriptionTier.FREE) {
      throw new BadRequestException('Нечего отменять - у вас Free подписка');
    }

    // Помечаем подписку как отменяемую (будет действовать до expires_at)
    const { error } = await this.supabaseService
      .fromAdmin('subscriptions')
      .update({
        is_cancelled: true, // Новое поле
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      throw new BadRequestException('Ошибка отмены подписки');
    }

    return {
      success: true,
      message:
        'Подписка отменена. Доступ сохранится до конца оплаченного периода',
      expiresAt: status.expiresAt,
    };
  }

  /**
   * Проверить лимиты использования (для MAX подписки)
   */
  async checkUsageLimits(userId: string): Promise<{
    consultationsUsed: number;
    consultationsRemaining: number;
  }> {
    // Получаем использованные консультации за текущий год
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);

    const { data, error } = await this.supabaseService
      .from('astrologer_consultations')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', startOfYear.toISOString());

    if (error) {
      this.logger.error(`Error checking limits: ${error.message}`);
      return { consultationsUsed: 0, consultationsRemaining: 2 };
    }

    const used = data?.length || 0;
    const remaining = Math.max(0, 2 - used);

    return {
      consultationsUsed: used,
      consultationsRemaining: remaining,
    };
  }

  /**
   * Получить доступные планы подписок
   */
  getPlans() {
    return Object.entries(FEATURE_MATRIX).map(([tier, config]) => ({
      tier,
      name: config.name,
      price: config.price,
      features: config.features,
      isPopular: tier === SubscriptionTier.PREMIUM.toString(), // Premium - самый популярный
    }));
  }
}
