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
import CosmicSimulatorScreen from '../screens/CosmicSimulatorScreen';
import LearningScreen from '../screens/LearningScreen';
import DatingProfileScreen from '../screens/DatingProfileScreen';

import { useAuthState } from '../stores/auth.store';

const Stack = createNativeStackNavigator<RootStackParamList>();

const resolveRoute = (state: string) => {
  switch (state) {
    case 'AUTHORIZED':
      return 'MainTabs';
    case 'ONBOARDING':
      return 'Onboarding1';
    case 'UNAUTHORIZED':
    default:
      return 'SignUp';
  }
};

export default function MainStackNavigator() {
  const authState = useAuthState();
  const target = resolveRoute(authState);

  return (
    <Stack.Navigator
      key={target}
      initialRouteName={target}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        fullScreenGestureEnabled: false,
        gestureResponseDistance: {
          start: 24,
        },
        gestureDirection: 'horizontal',
        contentStyle: {
          backgroundColor: '#080E1C',
        },
        freezeOnBlur: true,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="AuthCallback"
        component={AuthCallbackScreen}
        options={{
          animation: 'none',
        }}
      />

      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{
          animation: 'none',
        }}
      />

      <Stack.Screen name="Onboarding1" component={OnboardingFirstScreen} />
      <Stack.Screen name="Onboarding2" component={OnboardingSecondScreen} />
      <Stack.Screen name="Onboarding3" component={OnboardingThirdScreen} />
      <Stack.Screen name="Onboarding4" component={OnboardingFourthScreen} />

      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
      <Stack.Screen name="OptCode" component={OptCodeScreen} />

      {authState === 'AUTHORIZED' && (
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
        </>
      )}
    </Stack.Navigator>
  );
}
