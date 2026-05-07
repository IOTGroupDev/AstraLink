import { supabase } from './supabase';
import { tokenService } from './tokenService';
import { useAuthStore } from '../stores/auth.store';
import { authLogger } from './logger';

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

    useAuthStore.getState().resetAuth();
  })().finally(() => {
    invalidationPromise = null;
  });

  return invalidationPromise;
}
