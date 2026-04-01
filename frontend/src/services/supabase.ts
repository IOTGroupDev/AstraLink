// // src/services/supabase.ts
// // Клиент Supabase + синхронизация access_token ↔ tokenService.
//
// import { createClient } from '@supabase/supabase-js';
// import Constants from 'expo-constants';
// import { tokenService } from './tokenService';
//
// // В app.json (expo.extra) должны быть SUPABASE_URL и SUPABASE_ANON_KEY
// const supabaseUrl =
//   Constants.expoConfig?.extra?.SUPABASE_URL ||
//   'https://ayoucajwdyinyhamousz.supabase.co';
//
// const supabaseAnonKey =
//   Constants.expoConfig?.extra?.SUPABASE_ANON_KEY ||
//   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5b3VjYWp3ZHlpbnloYW1vdXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MDcyMDcsImV4cCI6MjA3NDI4MzIwN30.S-JOt3sVAEzbZTIEJrHDsKthp3pA5wGsyNEfHfeOrHo';
//
// if (!supabaseUrl || !supabaseAnonKey) {
//   console.warn(
//     '⚠️ SUPABASE_URL или SUPABASE_ANON_KEY не заданы в app.json -> expo.extra'
//   );
// }
//
// console.log('🔐 Инициализация Supabase клиента');
// console.log('📍 URL:', supabaseUrl);
//
// export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
//   auth: {
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: true,
//     // storage по умолчанию корректно работает в web через localStorage
//   },
// });
//
// // Bootstrap-процедура: дожидаемся tokenService.init(), затем подтягиваем сессию
// let initPromise: Promise<void> | null = null;
//
// export const initSupabaseSync = async () => {
//   if (initPromise) return initPromise;
//
//   initPromise = (async () => {
//     try {
//       console.log('🔄 Initializing Supabase sync...');
//
//       // Инициализируем tokenService
//       await tokenService.init();
//
//       // Получаем текущую сессию из Supabase
//       const { data } = await supabase.auth.getSession();
//       const access = data.session?.access_token ?? null;
//
//       // Синхронизируем с tokenService
//       await tokenService.setToken(access);
//
//       // Подписываемся на изменения auth в Supabase
//       supabase.auth.onAuthStateChange(async (_event, session) => {
//         const accessToken = session?.access_token ?? null;
//         console.log(
//           '🔄 Auth state changed:',
//           _event,
//           accessToken ? 'token present' : 'no token'
//         );
//         await tokenService.setToken(accessToken);
//       });
//
//       console.log('✅ Supabase sync initialized');
//     } catch (error) {
//       console.error('❌ Supabase sync initialization error:', error);
//       await tokenService.setToken(null);
//     }
//   })();
//
//   return initPromise;
// };
//
// // Автоматически запускаем инициализацию при импорте
// initSupabaseSync();

// src/services/supabase.ts (активная реализация)
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabaseLogger } from './logger';
import { tokenService } from './tokenService';

const env: any =
  (typeof process !== 'undefined' ? (process as any).env : {}) || {};
const expoExtra: any = Constants?.expoConfig?.extra || {};

const supabaseUrl =
  env.EXPO_PUBLIC_SUPABASE_URL || expoExtra.SUPABASE_URL || env.SUPABASE_URL;

const supabaseAnonKey =
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  expoExtra.SUPABASE_ANON_KEY ||
  env.SUPABASE_ANON_KEY;

// Validate required Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.'
  );
}

supabaseLogger.log('🔐 Инициализация Supabase клиента');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
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
