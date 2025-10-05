// backend/src/analytics/analytics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  SubscriptionTier,
  SubscriptionAnalytics,
  FeatureUsageStats,
  FEATURE_MATRIX,
} from '../types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private supabaseService: SupabaseService) {}

  /**
   * Записать использование функции (успешное)
   */
  async recordFeatureUsage(
    userId: string,
    featureName: string,
    tier: SubscriptionTier,
  ): Promise<void> {
    try {
      await this.supabaseService.from('feature_usage').insert({
        user_id: userId,
        feature_name: featureName,
        tier,
        success: true,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      // Не прерываем основной запрос из-за ошибки аналитики
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to record feature usage: ${errorMessage}`);
    }
  }

  /**
   * Записать заблокированную попытку доступа (для FOMO метрик)
   */
  async recordBlockedFeatureAttempt(
    userId: string,
    featureName: string,
    currentTier: SubscriptionTier,
  ): Promise<void> {
    try {
      await this.supabaseService.from('feature_usage').insert({
        user_id: userId,
        feature_name: featureName,
        tier: currentTier,
        success: false,
        created_at: new Date().toISOString(),
      });

      // Увеличиваем счетчик FOMO для этого пользователя
      await this.incrementFOMOCounter(userId, featureName);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to record blocked attempt: ${errorMessage}`);
    }
  }

  /**
   * Увеличить счетчик FOMO (Fear Of Missing Out)
   * Используется для персонализированных предложений upgrade
   */
  private async incrementFOMOCounter(
    userId: string,
    featureName: string,
  ): Promise<void> {
    try {
      const { data, error } = await this.supabaseService
        .from('user_fomo_counters')
        .select('*')
        .eq('user_id', userId)
        .eq('feature_name', featureName)
        .single();

      if (error && error.code === 'PGRST116') {
        // Запись не найдена - создаем
        await this.supabaseService.from('user_fomo_counters').insert({
          user_id: userId,
          feature_name: featureName,
          counter: 1,
          last_attempt: new Date().toISOString(),
        });
      } else if (!error && data) {
        // Обновляем существующую запись
        await this.supabaseService
          .from('user_fomo_counters')
          .update({
            counter: data.counter + 1,
            last_attempt: new Date().toISOString(),
          })
          .eq('id', data.id);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to increment FOMO counter: ${errorMessage}`);
    }
  }

  /**
   * Получить общую аналитику по подпискам
   */
  async getSubscriptionAnalytics(): Promise<SubscriptionAnalytics> {
    try {
      // Получаем всех пользователей с подписками
      const { data: subscriptions, error } = await this.supabaseService
        .from('subscriptions')
        .select('tier, expires_at, trial_ends_at');

      if (error) {
        throw error;
      }

      const now = new Date();

      // Подсчет пользователей по тирам
      let freeUsers = 0;
      let premiumUsers = 0;
      let maxUsers = 0;
      let activeTrials = 0;

      subscriptions?.forEach((sub) => {
        const expiresAt = sub.expires_at ? new Date(sub.expires_at) : null;
        const trialEndsAt = sub.trial_ends_at
          ? new Date(sub.trial_ends_at)
          : null;

        const isTrial = trialEndsAt && trialEndsAt > now;
        const isActive =
          sub.tier === 'free' || isTrial || (expiresAt && expiresAt > now);

        if (isTrial) {
          activeTrials++;
        }

        if (isActive) {
          if (sub.tier === SubscriptionTier.FREE) freeUsers++;
          else if (sub.tier === SubscriptionTier.PREMIUM) premiumUsers++;
          else if (sub.tier === SubscriptionTier.MAX) maxUsers++;
        }
      });

      const totalUsers = freeUsers + premiumUsers + maxUsers;
      const paidUsers = premiumUsers + maxUsers;

      // Конверсия: сколько free пользователей стали платящими
      const conversionRate = freeUsers > 0 ? (paidUsers / freeUsers) * 100 : 0;

      // MRR (Monthly Recurring Revenue)
      const monthlyRecurringRevenue =
        premiumUsers * FEATURE_MATRIX[SubscriptionTier.PREMIUM].price +
        maxUsers * FEATURE_MATRIX[SubscriptionTier.MAX].price;

      // ARPU (Average Revenue Per User)
      const averageRevenuePerUser =
        totalUsers > 0 ? monthlyRecurringRevenue / totalUsers : 0;

      // Churn rate (отток) - считаем из истории платежей за последний месяц
      const churnRate = await this.calculateChurnRate();

      return {
        totalUsers,
        freeUsers,
        premiumUsers,
        maxUsers,
        activeTrials,
        conversionRate: Math.round(conversionRate * 100) / 100,
        churnRate,
        monthlyRecurringRevenue:
          Math.round(monthlyRecurringRevenue * 100) / 100,
        averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error getting subscription analytics: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Рассчитать churn rate (процент оттока пользователей)
   */
  private async calculateChurnRate(): Promise<number> {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      // Пользователи, у которых истекла подписка за последний месяц
      const { data: churned, error: churnError } = await this.supabaseService
        .from('subscriptions')
        .select('id')
        .lt('expires_at', new Date().toISOString())
        .gte('expires_at', oneMonthAgo.toISOString())
        .neq('tier', SubscriptionTier.FREE);

      // Все платящие пользователи месяц назад
      const { data: totalPaid, error: totalError } = await this.supabaseService
        .from('subscriptions')
        .select('id')
        .gte('expires_at', oneMonthAgo.toISOString())
        .neq('tier', SubscriptionTier.FREE);

      if (churnError || totalError) {
        return 0;
      }

      const churnedCount = churned?.length || 0;
      const totalPaidCount = totalPaid?.length || 0;

      return totalPaidCount > 0
        ? Math.round((churnedCount / totalPaidCount) * 10000) / 100
        : 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to calculate churn rate: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * Получить статистику по использованию функций
   */
  async getFeatureUsageStats(): Promise<FeatureUsageStats[]> {
    try {
      const { data, error } = await this.supabaseService
        .from('feature_usage')
        .select('feature_name, tier, success');

      if (error) {
        throw error;
      }

      // Группируем по feature_name
      const statsMap = new Map<
        string,
        {
          total: number;
          free: number;
          premium: number;
          max: number;
          blocked: number;
        }
      >();

      data?.forEach((record) => {
        const feature = record.feature_name;
        if (!statsMap.has(feature)) {
          statsMap.set(feature, {
            total: 0,
            free: 0,
            premium: 0,
            max: 0,
            blocked: 0,
          });
        }

        const stats = statsMap.get(feature)!;
        stats.total++;

        if (!record.success) {
          stats.blocked++;
        } else {
          if (record.tier === SubscriptionTier.FREE) stats.free++;
          else if (record.tier === SubscriptionTier.PREMIUM) stats.premium++;
          else if (record.tier === SubscriptionTier.MAX) stats.max++;
        }
      });

      // Преобразуем в массив
      return Array.from(statsMap.entries()).map(([feature, stats]) => ({
        feature,
        totalUsage: stats.total,
        freeUsage: stats.free,
        premiumUsage: stats.premium,
        maxUsage: stats.max,
        blockedAttempts: stats.blocked,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error getting feature usage stats: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Получить персональные рекомендации для пользователя (на основе FOMO)
   */
  async getPersonalizedUpgradeRecommendations(userId: string): Promise<{
    shouldShowOffer: boolean;
    message: string;
    blockedFeatures: string[];
    discount?: number;
  }> {
    try {
      const { data, error } = await this.supabaseService
        .from('user_fomo_counters')
        .select('*')
        .eq('user_id', userId)
        .order('counter', { ascending: false })
        .limit(5);

      if (error || !data || data.length === 0) {
        return {
          shouldShowOffer: false,
          message: '',
          blockedFeatures: [],
        };
      }

      // Если пользователь пытался 3+ раз получить доступ к премиум функциям
      const totalAttempts = data.reduce(
        (sum, record) => sum + record.counter,
        0,
      );

      if (totalAttempts >= 3) {
        const topFeatures = data.slice(0, 3).map((r) => r.feature_name);

        return {
          shouldShowOffer: true,
          message: `Вы ${totalAttempts} раз пытались получить доступ к премиум функциям. Попробуйте Premium бесплатно 7 дней!`,
          blockedFeatures: topFeatures,
          discount: totalAttempts >= 5 ? 20 : undefined, // 20% скидка при 5+ попытках
        };
      }

      return {
        shouldShowOffer: false,
        message: '',
        blockedFeatures: [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to get recommendations: ${errorMessage}`);
      return {
        shouldShowOffer: false,
        message: '',
        blockedFeatures: [],
      };
    }
  }
}
