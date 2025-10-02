export declare enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  MAX = 'max',
}
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
export declare const SUBSCRIPTION_PLANS: SubscriptionPlan[];
export declare const FEATURE_REQUIREMENTS: Record<string, SubscriptionTier[]>;
export declare function getPlanByTier(tier: SubscriptionTier): SubscriptionPlan;
export declare function requiresTier(
  feature: keyof typeof FEATURE_REQUIREMENTS,
  currentTier: SubscriptionTier
): boolean;
export declare function getRequiredTiers(
  feature: keyof typeof FEATURE_REQUIREMENTS
): SubscriptionTier[];
export declare function formatPrice(price: number, currency?: string): string;
export declare function getTierColors(tier: SubscriptionTier): string[];
export declare function getTierName(tier: SubscriptionTier): string;
export interface UpgradeSuggestion {
  featureName: string;
  requiredTier: SubscriptionTier;
  benefit: string;
  icon: string;
}
export declare const UPGRADE_SUGGESTIONS: Record<string, UpgradeSuggestion>;
export declare const TRIAL_CONFIG: {
  duration: number;
  tier: SubscriptionTier;
  enabled: boolean;
};
