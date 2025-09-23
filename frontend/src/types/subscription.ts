export interface Subscription {
  id: string;
  userId: string;
  tier: 'free' | 'basic' | 'premium' | 'max';
  startedAt: string;
  expiresAt?: string;
  isActive: boolean;
  features?: string[];
}

export type SubscriptionLevel = 'Free' | 'AstraPlus' | 'DatingPremium' | 'MAX';

export interface SubscriptionPlan {
  level: SubscriptionLevel;
  name: string;
  price: number;
  currency: string;
  period: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  colors: string[];
}

export interface UpgradeSubscriptionRequest {
  planId: string;
  paymentMethod?: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    level: 'Free',
    name: 'Бесплатный',
    price: 0,
    currency: 'RUB',
    period: 'month',
    features: [
      'Базовый натальный гороскоп',
      'Ежедневные предсказания',
      'Совместимость с одним человеком'
    ],
    colors: ['#6B7280', '#9CA3AF'],
  },
  {
    level: 'AstraPlus',
    name: 'AstraPlus',
    price: 299,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции Free',
      'Детальный анализ транзитов',
      'Неограниченная совместимость',
      'Биоритмы и лунные фазы',
      'Персональные рекомендации'
    ],
    colors: ['#8B5CF6', '#A855F7'],
  },
  {
    level: 'DatingPremium',
    name: 'Dating Premium',
    price: 599,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции AstraPlus',
      'Cosmic Dating - неограниченно',
      'Приоритет в поиске',
      'Расширенный анализ совместимости',
      'Astro-ассистент для знакомств'
    ],
    isPopular: true,
    colors: ['#EC4899', '#F97316'],
  },
  {
    level: 'MAX',
    name: 'Cosmic MAX',
    price: 999,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции Premium',
      'Персональные консультации астролога',
      'Эксклюзивные прогнозы',
      'Ранний доступ к новым функциям',
      'VIP поддержка',
      'Индивидуальные ритуалы и практики'
    ],
    colors: ['#FBBF24', '#F59E0B'],
  },
];

export const SUBSCRIPTION_LEVEL_COLORS: Record<SubscriptionLevel, string[]> = {
  Free: ['#6B7280', '#9CA3AF'],
  AstraPlus: ['#8B5CF6', '#A855F7'],
  DatingPremium: ['#EC4899', '#F97316'],
  MAX: ['#FBBF24', '#F59E0B'],
};
