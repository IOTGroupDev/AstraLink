// src/navigation/MainStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OnboardingFirstScreen from '../screens/Onboarding/OnboardingFirstScreen';
import OnboardingSecondScreen from '../screens/Onboarding/OnboardingSecondScreen';
import OnboardingThirdScreen from '../screens/Onboarding/OnboardingThirdScreen';
import OnboardingFourthScreen from '../screens/Onboarding/OnboardingFourthScreen';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  return (
    // <Stack.Navigator
    //   initialRouteName="MainTabs" // ✅ Начинаем сразу с главного экрана
    //   screenOptions={{
    //     headerShown: false,
    //   }}
    // >
    <Stack.Navigator
      initialRouteName="OnboardingLaunch" // ✅ Начинаем с экрана запуска
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Онбординг шаг 1 (первая страница показа) */}
      <Stack.Screen
        name="Onboarding1"
        component={OnboardingFirstScreen}
        options={{ presentation: 'card' }}
      />
      {/* Онбординг шаг 2 */}
      <Stack.Screen
        name="Onboarding2"
        component={OnboardingSecondScreen}
        options={{ presentation: 'card' }}
      />
      {/* Онбординг шаг 3 */}
      <Stack.Screen
        name="Onboarding3"
        component={OnboardingThirdScreen}
        options={{ presentation: 'card' }}
      />
      {/* Онбординг шаг 4 */}
      <Stack.Screen
        name="Onboarding4"
        component={OnboardingFourthScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="EditProfileScreen"
        component={EditProfileScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}
