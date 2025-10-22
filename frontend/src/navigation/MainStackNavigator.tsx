// src/navigation/MainStackNavigator.tsx - С правильной логикой навигации
// import React from 'react';
// import { createStackNavigator } from '@react-navigation/stack';
//
// import TabNavigator from './TabNavigator';
// import SubscriptionScreen from '../screens/SubscriptionScreen';
// import EditProfileScreen from '../screens/EditProfileScreen';
// import OnboardingFirstScreen from '../screens/Onboarding/OnboardingFirstScreen';
// import OnboardingSecondScreen from '../screens/Onboarding/OnboardingSecondScreen';
// import OnboardingThirdScreen from '../screens/Onboarding/OnboardingThirdScreen';
// import OnboardingFourthScreen from '../screens/Onboarding/OnboardingFourthScreen';
// import WelcomeScreen from '../screens/WelcomeScreen';
// import SignUpScreen from '../screens/Auth/SignUpScreen';
//
// import { useAuthStore, useOnboardingCompleted } from '../stores/auth.store';
// import OnboardingLaunchScreen from '../screens/swap/OnboardingLaunchScreen';
// import HoroscopeScreen from '../screens/HoroscopeScreen';
// import AuthEmailScreen from '../screens/Auth/AuthEmailScreen';
// import MagicLinkWaitingScreen from '../screens/Auth/MagicLinkWaitingScreen';
//
// const Stack = createStackNavigator();
//
// export default function MainStackNavigator() {
//   const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
//   const onboardingCompleted = useOnboardingCompleted();
//
//   // Определяем начальный экран на основе состояния
//   const getInitialRouteName = () => {
//     if (!onboardingCompleted) {
//       return 'Onboarding1'; // Показываем онбординг
//     }
//     if (!isAuthenticated) {
//       return 'Login'; // Показываем логин
//     }
//     return 'MainTabs'; // Показываем главное приложение
//   };
//
//   return (
//     <Stack.Navigator
//       initialRouteName={getInitialRouteName()}
//       screenOptions={{
//         headerShown: false,
//         cardStyle: { backgroundColor: 'transparent' },
//       }}
//     >
//        {/*Onboarding Flow*/}
//       {!onboardingCompleted && (
//         <>
//           {/*<Stack.Screen*/}
//           {/*  name="welcome"*/}
//           {/*  component={WelcomeScreen}*/}
//           {/*  options={{ presentation: 'card' }}*/}
//           {/*/>*/}
//           <Stack.Screen
//             name="Onboarding1"
//             component={OnboardingFirstScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="Onboarding2"
//             component={OnboardingSecondScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="Onboarding3"
//             component={OnboardingThirdScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="Onboarding4"
//             component={OnboardingFourthScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="SignUp"
//             component={SignUpScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="AuthEmail"
//             component={AuthEmailScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="MagicLinkWaiting"
//             component={MagicLinkWaitingScreen}
//             options={{ presentation: 'card' }}
//           />
//         </>
//       )}
//
//        {/*Auth Flow*/}
//       {!isAuthenticated && onboardingCompleted && (
//         <>
//           {/*<Stack.Screen*/}
//           {/*  name="Login"*/}
//           {/*  component={WelcomeScreen}*/}
//           {/*  options={{ presentation: 'card' }}*/}
//           {/*/>*/}
//           <Stack.Screen
//             name="SignUp"
//             component={SignUpScreen}
//             options={{ presentation: 'card' }}
//           />
//           <Stack.Screen
//             name="Registration1"
//             component={OnboardingFourthScreen}
//             options={{ presentation: 'card' }}
//           />
//         </>
//       )}
//
//        {/*Main App Flow*/}
//       {isAuthenticated && (
//         <>
//           <Stack.Screen name="MainTabs" component={TabNavigator} />
//           <Stack.Screen
//             name="Subscription"
//             component={SubscriptionScreen}
//             options={{
//               presentation: 'modal',
//               cardStyle: { backgroundColor: 'transparent' },
//             }}
//           />
//           <Stack.Screen
//             name="EditProfileScreen"
//             component={EditProfileScreen}
//             options={{
//               presentation: 'modal',
//               cardStyle: { backgroundColor: 'transparent' },
//             }}
//           />
//         </>
//       )}
//     </Stack.Navigator>
//   );
// }

// src/navigation/MainStackNavigator.tsx - С правильной логикой навигации
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import TabNavigator from './TabNavigator';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import OnboardingFirstScreen from '../screens/Onboarding/OnboardingFirstScreen';
import OnboardingSecondScreen from '../screens/Onboarding/OnboardingSecondScreen';
import OnboardingThirdScreen from '../screens/Onboarding/OnboardingThirdScreen';
import OnboardingFourthScreen from '../screens/Onboarding/OnboardingFourthScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SignUpScreen from '../screens/Auth/SignUpScreen';
import AuthEmailScreen from '../screens/Auth/AuthEmailScreen';
import MagicLinkWaitingScreen from '../screens/Auth/MagicLinkWaitingScreen';

import { useAuthStore, useOnboardingCompleted } from '../stores/auth.store';

const Stack = createStackNavigator();

export default function MainStackNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const onboardingCompleted = useOnboardingCompleted();

  // Определяем начальный экран на основе состояния
  const getInitialRouteName = () => {
    if (!onboardingCompleted) {
      return 'Onboarding1'; // Показываем онбординг
    }
    if (!isAuthenticated) {
      return 'Login'; // Показываем логин
    }
    return 'MainTabs'; // Показываем главное приложение
  };

  return (
    <Stack.Navigator
      initialRouteName={getInitialRouteName()}
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Onboarding Flow */}
      {!onboardingCompleted && (
        <>
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
          <Stack.Screen
            name="MagicLinkWaiting"
            component={MagicLinkWaitingScreen}
            options={{ presentation: 'card' }}
          />
        </>
      )}

      {/* Auth Flow */}
      {!isAuthenticated && onboardingCompleted && (
        <>
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="Registration1"
            component={OnboardingFourthScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="AuthEmail"
            component={AuthEmailScreen}
            options={{ presentation: 'card' }}
          />
          <Stack.Screen
            name="MagicLinkWaiting"
            component={MagicLinkWaitingScreen}
            options={{ presentation: 'card' }}
          />
        </>
      )}

      {/* Main App Flow */}
      {isAuthenticated && (
        <>
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
        </>
      )}
    </Stack.Navigator>
  );
}
