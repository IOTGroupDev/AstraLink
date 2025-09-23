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
import Svg, { Circle, Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { getStoredToken, authAPI } from './src/services/api';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import TabNavigator from './src/navigation/TabNavigator';
import AnimatedStars from './src/components/AnimatedStars';
import AstrologicalChart from './src/components/AstrologicalChart';
import LoadingLogo from './src/components/LoadingLogo';
import CosmicBackground from './src/components/CosmicBackground';

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
      const token = await getStoredToken();
      if (token) {
        console.log('🔍 Найден токен, пользователь авторизован');
        setIsAuthenticated(true);
        // Не проверяем профиль здесь, чтобы избежать ошибок backend
        // Проверка будет происходить в компонентах при необходимости
      } else {
        console.log('❌ Токен не найден, требуется авторизация');
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('❌ Ошибка проверки авторизации:', error);
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
    );
  }

  return (
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