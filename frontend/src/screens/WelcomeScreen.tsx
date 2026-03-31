import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores';
import { userAPI } from '../services/api';
import { tokenService } from '../services/tokenService';
import CosmicBackground from '../components/shared/CosmicBackground';
import { authLogger } from '../services/logger';

// Define your navigation type
type RootStackParamList = {
  MainTabs: undefined;
  SignUp: undefined;
  AuthEmail: undefined;
  welcome: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function WelcomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();

  const {
    biometricEnabled,
    biometricAvailable,
    biometricType,
    rememberMe,
    setUser,
    setRememberMe,
    checkBiometricSupport,
    authenticateWithBiometrics,
  } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [showBiometricButton, setShowBiometricButton] = useState(false);

  useEffect(() => {
    checkBiometricSupport();
    const checkBiometric = async () => {
      const token = await tokenService.getToken();
      if (biometricAvailable && biometricEnabled && token) {
        setShowBiometricButton(true);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      const success = await authenticateWithBiometrics();

      if (success) {
        const token = await tokenService.getToken();
        if (token) {
          try {
            const user = await userAPI.getProfile();
            setUser(user);
            // Navigate to main app instead of callback
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          } catch (error) {
            Alert.alert(
              t('common.errors.generic'),
              t('auth.errors.sessionRestoreFailed')
            );
          }
        }
      } else {
        Alert.alert(
          t('common.errors.generic'),
          t('auth.errors.biometricFailed')
        );
      }
    } catch (error) {
      authLogger.error('Biometric login error', error);
      Alert.alert(t('common.errors.generic'), t('auth.errors.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    navigation.navigate('AuthEmail');
  };

  const handleSwitchToSignup = () => {
    navigation.navigate('SignUp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <CosmicBackground active={isFocused} />
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.login.title')}</Text>

        {/* Биометрия (если доступна) */}
        {showBiometricButton && (
          <>
            <TouchableOpacity
              style={styles.biometricButton}
              onPress={handleBiometricLogin}
              disabled={loading}
            >
              <Ionicons name="finger-print" size={28} color="#fff" />
              <Text style={styles.biometricText}>
                {t('auth.login.biometricLogin', { type: biometricType })}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('auth.login.divider')}</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <Text style={styles.hintText}>{t('auth.otp.subtitle')}</Text>

        {/* Чекбокс "Запомнить меня" */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setRememberMe(!rememberMe)}
          disabled={loading}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Ionicons name="checkmark" size={16} color="#000" />}
          </View>
          <Text style={styles.checkboxText}>{t('auth.login.rememberMe')}</Text>
        </TouchableOpacity>

        {/* Кнопка входа */}
        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.loginButtonText}>
              {t('auth.signUp.emailButton')}
            </Text>
          )}
        </TouchableOpacity>

        {/* Регистрация */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>{t('auth.login.noAccount')}</Text>
          <TouchableOpacity onPress={handleSwitchToSignup} disabled={loading}>
            <Text style={styles.signupLink}>{t('auth.login.signUpLink')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: 'Montserrat-SemiBold',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    height: 60,
    marginBottom: 16,
    gap: 12,
  },
  biometricText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Montserrat-Medium',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 16,
    fontFamily: 'Montserrat-Regular',
  },
  hintText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Montserrat-Regular',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  checkboxText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  loginButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
  },
  signupLink: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
    fontFamily: 'Montserrat-SemiBold',
  },
});
