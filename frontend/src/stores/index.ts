/**
 * Zustand stores for AstraLink frontend
 */

// Auth store
export {
  useAuthStore,
  useAuthUser,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
} from './auth.store';

// Subscription store
export {
  useSubscriptionStore,
  useSubscription,
  useSubscriptionLoading,
  useSubscriptionError,
  useCanAccessFeature,
  useIsSubscriptionActive,
  useRemainingTrialDays,
} from './subscription.store';

// Chart store
export {
  useChartStore,
  useNatalChart,
  useChartLoading,
  useChartError,
  useHasNatalChart,
  usePlanetPosition,
  useHousePosition,
  useChartAspects,
} from './chart.store';

// Re-export types
export type { User } from './auth.store';
export type {
  SubscriptionStatus,
  SubscriptionLimits,
} from './subscription.store';
export type { NatalChart, PlanetPosition, HousePosition } from './chart.store';
