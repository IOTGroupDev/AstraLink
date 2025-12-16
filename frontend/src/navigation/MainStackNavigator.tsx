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

        // Нативная анимация, максимально iOS-like
        animation: 'slide_from_right',
        gestureEnabled: true,

        // Обычно помогает от артефактов на iOS
        contentStyle: { backgroundColor: 'transparent' }, // если будет мигать — поставь твой базовый цвет
      }}
    >
      <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      <Stack.Screen name="UserDataLoader" component={UserDataLoaderScreen} />

      <Stack.Screen name="MainTabs" component={TabNavigator} />

      <Stack.Screen name="Onboarding1" component={OnboardingFirstScreen} />
      <Stack.Screen name="Onboarding2" component={OnboardingSecondScreen} />
      <Stack.Screen name="Onboarding3" component={OnboardingThirdScreen} />
      <Stack.Screen name="Onboarding4" component={OnboardingFourthScreen} />

      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
      <Stack.Screen name="OptCode" component={OptCodeScreen} />

      {isAuthenticated && (
        <>
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
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
