// frontend/src/navigation/MainStackNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import { ROUTES } from './routes';

const Stack = createStackNavigator();

/**
 * Главный навигатор приложения
 * Включает TabNavigator и модальные экраны (Subscription, EditProfile)
 */
export default function MainStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        presentation: 'transparentModal',
      }}
    >
      {/* Основной экран с табами */}
      <Stack.Screen
        name={ROUTES.STACK.MAIN_TABS}
        component={TabNavigator}
        options={{ presentation: 'card' }}
      />

      {/* Модальный экран подписок */}
      <Stack.Screen
        name={ROUTES.STACK.SUBSCRIPTION}
        component={SubscriptionScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />

      {/* Модальный экран редактирования профиля */}
      <Stack.Screen
        name={ROUTES.STACK.EDIT_PROFILE}
        component={EditProfileScreen}
        options={{
          presentation: 'modal',
          cardStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack.Navigator>
  );
}
