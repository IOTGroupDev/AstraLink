// src/navigation/MainStackNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import OptCodeScreen from '../screens/Auth/OptCodeScreen';
import ChatDialogScreen from '../screens/ChatDialogScreen';
import ChatListScreen from '../screens/ChatListScreen';
import NatalChartScreen from '../screens/NatalChartScreen';
import PersonalCodeScreen from '../screens/PersonalCodeScreen';
import CompatibilityScreen from '../screens/CompatibilityScreen';
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import LearningScreen from '../screens/LearningScreen';
import DatingProfileScreen from '../screens/DatingProfileScreen';

import { useAuthState } from '../stores/auth.store';

const Stack = createNativeStackNavigator<RootStackParamList>();

const defaultScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right' as const,
  animationDuration: 200,
  gestureEnabled: true,
  fullScreenGestureEnabled: false,
  gestureResponseDistance: {
    start: 24,
  },
  gestureDirection: 'horizontal' as const,
  contentStyle: {
    backgroundColor: '#080E1C',
  },
  freezeOnBlur: true,
  headerShadowVisible: false,
};

export default function MainStackNavigator() {
  const authState = useAuthState();

  if (authState === 'AUTHORIZED') {
    return (
      <Stack.Navigator key="authorized" screenOptions={defaultScreenOptions}>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{
            animation: 'none',
          }}
        />

        <Stack.Screen
          name="Subscription"
          component={SubscriptionScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="EditProfileScreen" component={EditProfileScreen} />
        <Stack.Screen
          name="CosmicSimulator"
          component={CosmicSimulatorScreen}
        />
        <Stack.Screen name="Learning" component={LearningScreen} />
        <Stack.Screen name="DatingProfile" component={DatingProfileScreen} />
        <Stack.Screen name="ChatDialog" component={ChatDialogScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="NatalChart" component={NatalChartScreen} />
        <Stack.Screen name="PersonalCode" component={PersonalCodeScreen} />
        <Stack.Screen name="Compatibility" component={CompatibilityScreen} />
      </Stack.Navigator>
    );
  }

  if (authState === 'ONBOARDING') {
    return (
      <Stack.Navigator
        key="onboarding"
        initialRouteName="Onboarding2"
        screenOptions={defaultScreenOptions}
      >
        <Stack.Screen name="Onboarding2" component={OnboardingSecondScreen} />
        <Stack.Screen name="Onboarding3" component={OnboardingThirdScreen} />
        <Stack.Screen name="Onboarding4" component={OnboardingFourthScreen} />
        <Stack.Screen name="Onboarding1" component={OnboardingFirstScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator key="unauthorized" screenOptions={defaultScreenOptions}>
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
      <Stack.Screen name="OptCode" component={OptCodeScreen} />
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{
          animation: 'none',
        }}
      />
    </Stack.Navigator>
  );
}
