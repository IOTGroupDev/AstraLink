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
import { tokenService } from './tokenService';
import { useAuthStore } from '../stores/auth.store';
import { supabaseLogger } from './logger';

const supabaseUrl = Constants.expoConfig?.extra?.SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.SUPABASE_ANON_KEY;

// Validate required Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your environment variables.',
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

let initPromise: Promise<void> | null = null;

export const initSupabaseAuth = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      supabaseLogger.log('🔄 Initializing Supabase auth...');

      // Гарантируем готовность локального стораджа токенов
      await tokenService.init();

      // Берём текущую сессию из Supabase
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        supabaseLogger.error('❌ Session error:', error);
        await tokenService.setToken(null);
        return;
      }

      // Лог + первичная синхронизация токена
      if (data.session) {
        supabaseLogger.log('✅ Session restored:', data.session.user.email);
      } else {
        supabaseLogger.log('ℹ️ No active session');
      }
      await tokenService.setToken(data.session?.access_token ?? null);

      // Синхронизируем Zustand-стор аутентификации до рендера App (чтобы initialRoute не прыгал на онбординг)
      try {
        const st = useAuthStore.getState();
        if (data.session?.user) {
          st.login({
            id: data.session.user.id,
            email: data.session.user.email || '',
            role: 'user',
          });
        } else {
          st.logout();
        }
      } catch (e) {
        supabaseLogger.warn('Auth store sync (initial session) failed:', e);
      }

      // Подписка на изменения auth-состояния: держим tokenService и Zustand-store в актуальном состоянии
      supabase.auth.onAuthStateChange(async (event, session) => {
        const email = session?.user?.email || 'no user';
        supabaseLogger.log('🔄 Auth event:', event, email);

        // синхронизация токена
        await tokenService.setToken(session?.access_token ?? null);

        // синхронизация стора авторизации
        try {
          const st = useAuthStore.getState();
          if (session?.user) {
            st.login({
              id: session.user.id,
              email: session.user.email || '',
              role: 'user',
            });
          } else {
            st.logout();
          }
        } catch (e) {
          supabaseLogger.warn('Auth store sync (onAuthStateChange) failed:', e);
        }
      });

      supabaseLogger.log('✅ Supabase auth initialized');
    } catch (error) {
      supabaseLogger.error('❌ Supabase auth initialization error:', error);
      await tokenService.setToken(null);
    }
  })();

  return initPromise;
};

// Автоматически запускаем инициализацию при импорте, чтобы восстановить сессию и синхронизировать токен
initSupabaseAuth();
