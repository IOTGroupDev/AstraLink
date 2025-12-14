// src/services/cleanupService.ts
// Service for complete cleanup of user data on account deletion

import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenService } from './tokenService';
import { supabase } from './supabase';
import { storageLogger } from './logger';

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

    // 3. Sign out from Supabase (clears session)
    await supabase.auth.signOut();

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
    return keys;
  } catch (error) {
    storageLogger.error('Error listing storage keys:', error);
    return [];
  }
};
