// frontend/src/navigation/MainStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import Onboarding1Screen from '../screens/Onboarding1Screen';
import Onboarding2Screen from '../screens/Onboarding2Screen';

const Stack = createStackNavigator();

/**
 * Главный навигатор приложения
 * Включает TabNavigator и модальные экраны (Subscription, EditProfile)
 */
export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding1"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        presentation: 'transparentModal',
      }}
    >
      {/* Онбординг шаг 1 (первая страница показа) */}
      <Stack.Screen
        name="Onboarding1"
        component={Onboarding1Screen}
        options={{ presentation: 'card' }}
      />
      {/* Онбординг шаг 2 */}
      <Stack.Screen
        name="Onboarding2"
        component={Onboarding2Screen}
        options={{ presentation: 'card' }}
      />
      {/* Основной экран с табами */}
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ presentation: 'card' }}
      />

      {/* Модальный экран подписок */}
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />

      {/* Модальный экран редактирования профиля */}
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
