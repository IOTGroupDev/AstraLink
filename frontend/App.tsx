// import React, { useState, useEffect } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { StatusBar } from 'expo-status-bar';
// import { View, StyleSheet, Dimensions } from 'react-native';
// import { LinearGradient } from 'expo-linear-gradient';
// import Animated, {
//   useSharedValue,
//   useAnimatedStyle,
//   withRepeat,
//   withTiming,
//   withSpring,
//   withDelay,
//   FadeIn,
//   SlideInUp,
//   Easing,
//   interpolate,
// } from 'react-native-reanimated';
// import { Ionicons } from '@expo/vector-icons';
// import Svg, {
//   Circle,
//   Path,
//   Defs,
//   LinearGradient as SvgGradient,
//   Stop,
// } from 'react-native-svg';
//
// import { supabase } from './src/services/supabase';
// import LoginScreen from './src/screens/LoginScreen';
// import SignupScreen from './src/screens/SignupScreen';
// import TabNavigator from './src/navigation/TabNavigator';
// import AnimatedStars from './src/components/AnimatedStars';
// import AstrologicalChart from './src/components/AstrologicalChart';
// import LoadingLogo from './src/components/LoadingLogo';
// import CosmicBackground from './src/components/CosmicBackground';
// import { QueryProvider } from './src/providers/QueryProvider';
//
// const { width, height } = Dimensions.get('window');
//
// export default function App() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [showSignup, setShowSignup] = useState(false);
//
//   useEffect(() => {
//     checkAuthStatus();
//   }, []);
//
//   const checkAuthStatus = async () => {
//     try {
//       const { data, error } = await supabase.auth.getSession();
//       if (error) {
//         console.log('❌ Ошибка получения сессии:', error);
//         setIsAuthenticated(false);
//       } else if (data.session) {
//         console.log('🔍 Сессия найдена, пользователь авторизован');
//         setIsAuthenticated(true);
//       } else {
//         console.log('❌ Сессия не найдена, требуется авторизация');
//         setIsAuthenticated(false);
//       }
//     } catch (e) {
//       console.log('❌ Ошибка проверки авторизации:', e);
//       setIsAuthenticated(false);
//     } finally {
//       setIsLoading(false);
//     }
//   };
//
//   const handleLogin = () => {
//     setIsAuthenticated(true);
//   };
//
//   const handleSignup = () => {
//     setIsAuthenticated(true);
//   };
//
//   const handleLogout = () => {
//     setIsAuthenticated(false);
//     setShowSignup(false);
//   };
//
//   // Добавляем обработчик выхода в Navigation context
//   const navigationProps = {
//     onLogout: handleLogout,
//   };
//
//   if (isLoading) {
//     return (
//       <LinearGradient
//         colors={['#0F172A', '#1E293B', '#334155']}
//         style={styles.loadingContainer}
//       >
//         <StatusBar style="light" />
//         <AnimatedStars />
//         <CosmicBackground />
//         <LoadingLogo />
//       </LinearGradient>
//     );
//   }
//
//   if (!isAuthenticated) {
//     return (
//       <QueryProvider>
//         <LinearGradient
//           colors={['#0F172A', '#1E293B', '#334155']}
//           style={styles.container}
//         >
//           <StatusBar style="light" />
//           <AnimatedStars />
//           <CosmicBackground />
//           {showSignup ? (
//             <SignupScreen
//               onSignup={handleSignup}
//               onSwitchToLogin={() => setShowSignup(false)}
//             />
//           ) : (
//             <LoginScreen
//               onLogin={handleLogin}
//               onSwitchToSignup={() => setShowSignup(true)}
//             />
//           )}
//         </LinearGradient>
//       </QueryProvider>
//     );
//   }
//
//   return (
//     <QueryProvider>
//       <LinearGradient
//         colors={['#0F172A', '#1E293B', '#334155']}
//         style={styles.container}
//       >
//         <StatusBar style="light" />
//         <AnimatedStars />
//         <CosmicBackground />
//         <NavigationContainer>
//           <TabNavigator />
//         </NavigationContainer>
//       </LinearGradient>
//     </QueryProvider>
//   );
// }
//
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   loadingContainer: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
// });

// frontend/App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MainStackNavigator from './src/navigation/MainStackNavigator';
import AnimatedStars from './src/components/AnimatedStars';
import LoadingLogo from './src/components/LoadingLogo';
import CosmicBackground from './src/components/CosmicBackground';
import { QueryProvider } from './src/providers/QueryProvider';
import { tokenService } from './src/services/tokenService';
import { userAPI } from './src/services/api';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
} from '@expo-google-fonts/montserrat';
import { Text as RNText } from 'react-native';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

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
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenService.getToken();
      if (token) {
        try {
          // Дополнительно подтверждаем валидность токена запросом профиля
          await userAPI.getProfile();
          setIsAuthenticated(true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.log('❌ Ошибка проверки авторизации:', e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSignup = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowSignup(false);
  };

  if (!fontsLoaded) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.loadingContainer}
      >
        <StatusBar style="light" />
        <LoadingLogo />
      </LinearGradient>
    );
  }

  if (isLoading) {
    return (
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.loadingContainer}
      >
        <StatusBar style="light" />
        <AnimatedStars />
        <CosmicBackground />
        <LoadingLogo />
      </LinearGradient>
    );
  }

  if (!isAuthenticated) {
    return (
      <QueryProvider>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={styles.container}
        >
          <StatusBar style="light" />
          <AnimatedStars />
          <CosmicBackground />
          {showSignup ? (
            <SignupScreen
              onSignup={handleSignup}
              onSwitchToLogin={() => setShowSignup(false)}
            />
          ) : (
            <LoginScreen
              onLogin={handleLogin}
              onSwitchToSignup={() => setShowSignup(true)}
            />
          )}
        </LinearGradient>
      </QueryProvider>
    );
  }

  return (
    <QueryProvider>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={styles.container}
      >
        <StatusBar style="light" />
        <AnimatedStars />
        <CosmicBackground />
        <NavigationContainer>
          {/* Изменено: используем MainStackNavigator вместо TabNavigator */}
          <MainStackNavigator />
        </NavigationContainer>
      </LinearGradient>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
