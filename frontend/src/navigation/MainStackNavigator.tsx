// src/navigation/MainStackNavigator.tsx - С правильной логикой навигации
import React, { useEffect } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OnboardingFirstScreen from '../screens/Onboarding/OnboardingFirstScreen';
import OnboardingSecondScreen from '../screens/Onboarding/OnboardingSecondScreen';
import OnboardingThirdScreen from '../screens/Onboarding/OnboardingThirdScreen';
import OnboardingFourthScreen from '../screens/Onboarding/OnboardingFourthScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import AuthEmailScreen from '../screens/Auth/AuthEmailScreen';
import AuthCallbackScreen from '../screens/Auth/AuthCallbackScreen';
import UserDataLoaderScreen from '../screens/Auth/UserDataLoaderScreen';

import { useAuthStore, useOnboardingCompleted } from '../stores/auth.store';
import OptCodeScreen from '../screens/Auth/OptCodeScreen';
import ChatDialogScreen from '../screens/ChatDialogScreen';
import ChatListScreen from '../screens/ChatListScreen';
import NatalChartScreen from '../screens/NatalChartScreen';
import PersonalCodeScreen from '../screens/PersonalCodeScreen';

const Stack = createStackNavigator<RootStackParamList>();

export default function MainStackNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingCompleted = useOnboardingCompleted();
  const navigation = useNavigation<any>();

  // Определяем начальный экран на основе состояния
  const getInitialRouteName = () => {
    // Если пользователь аутентифицирован, но локальный флаг онбординга еще не установлен —
    // переходим на экран-утилиту, который синхронизирует статус из БД (user_profiles.is_onboarded)
    if (isAuthenticated && !onboardingCompleted) {
      return 'UserDataLoader';
    }
    if (!onboardingCompleted) {
      return 'Onboarding1'; // Показываем онбординг
    }
    if (!isAuthenticated) {
      return 'SignUp'; // Показываем экран входа/регистрации
    }
    return 'MainTabs'; // Показываем главное приложение
  };

  // Реакция на изменение auth/onboarding: жёсткий reset навигации.
  // Это критично для кейса: в AsyncStorage есть токен, но /user/profile -> 401/404/Network Error.
  // После принудительного logout в interceptor нужно вывести пользователя из табов.
  useEffect(() => {
    const target =
      isAuthenticated && !onboardingCompleted
        ? 'UserDataLoader'
        : !onboardingCompleted
          ? 'Onboarding1'
          : !isAuthenticated
            ? 'SignUp'
            : 'MainTabs';
    navigation.reset({ index: 0, routes: [{ name: target }] });
  }, [isAuthenticated, onboardingCompleted, navigation]);

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Auth utility screens - доступны всегда */}
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="UserDataLoader"
        component={UserDataLoaderScreen}
        options={{ presentation: 'card' }}
      />
      {/* Main App Root - регистрируем всегда, чтобы reset('MainTabs') был валиден */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />

      {/* Onboarding & Auth screens — зарегистрированы всегда, чтобы reset/navigate были валидны */}
      <Stack.Screen
        name="Onboarding1"
        component={OnboardingFirstScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="Onboarding2"
        component={OnboardingSecondScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="Onboarding3"
        component={OnboardingThirdScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="Onboarding4"
        component={OnboardingFourthScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="AuthEmail"
        component={AuthEmailScreen}
        options={{ presentation: 'card' }}
      />
      {/*<Stack.Screen
        name="MagicLinkWaiting"
        component={MagicLinkWaitingScreen}
        options={{ presentation: 'card' }}
      />*/}
      <Stack.Screen
        name="OptCode"
        component={OptCodeScreen}
        options={{ presentation: 'card' }}
      />

      {/* Main App Flow */}
      {isAuthenticated && (
        <>
          {/* MainTabs зарегистрирован всегда выше */}
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              presentation: 'card',
            }}
          />
          {/*<Stack.Screen*/}
          {/*  name="EditProfileScreen"*/}
          {/*  component={EditProfileScreen}*/}
          {/*  options={{*/}
          {/*    presentation: 'modal',*/}
          {/*    cardStyle: { backgroundColor: 'transparent' },*/}
          {/*  }}*/}
          {/*/> */}
          <Stack.Screen
            name="EditProfileScreen"
            component={EditProfileScreen}
            options={{
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="ChatDialog"
            component={ChatDialogScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen
            name="NatalChart"
            component={NatalChartScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="PersonalCode"
            component={PersonalCodeScreen}
            options={{ presentation: 'card' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
