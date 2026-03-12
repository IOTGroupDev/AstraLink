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

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { NavigationTheme } from './src/navigation/navigationConfig';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './src/stores/auth.store';
import { AuthEngine } from './src/services/authEngine';
import SplashScreen from './src/screens/SplashScreen';
import { logger } from './src/services/logger';
import { enableScreens } from 'react-native-screens';

enableScreens(true);

const queryClient = new QueryClient();

export default function App() {
  const authState = useAuthStore((s) => s.authState);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
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
        logger.log('Auth engine initialized');
      } catch (err) {
        logger.error('App initialization error:', err);
      }
    })();
  }, []);

  if (authState === 'BOOT' || isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <QueryClientProvider client={queryClient}>
        <NavigationContainer theme={NavigationTheme}>
          <MainStackNavigator />
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
