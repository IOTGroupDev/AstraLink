// src/services/cleanupService.ts
// Service for complete cleanup of user data on account deletion

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { tokenService } from './tokenService';
import { storageLogger } from './logger';

const getSupabaseSecureKeys = (): string[] => {
  const env: any =
    (typeof process !== 'undefined' ? (process as any).env : {}) || {};
  const expoExtra: any = Constants?.expoConfig?.extra || {};
  const supabaseUrl =
    env.EXPO_PUBLIC_SUPABASE_URL || expoExtra.SUPABASE_URL || env.SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    if (!projectRef) {
      return [];
    }

    const baseKey = `sb-${projectRef}-auth-token`;
    return [baseKey, `${baseKey}-code-verifier`, `${baseKey}-user`];
  } catch {
    return [];
  }
};

/**
 * Performs complete cleanup of all user data from local storage
 * This should be called when user deletes their account or explicitly logs out with data cleanup
 */
export const clearAllUserData = async (): Promise<void> => {
  try {
    storageLogger.log('Starting complete user data cleanup...');

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
        'onboarding-storage',
        'notifications:last-expo-push-token',
        'notifications:last-user-id',
        ...getSupabaseSecureKeys(),
      ];
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
  }
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
