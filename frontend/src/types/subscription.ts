// export interface Subscription {
//   id: string;
//   userId: string;
//   tier: 'free' | 'basic' | 'premium' | 'max';
//   startedAt: string;
//   expiresAt?: string;
//   isActive: boolean;
//   features?: string[];
// }
//
// export type SubscriptionLevel = 'Free' | 'AstraPlus' | 'DatingPremium' | 'MAX';
//
// export interface SubscriptionPlan {
//   level: SubscriptionLevel;
//   name: string;
//   price: number;
//   currency: string;
//   period: 'month' | 'year';
//   features: string[];
//   isPopular?: boolean;
//   colors: string[];
// }
//
// export interface UpgradeSubscriptionRequest {
//   planId: string;
//   paymentMethod?: string;
// }
//
// export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
//   {
//     level: 'Free',
//     name: 'Бесплатный',
//     price: 0,
//     currency: 'RUB',
//     period: 'month',
//     features: [
//       'Базовый натальный гороскоп',
//       'Ежедневные предсказания',
//       'Совместимость с одним человеком',
//     ],
//     colors: ['#6B7280', '#9CA3AF'],
//   },
//   {
//     level: 'AstraPlus',
//     name: 'AstraPlus',
//     price: 299,
//     currency: 'RUB',
//     period: 'month',
//     features: [
//       'Все функции Free',
//       'Детальный анализ транзитов',
//       'Неограниченная совместимость',
//       'Биоритмы и лунные фазы',
//       'Персональные рекомендации',
//     ],
//     colors: ['#8B5CF6', '#A855F7'],
//   },
//   {
//     level: 'DatingPremium',
//     name: 'Dating Premium',
//     price: 599,
//     currency: 'RUB',
//     period: 'month',
//     features: [
//       'Все функции AstraPlus',
//       'Cosmic Dating - неограниченно',
//       'Приоритет в поиске',
//       'Расширенный анализ совместимости',
//       'Astro-ассистент для знакомств',
//     ],
//     isPopular: true,
//     colors: ['#EC4899', '#F97316'],
//   },
//   {
//     level: 'MAX',
//     name: 'Cosmic MAX',
//     price: 999,
//     currency: 'RUB',
//     period: 'month',
//     features: [
//       'Все функции Premium',
//       'Персональные консультации астролога',
//       'Эксклюзивные прогнозы',
//       'Ранний доступ к новым функциям',
//       'VIP поддержка',
//       'Индивидуальные ритуалы и практики',
//     ],
//     colors: ['#FBBF24', '#F59E0B'],
//   },
// ];
//
// export const SUBSCRIPTION_LEVEL_COLORS: Record<SubscriptionLevel, string[]> = {
//   Free: ['#6B7280', '#9CA3AF'],
//   AstraPlus: ['#8B5CF6', '#A855F7'],
//   DatingPremium: ['#EC4899', '#F97316'],
//   MAX: ['#FBBF24', '#F59E0B'],
// };

// frontend/src/types/subscription.ts

// ========================================
// SUBSCRIPTION TIERS
// ========================================
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  // Legacy value from old builds/backend records. Treat as Premium in UI.
  MAX = 'max',
}

export function normalizeSubscriptionTier(
  tier?: SubscriptionTier | string | null
): SubscriptionTier {
  if (tier === SubscriptionTier.MAX) {
    return SubscriptionTier.PREMIUM;
  }

  return tier === SubscriptionTier.PREMIUM
    ? SubscriptionTier.PREMIUM
    : SubscriptionTier.FREE;
}

// ========================================
// SUBSCRIPTION TYPES
// ========================================
export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  expiresAt?: string;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt?: string;
  features: string[];
  daysRemaining?: number;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: number;
  currency: string;
  period: 'month' | 'year';
  features: string[];
  limits: SubscriptionLimits;
  isPopular?: boolean;
  colors: string[];
}

export interface SubscriptionLimits {
  natalChart: number | 'full' | 'basic';
  horoscope: 'ai' | 'interpreter';
  transits: 'detailed' | 'basic';
  connections: number;
  dating: number;
  lunarCalendar: 'month' | 'day';
  astrologerConsultations?: number;
  priority?: boolean;
}

export interface UpgradeSubscriptionRequest {
  tier: SubscriptionTier;
  paymentMethod?: 'apple' | 'google' | 'mock';
  transactionId?: string;
}

export interface TrialActivationResponse {
  success: boolean;
  message: string;
  expiresAt: string;
}

// ========================================
// SUBSCRIPTION PLANS
// ========================================
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: SubscriptionTier.FREE,
    name: 'Free',
    price: 0,
    currency: 'RUB',
    period: 'month',
    features: [
      'Базовая натальная карта',
      'Гороскопы (правила)',
      'Транзиты без деталей',
      '1 анализ совместимости',
      'Лунный календарь (день)',
    ],
    limits: {
      natalChart: 'basic',
      horoscope: 'interpreter',
      transits: 'basic',
      connections: 1,
      dating: 0,
      lunarCalendar: 'day',
    },
    colors: ['#6B7280', '#9CA3AF'],
  },
  {
    tier: SubscriptionTier.PREMIUM,
    name: 'Premium',
    price: 999,
    currency: 'RUB',
    period: 'month',
    features: [
      'Все функции Free',
      'Полная натальная карта с AI',
      'AI-гороскопы',
      'Детальные транзиты',
      'Неограниченная совместимость',
      'Астросимулятор',
      'Cosmic Dating',
      'Кто лайкнул',
      'Лунный календарь (месяц)',
      '2 консультации астролога/год',
      'Эксклюзивные прогнозы',
      'Ранний доступ',
      'VIP поддержка',
      'Годовой гороскоп PDF',
      'Приоритет в Dating',
    ],
    limits: {
      natalChart: 'full',
      horoscope: 'ai',
      transits: 'detailed',
      connections: Infinity,
      dating: Infinity,
      lunarCalendar: 'month',
      astrologerConsultations: 2,
      priority: true,
    },
    isPopular: true,
    colors: ['#8B5CF6', '#A855F7'],
  },
];

// ========================================
// FEATURE REQUIREMENTS (какие функции требуют какой подписки)
// ========================================
export const FEATURE_REQUIREMENTS: Record<string, SubscriptionTier[]> = {
  // Натальная карта
  fullNatalChart: [SubscriptionTier.PREMIUM],
  natalInterpretation: [SubscriptionTier.PREMIUM],

  // Гороскопы
  aiHoroscope: [SubscriptionTier.PREMIUM],

  // Транзиты
  detailedTransits: [SubscriptionTier.PREMIUM],
  astroSimulator: [SubscriptionTier.PREMIUM],

  // Связи
  unlimitedConnections: [SubscriptionTier.PREMIUM],
  detailedSynastry: [SubscriptionTier.PREMIUM],

  // Dating
  cosmicDating: [SubscriptionTier.PREMIUM],
  unlimitedLikes: [SubscriptionTier.PREMIUM],
  seeWhoLiked: [SubscriptionTier.PREMIUM],

  // Лунный календарь
  fullLunarCalendar: [SubscriptionTier.PREMIUM],

  astrologerConsultations: [SubscriptionTier.PREMIUM],
  vipSupport: [SubscriptionTier.PREMIUM],
  exclusiveContent: [SubscriptionTier.PREMIUM],
};

// ========================================
// HELPER FUNCTIONS
// ========================================
export function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan {
  const normalizedTier = normalizeSubscriptionTier(tier);
  return (
    SUBSCRIPTION_PLANS.find((plan) => plan.tier === normalizedTier) ||
    SUBSCRIPTION_PLANS[0]
  );
}

export function requiresTier(
  feature: keyof typeof FEATURE_REQUIREMENTS,
  currentTier: SubscriptionTier
): boolean {
  const requiredTiers = FEATURE_REQUIREMENTS[feature];
  const normalizedTier = normalizeSubscriptionTier(currentTier);
  return requiredTiers
    ? requiredTiers.some(
        (tier) => normalizeSubscriptionTier(tier) === normalizedTier
      )
    : true;
}

export function getRequiredTiers(
  feature: keyof typeof FEATURE_REQUIREMENTS
): SubscriptionTier[] {
  return FEATURE_REQUIREMENTS[feature] || [];
}

export function formatPrice(price: number, currency: string = 'RUB'): string {
  if (price === 0) return 'Бесплатно';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(price);
}

export function getTierColors(tier: SubscriptionTier): string[] {
  const plan = getPlanByTier(tier);
  return plan.colors;
}

export function getTierName(tier: SubscriptionTier): string {
  const plan = getPlanByTier(tier);
  return plan.name;
}

// ========================================
// UPGRADE SUGGESTIONS
// ========================================
export interface UpgradeSuggestion {
  featureName: string;
  requiredTier: SubscriptionTier;
  benefit: string;
  icon: string;
}

export const UPGRADE_SUGGESTIONS: Record<string, UpgradeSuggestion> = {
  fullNatalChart: {
    featureName: 'Полная натальная карта',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Откройте все секреты вашей карты с AI интерпретацией',
    icon: 'star',
  },
  aiHoroscope: {
    featureName: 'AI-гороскопы',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Персональные прогнозы на основе вашей карты',
    icon: 'sparkles',
  },
  astroSimulator: {
    featureName: 'Астросимулятор',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Путешествуйте во времени и изучайте транзиты',
    icon: 'time',
  },
  cosmicDating: {
    featureName: 'Cosmic Dating',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Находите совместимых партнеров по звездам',
    icon: 'heart',
  },
  astrologerConsultations: {
    featureName: 'Консультации астролога',
    requiredTier: SubscriptionTier.PREMIUM,
    benefit: 'Персональные сессии с профессиональным астрологом',
    icon: 'person',
  },
};

// ========================================
// TRIAL CONFIGURATION
// ========================================
export const TRIAL_CONFIG = {
  duration: 7, // дней
  tier: SubscriptionTier.PREMIUM,
  enabled: true,
};
