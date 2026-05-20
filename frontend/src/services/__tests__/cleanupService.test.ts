import {
  getSupabaseSecureKeysForCleanup,
  resetInMemoryUserState,
} from '../cleanupService';
import { useAuthStore } from '../../stores/auth.store';
import { useOnboardingStore } from '../../stores/onboarding.store';
import { useChartStore } from '../../stores/chart.store';
import { useSubscriptionStore } from '../../stores/subscription.store';

describe('cleanupService', () => {
  beforeEach(() => {
    useAuthStore.getState().resetAuth();
    useOnboardingStore.getState().reset();
    resetInMemoryUserState();
  });

  it('builds Supabase auth storage keys from project refs', () => {
    expect(
      getSupabaseSecureKeysForCleanup([
        'https://ayoucajwdyinyhamousz.supabase.co',
        'not-a-url',
      ])
    ).toEqual([
      'sb-ayoucajwdyinyhamousz-auth-token',
      'sb-ayoucajwdyinyhamousz-auth-token-code-verifier',
      'sb-ayoucajwdyinyhamousz-auth-token-user',
    ]);
  });

  it('clears in-memory user stores after account deletion', () => {
    useAuthStore.getState().setAuthState('AUTHORIZED');
    useOnboardingStore.getState().setName('Old Name');
    useOnboardingStore.getState().setBirthDate({
      day: 1,
      month: 2,
      year: 1990,
    });
    useChartStore.setState({
      natalChart: { id: 'chart-1', data: {} } as any,
      currentTransits: [{ id: 'transit-1' }],
      predictions: [{ id: 'prediction-1' }],
      isLoading: true,
      error: 'chart-error',
    });
    useSubscriptionStore.setState({
      subscription: {
        tier: 'premium',
        isActive: true,
        isTrial: false,
        features: ['aiHoroscope'],
        limits: {
          natalChart: 'full',
          horoscope: 'ai',
        },
      },
      isLoading: true,
      error: 'subscription-error',
    });

    resetInMemoryUserState();

    expect(useAuthStore.getState().authState).toBe('UNAUTHORIZED');
    expect(useOnboardingStore.getState().data).toEqual({
      isCompleted: false,
    });
    expect(useChartStore.getState().natalChart).toBeNull();
    expect(useChartStore.getState().currentTransits).toBeNull();
    expect(useChartStore.getState().predictions).toBeNull();
    expect(useChartStore.getState().isLoading).toBe(false);
    expect(useSubscriptionStore.getState().subscription).toBeNull();
    expect(useSubscriptionStore.getState().isLoading).toBe(false);
  });
});
