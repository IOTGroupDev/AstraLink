import { supabase } from './supabase';
import { tokenService } from './tokenService';
import { useAuthStore } from '../stores/auth.store';
import { authLogger } from './logger';
import { queryClient } from '../providers/QueryProvider';
import { resetInMemoryUserState } from './cleanupService';
import { useOnboardingStore } from '../stores/onboarding.store';
import { useChartStore } from '../stores/chart.store';
import { useSubscriptionStore } from '../stores/subscription.store';

let invalidationPromise: Promise<void> | null = null;

export async function invalidateLocalAuthSession(
  reason: string
): Promise<void> {
  if (invalidationPromise) {
    return invalidationPromise;
  }

  invalidationPromise = (async () => {
    authLogger.warn('Invalidating local auth session', reason);

    try {
      await tokenService.clearToken();
    } catch (error) {
      authLogger.warn(
        'Failed to clear runtime token during auth invalidation',
        error
      );
    }

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      authLogger.warn(
        'Local Supabase sign out during auth invalidation failed',
        error
      );
    }

    await queryClient.cancelQueries();
    queryClient.clear();
    resetInMemoryUserState();
    await Promise.allSettled([
      useAuthStore.persist.clearStorage(),
      useOnboardingStore.persist.clearStorage(),
      useChartStore.persist.clearStorage(),
      useSubscriptionStore.persist.clearStorage(),
    ]);
  })().finally(() => {
    invalidationPromise = null;
  });

  return invalidationPromise;
}
