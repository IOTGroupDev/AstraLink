// src/services/supabase.ts (активная реализация)
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabaseLogger } from './logger';
import { tokenService } from './tokenService';

const env: any =
  (typeof process !== 'undefined' ? (process as any).env : {}) || {};
const expoExtra: any = Constants?.expoConfig?.extra || {};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  expoExtra.SUPABASE_URL ||
  env.SUPABASE_URL;

const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY;

// Validate required Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
  );
}

supabaseLogger.log('🔐 Инициализация Supabase клиента');

const isValidSecureKey = (key: string | null | undefined): key is string =>
  typeof key === 'string' && key.trim().length > 0;

const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    if (!isValidSecureKey(key)) {
      return null;
    }

    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    const secure = await SecureStore.getItemAsync(key);
    if (secure !== null) return secure;
    // One-way migration for installations that persisted Supabase in AsyncStorage.
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null) {
      await SecureStore.setItemAsync(key, legacy);
      await AsyncStorage.removeItem(key);
    }
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (!isValidSecureKey(key)) {
      return;
    }

    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
    await AsyncStorage.removeItem(key);
  },
  async removeItem(key: string): Promise<void> {
    if (!isValidSecureKey(key)) {
      return;
    }

    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await Promise.all([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseAuthStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

let tokenSyncInitPromise: Promise<void> | null = null;

async function initSupabaseTokenSync(): Promise<void> {
  if (tokenSyncInitPromise) {
    return tokenSyncInitPromise;
  }

  tokenSyncInitPromise = (async () => {
    try {
      await tokenService.init();

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        supabaseLogger.warn('Failed to read initial Supabase session', error);
      }

      await tokenService.setToken(data.session?.access_token ?? null);

      supabase.auth.onAuthStateChange(async (event, session) => {
        supabaseLogger.log(
          'Supabase auth state changed:',
          event,
          session?.access_token ? 'token present' : 'no token'
        );

        try {
          await tokenService.setToken(session?.access_token ?? null);
        } catch (syncError) {
          supabaseLogger.warn(
            'Failed to sync auth token to tokenService',
            syncError
          );
        }
      });
    } catch (error) {
      supabaseLogger.error('Supabase token sync initialization failed', error);
      try {
        await tokenService.setToken(null);
      } catch {
        // ignore follow-up cleanup errors
      }
    }
  })();

  return tokenSyncInitPromise;
}

void initSupabaseTokenSync();
