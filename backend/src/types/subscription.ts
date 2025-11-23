// import { z } from 'zod';
//
// export const SubscriptionSchema = z.object({
//   id: z.string().optional(),
//   userId: z.string(),
//   level: z.enum(['Free', 'AstraPlus', 'DatingPremium', 'MAX']),
//   expiresAt: z.string(),
//   createdAt: z.string().optional(),
//   updatedAt: z.string().optional(),
// });
//
// export type Subscription = z.infer<typeof SubscriptionSchema>;
//
// export const UpgradeSubscriptionRequestSchema = z.object({
//   level: z.enum(['AstraPlus', 'DatingPremium', 'MAX']),
// });
//
// export type UpgradeSubscriptionRequest = z.infer<
//   typeof UpgradeSubscriptionRequestSchema
// >;
//
// export const SubscriptionStatusResponseSchema = z.object({
//   level: z.string(),
//   expiresAt: z.string(),
//   isActive: z.boolean(),
//   features: z.array(z.string()),
// });
//
// export type SubscriptionStatusResponse = z.infer<
//   typeof SubscriptionStatusResponseSchema
// >;

// backend/src/types/subscription.ts
import { z } from 'zod';
import { LIMITS } from '../config/limits.config';

// ========================================
// SUBSCRIPTION TIERS (3 уровня)
// ========================================
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium', // $14.99/мес (было AstraPlus + Dating)
  MAX = 'max', // $19.99/мес
}

// ========================================
// SUBSCRIPTION SCHEMAS
// ========================================
export const SubscriptionSchema = z.object({
  id: z.string().optional(),
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  expiresAt: z.string().optional(), // ISO string, null для free
  isActive: z.boolean(),
  trialEndsAt: z.string().optional(), // Trial период
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Subscription = z.infer<typeof SubscriptionSchema>;

export const UpgradeSubscriptionRequestSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  paymentMethod: z.enum(['apple', 'google', 'mock']).optional(),
  transactionId: z.string().optional(),
});

export type UpgradeSubscriptionRequest = z.infer<
  typeof UpgradeSubscriptionRequestSchema
>;

export const SubscriptionStatusResponseSchema = z.object({
  tier: z.nativeEnum(SubscriptionTier),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
  isTrial: z.boolean(),
  trialEndsAt: z.string().optional(),
  features: z.array(z.string()),
  daysRemaining: z.number().optional(),
});

export type SubscriptionStatusResponse = z.infer<
  typeof SubscriptionStatusResponseSchema
>;

// ========================================
// FEATURE MATRIX (Матрица функций)
// ========================================
export const FEATURE_MATRIX = {
  [SubscriptionTier.FREE]: {
    name: 'Free',
    price: 0,
    features: [
      'Базовая натальная карта (20% данных)',
      'Гороскопы на основе правил (без AI)',
      'Транзиты без деталей',
      '1 анализ совместимости (только %)',
      'Лунный календарь (текущий день)',
    ],
    limits: {
      natalChart: 0.2, // 20% данных
      horoscope: 'interpreter', // Только интерпретатор
      transits: 'basic', // Базовые транзиты
      connections: 1, // Только 1 связь
      dating: 0, // Нет доступа к Dating
      lunarCalendar: 'day', // Только текущий день
      aiAccess: false, // ❌ Нет доступа к AI
      advisorQueries: 0, // ❌ Нет доступа к советнику
    },
  },
  [SubscriptionTier.PREMIUM]: {
    name: 'Premium',
    price: 14.99,
    features: [
      'Полная натальная карта с AI интерпретацией',
      'AI-генерация персональных гороскопов (1 раз в сутки)',
      'Детальные транзиты и прогнозы',
      'Неограниченный анализ совместимости',
      'Астросимулятор (машина времени)',
      'Cosmic Dating (неограниченно)',
      'Кто лайкнул в Dating',
      'Лунный календарь (полный месяц)',
      'Биоритмы и практики',
      'AI Советник (30 запросов в сутки)',
    ],
    limits: {
      natalChart: 1,
      horoscope: 'ai',
      transits: 'detailed',
      connections: Infinity,
      dating: Infinity,
      lunarCalendar: 'month',
      aiAccess: true,
      advisorQueries: LIMITS.ADVISOR.PREMIUM_DAILY,
      timeMachineQueries: LIMITS.TIME_MACHINE.PREMIUM_DAILY,
      horoscopeRefresh: 'daily',
    },
  },
  [SubscriptionTier.MAX]: {
    name: 'Cosmic MAX',
    price: 19.99,
    features: [
      'Все функции Premium',
      '2 персональные консультации астролога/год',
      'Эксклюзивные прогнозы и ритуалы',
      'Ранний доступ к новым функциям',
      'VIP поддержка',
      'Индивидуальный годовой гороскоп (PDF)',
      'Приоритет в Dating',
      'AI Советник (50 запросов в сутки)',
    ],
    limits: {
      natalChart: 1,
      horoscope: 'ai',
      transits: 'detailed',
      connections: Infinity,
      dating: Infinity,
      lunarCalendar: 'month',
      astrologerConsultations: 2,
      priority: true,
      aiAccess: true,
      advisorQueries: LIMITS.ADVISOR.MAX_DAILY,
      timeMachineQueries: LIMITS.TIME_MACHINE.MAX_DAILY,
      horoscopeRefresh: 'daily',
    },
  },
};

// ========================================
// TRIAL CONFIGURATION
// ========================================
export const TRIAL_CONFIG = {
  duration: 7, // дней
  tier: SubscriptionTier.PREMIUM, // Trial дает Premium доступ
  enabled: true,
};

// ========================================
// HELPER FUNCTIONS
// ========================================
export function getFeatures(tier: SubscriptionTier): string[] {
  return FEATURE_MATRIX[tier].features;
}

export function getLimits(tier: SubscriptionTier) {
  return FEATURE_MATRIX[tier].limits;
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof (typeof FEATURE_MATRIX)[SubscriptionTier.FREE]['limits'],
): boolean {
  const limits = getLimits(tier);
  const value = limits[feature];

  if (typeof value === 'number') {
    return value > 0;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  return value !== 'basic' && value !== 0;
}

export function hasAIAccess(tier: SubscriptionTier): boolean {
  return tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.MAX;
}

export function requiresTier(
  currentTier: SubscriptionTier,
  requiredTiers: SubscriptionTier[],
): boolean {
  return requiredTiers.includes(currentTier);
}

// ========================================
// ANALYTICS TYPES
// ========================================
export interface SubscriptionAnalytics {
  totalUsers: number;
  freeUsers: number;
  premiumUsers: number;
  maxUsers: number;
  activeTrials: number;
  conversionRate: number; // free → premium
  churnRate: number; // отток
  monthlyRecurringRevenue: number;
  averageRevenuePerUser: number;
}

export interface FeatureUsageStats {
  feature: string;
  totalUsage: number;
  freeUsage: number;
  premiumUsage: number;
  maxUsage: number;
  blockedAttempts: number; // Сколько раз пытались использовать без подписки
}
