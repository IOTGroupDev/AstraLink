import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  SlideInUp,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Circle,
  Path,
  Defs,
  LinearGradient as SvgGradient,
  Stop,
} from 'react-native-svg';

import { supabase } from './src/services/supabase';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import TabNavigator from './src/navigation/TabNavigator';
import AnimatedStars from './src/components/AnimatedStars';
import AstrologicalChart from './src/components/AstrologicalChart';
import LoadingLogo from './src/components/LoadingLogo';
import CosmicBackground from './src/components/CosmicBackground';
import { QueryProvider } from './src/providers/QueryProvider';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignup, setShowSignup] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('❌ Ошибка получения сессии:', error);
        setIsAuthenticated(false);
      } else if (data.session) {
        console.log('🔍 Сессия найдена, пользователь авторизован');
        setIsAuthenticated(true);
      } else {
        console.log('❌ Сессия не найдена, требуется авторизация');
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

  // Добавляем обработчик выхода в Navigation context
  const navigationProps = {
    onLogout: handleLogout,
  };

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
          <TabNavigator />
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
