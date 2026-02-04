// src/navigation/MainStackNavigator.tsx
import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import OptCodeScreen from '../screens/Auth/OptCodeScreen';
import ChatDialogScreen from '../screens/ChatDialogScreen';
import ChatListScreen from '../screens/ChatListScreen';
import NatalChartScreen from '../screens/NatalChartScreen';
import PersonalCodeScreen from '../screens/PersonalCodeScreen';

import { useAuthStore, useOnboardingCompleted } from '../stores/auth.store';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function MainStackNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingCompleted = useOnboardingCompleted();
  const navigation = useNavigation<any>();

  const getInitialRouteName = () => {
    if (isAuthenticated && !onboardingCompleted) return 'UserDataLoader';
    if (!onboardingCompleted) return 'Onboarding1';
    if (!isAuthenticated) return 'SignUp';
    return 'MainTabs';
  };

  useEffect(() => {
    const currentState = navigation.getState();
    if (!currentState?.routes?.length) return;

    const currentRoute =
      currentState.routes[currentState.index]?.name || 'Unknown';

    const target =
      isAuthenticated && !onboardingCompleted
        ? 'UserDataLoader'
        : !onboardingCompleted
          ? 'Onboarding1'
          : !isAuthenticated
            ? 'SignUp'
            : 'MainTabs';

    if (currentRoute !== target) {
      navigation.reset({ index: 0, routes: [{ name: target }] });
    }
  }, [isAuthenticated, onboardingCompleted, navigation]);

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,

        // Оптимизация анимаций
        animation: 'slide_from_right',
        animationDuration: 200, // Быстрее стандартных 300ms

        // Плавные жесты
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        gestureDirection: 'horizontal',

        // КРИТИЧНО: Единый цвет фона для всех экранов
        contentStyle: {
          backgroundColor: '#0F172A', // Тот же цвет, что и в табах
        },

        // Оптимизация производительности
        freezeOnBlur: true,

        // Убираем тени и эффекты
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{
          animation: 'none', // Без анимации для технических экранов
        }}
      />
      <Stack.Screen
        name="UserDataLoader"
        component={UserDataLoaderScreen}
        options={{
          animation: 'fade',
        }}
      />

      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          animation: 'none', // Без анимации для перехода к табам
        }}
      />

      <Stack.Screen name="Onboarding1" component={OnboardingFirstScreen} />
      <Stack.Screen name="Onboarding2" component={OnboardingSecondScreen} />
      <Stack.Screen name="Onboarding3" component={OnboardingThirdScreen} />
      <Stack.Screen name="Onboarding4" component={OnboardingFourthScreen} />

      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
      <Stack.Screen name="OptCode" component={OptCodeScreen} />

      {isAuthenticated && (
        <>
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="EditProfileScreen"
            component={EditProfileScreen}
          />
          <Stack.Screen name="ChatDialog" component={ChatDialogScreen} />
          <Stack.Screen name="ChatList" component={ChatListScreen} />
          <Stack.Screen name="NatalChart" component={NatalChartScreen} />
          <Stack.Screen name="PersonalCode" component={PersonalCodeScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
