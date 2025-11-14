import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SubscriptionStatusResponse } from '../types';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  async getStatus(userId: number): Promise<SubscriptionStatusResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const level = subscription?.tier || 'free';
    const expiresAt = subscription?.expiresAt || new Date();
    const isActive =
      subscription && subscription.expiresAt
        ? new Date(subscription.expiresAt) > new Date()
        : false;

    const features = this.getFeaturesForLevel(level);

    return {
      level,
      expiresAt: expiresAt.toISOString(),
      isActive,
      features,
    };
  }

  async upgrade(userId: number, level: string) {
    const validLevels = ['AstraPlus', 'DatingPremium', 'MAX'];
    if (!validLevels.includes(level)) {
      throw new BadRequestException('Неверный уровень подписки');
    }

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 месяц

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        tier: level,
        expiresAt,
      },
      create: {
        userId,
        tier: level,
        expiresAt,
      },
    });

    return {
      success: true,
      message: 'Подписка обновлена',
      subscription: {
        level: subscription.tier,
        expiresAt: subscription.expiresAt,
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
