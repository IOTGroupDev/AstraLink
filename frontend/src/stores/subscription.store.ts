import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SubscriptionLimits {
  natalChart: number | 'full' | 'basic';
  horoscope: 'ai' | 'interpreter';
}

interface SubscriptionStatus {
  tier: 'free' | 'premium' | 'max';
  isActive: boolean;
  isTrial: boolean;
  expiresAt?: string;
  trialEndsAt?: string;
  features: string[];
  limits: SubscriptionLimits;
}

interface SubscriptionState {
  subscription: SubscriptionStatus | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSubscription: (subscription: SubscriptionStatus | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateSubscription: (updates: Partial<SubscriptionStatus>) => void;
  clearError: () => void;

  // Computed properties
  canAccessFeature: (feature: keyof SubscriptionLimits, value?: any) => boolean;
  getRemainingTrialDays: () => number;
  isSubscriptionActive: () => boolean;
}

const FREE_LIMITS: SubscriptionLimits = {
  natalChart: 0.2,
  horoscope: 'interpreter',
};

const PREMIUM_LIMITS: SubscriptionLimits = {
  natalChart: 1,
  horoscope: 'ai',
};

const MAX_LIMITS: SubscriptionLimits = {
  natalChart: 1,
  horoscope: 'ai',
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscription: null,
      isLoading: false,
      error: null,

      setSubscription: (subscription) =>
        set({
          subscription,
          error: null,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) =>
        set({
          error,
          isLoading: false,
        }),

      updateSubscription: (updates) => {
        const currentSubscription = get().subscription;
        if (currentSubscription) {
          set({
            subscription: { ...currentSubscription, ...updates },
          });
        }
      },

      clearError: () => set({ error: null }),

      canAccessFeature: (feature, value) => {
        const subscription = get().subscription;
        if (!subscription || !subscription.isActive) {
          // Check free tier limits
          return checkFeatureAccess(feature, value, FREE_LIMITS);
        }

        return checkFeatureAccess(feature, value, subscription.limits);
      },

      getRemainingTrialDays: () => {
        const subscription = get().subscription;
        if (!subscription?.isTrial || !subscription.trialEndsAt) {
          return 0;
        }

        const trialEnd = new Date(subscription.trialEndsAt);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
      },

      isSubscriptionActive: () => {
        const subscription = get().subscription;
        if (!subscription) return false;

        if (!subscription.isActive) return false;

        // Check if subscription has expired
        if (subscription.expiresAt) {
          const expiryDate = new Date(subscription.expiresAt);
          const now = new Date();
          if (expiryDate <= now) return false;
        }

        return true;
      },
    }),
    {
      name: 'subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        subscription: state.subscription,
      }),
    }
  )
);

// Helper function to check feature access
function checkFeatureAccess(
  feature: keyof SubscriptionLimits,
  value: any,
  limits: SubscriptionLimits
): boolean {
  const limit = limits[feature];

  if (feature === 'natalChart') {
    if (typeof limit === 'number') {
      return typeof value === 'number' ? value <= limit : false;
    }
    if (limit === 'basic') {
      return value === 'basic' || value === 0.2;
    }
    if (limit === 'full') {
      return true;
    }
  }

  if (feature === 'horoscope') {
    if (limit === 'ai') {
      return true;
    }
    if (limit === 'interpreter') {
      return value === 'interpreter';
    }
  }

  return false;
}

// Selectors for common subscription state
export const useSubscription = () =>
  useSubscriptionStore((state) => state.subscription);
export const useSubscriptionLoading = () =>
  useSubscriptionStore((state) => state.isLoading);
export const useSubscriptionError = () =>
  useSubscriptionStore((state) => state.error);
export const useCanAccessFeature = () =>
  useSubscriptionStore((state) => state.canAccessFeature);
export const useIsSubscriptionActive = () =>
  useSubscriptionStore((state) => state.isSubscriptionActive);
export const useRemainingTrialDays = () =>
  useSubscriptionStore((state) => state.getRemainingTrialDays);
