import 'react-native-reanimated';
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import './src/utils/disableConsole'; // Disable console in production

import { TextEncoder, TextDecoder } from 'text-encoding';
if (typeof globalThis.TextEncoder === 'undefined')
  (globalThis as any).TextEncoder = TextEncoder;
if (typeof globalThis.TextDecoder === 'undefined')
  (globalThis as any).TextDecoder = TextDecoder;

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View, Text } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { initSupabaseAuth } from './src/services/supabase';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { userExtendedProfileAPI } from './src/services/api';
import { useAuthStore } from './src/stores/auth.store';
import { logger } from './src/services/logger';
import { enableScreens } from 'react-native-screens';
enableScreens(true);

const queryClient = new QueryClient();

export default function App() {
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);

  useEffect(() => {
    (async () => {
      try {
        logger.log('Starting app initialization...');

        // Add timeout to prevent indefinite hanging
        const initTimeout = setTimeout(() => {
          logger.warn('App initialization timeout - continuing anyway');
          setBooted(true);
        }, 10000); // 10 second timeout

        try {
          const { i18nReady } = await import('./src/i18n');
          await i18nReady;
          logger.log('i18n initialized');
        } catch (i18nErr) {
          logger.error('i18n initialization failed:', i18nErr);
          // Continue anyway - app can work without i18n
        }

        try {
          // Инициализируем Supabase (который инициализирует tokenService внутри)
          await initSupabaseAuth();
          logger.log('Supabase auth initialized');
        } catch (supabaseErr) {
          logger.error('Supabase initialization failed:', supabaseErr);
          // Continue - user will be logged out but app should work
        }

        // Проверяем, авторизован ли пользователь перед загрузкой профиля
        const { isAuthenticated } = useAuthStore.getState();

        // После восстановления сессии пробуем подтянуть флаг онбординга из БД
        // чтобы навигация не отправляла на онбординг при повторной авторизации
        // ВАЖНО: делаем это ТОЛЬКО для авторизованных пользователей
        if (isAuthenticated) {
          try {
            const ext = await userExtendedProfileAPI.getUserProfile();
            if (ext?.is_onboarded === true) {
              await setOnboardingCompleted(true);
              logger.log('Onboarding flag synced from DB (is_onboarded=true)');
            }
          } catch (syncErr) {
            logger.log(
              'Onboarding flag sync skipped:',
              syncErr?.message || syncErr
            );
          }
        } else {
          logger.log('User not authenticated, skipping profile sync');
        }

        clearTimeout(initTimeout);
        logger.log('App initialization complete');
      } catch (err) {
        logger.error('App initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Even if there's an error, boot the app after a delay
        setTimeout(() => setBooted(true), 2000);
      } finally {
        setBooted(true);
      }
    })();
  }, [setOnboardingCompleted]);

  if (!booted) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
            Загрузка приложения...
          </Text>
          {error && (
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: '#ef4444',
                textAlign: 'center',
              }}
            >
              Ошибка: {error}
            </Text>
          )}
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <MainStackNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
