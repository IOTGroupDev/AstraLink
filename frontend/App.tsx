// frontend/App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Dimensions } from 'react-native';
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
