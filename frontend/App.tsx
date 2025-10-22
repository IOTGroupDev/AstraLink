// frontend/App.tsx - С правильным flow и биометрией
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text as RNText } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';

import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';

import SplashScreenComponent from './src/screens/SplashScreen';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import { QueryProvider } from './src/providers/QueryProvider';
import { useAuthStore } from './src/stores/auth.store';
import { tokenService } from './src/services/tokenService';
import { userAPI } from './src/services/api';

// Prevent auto-hide splash
SplashScreen.preventAutoHideAsync();

import * as Linking from 'expo-linking';

// Конфигурация deep linking
const linking = {
  prefixes: [
    'astralink://', // для мобильных
    'http://localhost:8081', // для web dev
    'http://localhost:19006', // для web dev (альтернативный порт)
    'https://yourdomain.com', // для production
  ],
  config: {
    screens: {
      // Onboarding
      Onboarding1: 'onboarding/1',
      Onboarding2: 'onboarding/2',
      Onboarding3: 'onboarding/3',
      Onboarding4: 'onboarding/4',

      // Auth
      SignUp: 'signup',
      AuthEmail: 'auth/email',
      MagicLinkWaiting: 'auth/waiting',
      AuthCallback: 'auth/callback', // 👈 Важно!

      // Main
      MainTabs: {
        path: '',
        screens: {
          Home: 'home',
          Profile: 'profile',
          // ... другие табы
        },
      },
    },
  },
};

export default function App() {
  const {
    isAuthenticated,
    initializing,
    onboardingCompleted,
    initialize,
    setUser,
    logout,
  } = useAuthStore();

  const [appReady, setAppReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Глобально задаём шрифт по умолчанию для Text
      // @ts-ignore
      RNText.defaultProps = RNText.defaultProps || {};
      // @ts-ignore
      RNText.defaultProps.style = [
        RNText.defaultProps.style,
        { fontFamily: 'Montserrat_400Regular' },
      ];
    }
  }, [fontsLoaded]);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Инициализируем auth store (загружаем настройки)
      await initialize();

      // Проверяем токен и восстанавливаем сессию
      const token = await tokenService.getToken();
      if (token) {
        try {
          // Подтверждаем валидность токена запросом профиля
          const user = await userAPI.getProfile();
          setUser(user);
          console.log('✅ Session restored:', user.email);
        } catch (error) {
          console.log('❌ Token invalid, logging out');
          logout();
        }
      }
    } catch (error) {
      console.error('App initialization error:', error);
    } finally {
      setAppReady(true);
      // Hide splash screen
      setTimeout(() => {
        SplashScreen.hideAsync();
      }, 500);
    }
  };

  // Показываем splash пока загружаются шрифты или идет инициализация
  if (!fontsLoaded || !appReady || initializing) {
    return <SplashScreenComponent />;
  }

  return (
    <QueryProvider>
      <StatusBar style="light" />
      <NavigationContainer>
        <MainStackNavigator />
      </NavigationContainer>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
