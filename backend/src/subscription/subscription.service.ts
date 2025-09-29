import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { SubscriptionStatusResponse } from '../types';

@Injectable()
export class SubscriptionService {
  constructor(private supabaseService: SupabaseService) {}

  async getStatus(userId: string): Promise<SubscriptionStatusResponse> {
    const { data: subscription, error } = await this.supabaseService
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found"
      throw new BadRequestException('Ошибка получения статуса подписки');
    }

    const level = subscription?.tier || 'free';
    const expiresAt = subscription?.expires_at
      ? new Date(subscription.expires_at)
      : new Date();
    const isActive =
      subscription && subscription.expires_at
        ? new Date(subscription.expires_at) > new Date()
        : false;

    const features = this.getFeaturesForLevel(level);

    return {
      level,
      expiresAt: expiresAt.toISOString(),
      isActive,
      features,
    };
  }

  async upgrade(userId: string, level: string) {
    const validLevels = ['AstraPlus', 'DatingPremium', 'MAX'];
    if (!validLevels.includes(level)) {
      throw new BadRequestException('Неверный уровень подписки');
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 месяц

    const { data: subscription, error } = await this.supabaseService
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier: level,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException('Ошибка обновления подписки');
    }

    return {
      success: true,
      message: 'Подписка обновлена',
      subscription: {
        level: subscription.tier,
        expiresAt: subscription.expires_at,
      },
    };
  }

  private getFeaturesForLevel(level: string): string[] {
    switch (level) {
      case 'free':
        return ['Базовая натальная карта', 'Ограниченные транзиты'];
      case 'AstraPlus':
        return [
          'Полная натальная карта',
          'Расширенные транзиты',
          'Синастрия',
          'Композитные карты',
        ];
      case 'DatingPremium':
        return [
          'Все функции AstraPlus',
          'Расширенный поиск совместимости',
          'Приоритет в знакомствах',
        ];
      case 'MAX':
        return [
          'Все функции',
          'Персональный астролог',
          'Неограниченные консультации',
        ];
      default:
        return [];
    }
  }
}
