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

import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, View } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { NavigationTheme } from './src/navigation/navigationConfig';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/stores/auth.store';
import { AuthEngine } from './src/services/authEngine';
import { notificationService } from './src/services/notifications';
import { logger } from './src/services/logger';
import { enableScreens } from 'react-native-screens';
import { TopStatusBarFade } from './src/components/shared/TopStatusBarFade';
import FullscreenLoadingScreen from './src/components/shared/FullscreenLoadingScreen';
import { chartAPI, subscriptionAPI, userAPI } from './src/services/api';
import i18n from './src/i18n';

enableScreens(true);

const STARTUP_SPLASH_MIN_MS = 1600;

const queryClient = new QueryClient();

const normalizeAppLocale = (locale?: string): 'ru' | 'en' | 'es' => {
  const normalized = String(locale || 'en').toLowerCase();
  if (normalized.startsWith('ru')) return 'ru';
  if (normalized.startsWith('es')) return 'es';
  return 'en';
};

export default function App() {
  const authState = useAuthStore((s) => s.authState);
  const isLoading = useAuthStore((s) => s.isLoading);
  const session = useAuthStore((s) => s.session);
  const [startupSplashReady, setStartupSplashReady] = useState(false);
  const prefetchedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setStartupSplashReady(true);
    }, STARTUP_SPLASH_MIN_MS);

    (async () => {
      try {
        logger.log('Starting app initialization...');
        try {
          const { i18nReady } = await import('./src/i18n');
          await i18nReady;
          logger.log('i18n initialized');
        } catch (i18nErr) {
          logger.error('i18n initialization failed:', i18nErr);
        }

        await AuthEngine.init();
        await notificationService.init();
        logger.log('Auth engine initialized');
      } catch (err) {
        logger.error('App initialization error:', err);
      }
    })();

    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;

    if (authState !== 'AUTHORIZED' || !userId) {
      return;
    }

    if (prefetchedUserIdRef.current === userId) {
      return;
    }

    prefetchedUserIdRef.current = userId;

    const locale = normalizeAppLocale(i18n.language);

    void Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: ['profile'],
        queryFn: userAPI.getProfile,
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: ['subscription'],
        queryFn: subscriptionAPI.getStatus,
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: ['natalChart'],
        queryFn: chartAPI.getNatalChart,
        staleTime: 1000 * 60 * 10,
      }),
      queryClient.prefetchQuery({
        queryKey: ['horoscopeBundle', locale],
        queryFn: () => chartAPI.getAllHoroscopes(locale),
        staleTime: 1000 * 60 * 5,
      }),
      queryClient.prefetchQuery({
        queryKey: ['moonPhase', i18n.language],
        queryFn: () => chartAPI.getMoonPhase(undefined, locale),
        staleTime: 1000 * 60 * 60,
      }),
    ]).catch((err) => {
      logger.warn('Startup data prefetch failed:', err);
    });
  }, [authState, session?.user?.id]);

  useEffect(() => {
    const userId = session?.user?.id;
    const isAuthorized =
      authState === 'AUTHORIZED' || authState === 'ONBOARDING';

    if (!isAuthorized || !userId) {
      return;
    }

    void notificationService.syncAuthenticatedPushToken(userId);
  }, [authState, session?.user?.id]);

  if (authState === 'BOOT' || isLoading || !startupSplashReady) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#080E1C" />
        <FullscreenLoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <QueryClientProvider client={queryClient}>
        <View style={styles.root}>
          <NavigationContainer theme={NavigationTheme}>
            <MainStackNavigator />
          </NavigationContainer>
          <TopStatusBarFade />
        </View>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
