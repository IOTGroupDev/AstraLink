import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from '../../types';

export const SUBSCRIPTION_KEY = 'requiredSubscription';

/**
 * Декоратор для защиты эндпоинтов по уровню подписки
 * @param tiers - массив допустимых уровней подписки
 * @example
 * @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
 * @Get('horoscope/ai')
 * getAIHoroscope() { ... }
 */
export const RequiresSubscription = (...tiers: SubscriptionTier[]) =>
  SetMetadata(SUBSCRIPTION_KEY, tiers);
