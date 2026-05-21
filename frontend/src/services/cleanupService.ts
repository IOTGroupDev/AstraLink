// src/services/cleanupService.ts
// Service for complete cleanup of user data on account deletion

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { tokenService } from './tokenService';
import { storageLogger } from './logger';
import { useAuthStore } from '../stores/auth.store';
import { useOnboardingStore } from '../stores/onboarding.store';
import { useChartStore } from '../stores/chart.store';
import { useSubscriptionStore } from '../stores/subscription.store';

const CLEANUP_OPERATION_TIMEOUT_MS = 2500;
let activeUserDataCleanupPromise: Promise<void> | null = null;

const withCleanupTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T | undefined> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeoutId = setTimeout(() => {
          storageLogger.warn(`${label} timed out during cleanup`);
          resolve(undefined);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const getSupabaseUrlCandidates = (): string[] => {
  const env: any =
    (typeof process !== 'undefined' ? (process as any).env : {}) || {};
  const expoExtra: any = Constants?.expoConfig?.extra || {};

  return [
    env.EXPO_PUBLIC_SUPABASE_URL,
    expoExtra.EXPO_PUBLIC_SUPABASE_URL,
    expoExtra.SUPABASE_URL,
    env.SUPABASE_URL,
  ].filter(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0
  );
};

export const getSupabaseSecureKeysForCleanup = (
  urlCandidates: string[] = getSupabaseUrlCandidates()
): string[] => {
  const projectRefs = new Set<string>();

  for (const supabaseUrl of urlCandidates) {
    try {
      const host = new URL(supabaseUrl).hostname;
      const projectRef = host.split('.')[0];
      if (projectRef) {
        projectRefs.add(projectRef);
      }
    } catch {
      // Ignore invalid URL candidates.
    }
  }

  return Array.from(projectRefs).flatMap((projectRef) => {
    const baseKey = `sb-${projectRef}-auth-token`;
    return [baseKey, `${baseKey}-code-verifier`, `${baseKey}-user`];
  });
};

export const resetInMemoryUserState = (): void => {
  useAuthStore.getState().resetAuth();
  useOnboardingStore.getState().reset();
  useChartStore.setState({
    natalChart: null,
    currentTransits: null,
    predictions: null,
    isLoading: false,
    error: null,
  });
  useSubscriptionStore.setState({
    subscription: null,
    isLoading: false,
    error: null,
  });
};

export const clearSupabaseLocalAuthData = async (): Promise<void> => {
  try {
    const { supabase } = await import('./supabase');
    await withCleanupTimeout(
      supabase.auth.signOut({ scope: 'local' }),
      CLEANUP_OPERATION_TIMEOUT_MS,
      'Local Supabase sign out'
    );
  } catch (error) {
    storageLogger.warn('Local Supabase sign out during cleanup failed:', error);
  }

  try {
    await tokenService.clearToken();
  } catch (error) {
    storageLogger.warn('Runtime token cleanup failed:', error);
  }

  const secureKeys = getSupabaseSecureKeysForCleanup();

  if (Platform.OS === 'web') {
    const allKeys = await AsyncStorage.getAllKeys();
    const supabaseKeys = allKeys.filter(
      (key) =>
        key.startsWith('sb-') ||
        key.includes('supabase') ||
        secureKeys.includes(key)
    );
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
    }
    return;
  }

  await Promise.all(
    secureKeys.map((key) =>
      SecureStore.deleteItemAsync(key).catch(() => undefined)
    )
  );
};

export const waitForUserDataCleanup = async (
  timeoutMs = CLEANUP_OPERATION_TIMEOUT_MS
): Promise<void> => {
  const cleanupPromise = activeUserDataCleanupPromise;
  if (!cleanupPromise) {
    return;
  }

  await withCleanupTimeout(
    cleanupPromise,
    timeoutMs,
    'Waiting for user data cleanup'
  );
};

/**
 * Performs complete cleanup of all user data from local storage
 * This should be called when user deletes their account or explicitly logs out with data cleanup
 */
export const clearAllUserData = async (): Promise<void> => {
  if (activeUserDataCleanupPromise) {
    await activeUserDataCleanupPromise;
    return;
  }

  activeUserDataCleanupPromise = (async () => {
    try {
      storageLogger.log('Starting complete user data cleanup...');

      // 0. Clear current in-memory Zustand state. Removing storage is not enough
      // while the app process keeps running after account deletion.
      resetInMemoryUserState();

      // 0.1 Clear Supabase auth runtime/storage explicitly. This protects the
      // next login after account deletion from reusing a deleted local session.
      await clearSupabaseLocalAuthData();

      // 1. Clear tokenService data (token + settings)
      await tokenService.clearAll();

      // 2. Clear all Zustand persist stores
      const zustandKeys = [
        'auth-storage',
        'chart-storage',
        'subscription-storage',
        'onboarding-storage',
      ];

      await AsyncStorage.multiRemove(zustandKeys);

      // 3. Clear all user-scoped AsyncStorage keys (including legacy keys)
      const allKeys = await AsyncStorage.getAllKeys();
      const removablePrefixes = [
        'sb-',
        'auth-',
        'onboarding-',
        'chart-',
        'subscription-',
        'al_',
        'horoscope-screen:',
        'advisor-history:',
        'advisor-history-hint:',
        '@astralink/profile-photo:',
        'notifications:',
      ];
      const keysToRemove = allKeys.filter(
        (key) =>
          removablePrefixes.some((prefix) => key.startsWith(prefix)) ||
          key === 'auth-storage' ||
          key === 'chart-storage' ||
          key === 'subscription-storage' ||
          key === 'onboarding-storage'
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // 4. Clear known secure native keys that do not live in AsyncStorage
      if (Platform.OS !== 'web') {
        const secureKeys = [
          'al_token_secure',
          'onboarding-storage',
          'notifications:last-expo-push-token',
          'notifications:last-user-id',
          ...getSupabaseSecureKeysForCleanup(),
        ].filter((key) => typeof key === 'string' && key.trim().length > 0);
        await Promise.all(
          secureKeys.map((key) =>
            SecureStore.deleteItemAsync(key).catch(() => undefined)
          )
        );
      }

      storageLogger.log('✅ Complete user data cleanup successful');
    } catch (error) {
      storageLogger.error('Error during complete data cleanup:', error);
      // Even if cleanup fails, we should continue with logout
      // The error is logged for debugging purposes
    } finally {
      activeUserDataCleanupPromise = null;
    }
  })();

  await activeUserDataCleanupPromise;
};

/**
 * List all AsyncStorage keys (for debugging)
 */
export const listAllStorageKeys = async (): Promise<string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    storageLogger.log('AsyncStorage keys:', keys);
    return [...keys];
  } catch (error) {
    storageLogger.error('Error listing storage keys:', error);
    return [];
  }
};
