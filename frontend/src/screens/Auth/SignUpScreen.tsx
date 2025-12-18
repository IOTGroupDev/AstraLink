// src/screens/auth/SignUpScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/auth/AuthLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import { useOnboardingStore } from '../../stores/onboarding.store';
import {
  withBiometricProtection,
  handleOAuthError,
  needsOnboarding,
} from '../../services/oauthHelper';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const { login } = useAuthStore();
  const { setCompleted } = useOnboardingStore();

  const handleEmailSignUp = () => {
    navigation.navigate('AuthEmail' as never);
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('google');
      const response = await withBiometricProtection(
        () => authAPI.googleSignIn(),
        'Google'
      );
      login(response.user);

      if (needsOnboarding(response.user)) {
        navigation.navigate('OnboardingName' as never);
      } else {
        setCompleted(true);
        navigation.navigate('Main' as never);
      }
    } catch (error: any) {
      handleOAuthError(error, 'Google');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleAppleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('apple');
      const response = await withBiometricProtection(
        () => authAPI.appleSignIn(),
        'Apple'
      );

      // Сохраняем пользователя в store
      login(response.user);

      // Проверяем, нужен ли онбординг
      if (needsOnboarding(response.user)) {
        navigation.navigate('OnboardingName' as never);
      } else {
        setCompleted(true);
        navigation.navigate('Main' as never);
      }
    } catch (error: any) {
      handleOAuthError(error, 'Apple');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleVKSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('vk');
      Alert.alert(
        'В разработке',
        'Авторизация через VK будет доступна в следующей версии',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      handleOAuthError(error, 'VK');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.container}>
        <OnboardingHeader
          title={t('auth.signUp.title')}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          <Text style={styles.subtitle}>{t('auth.signUp.subtitle')}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.emailButton, loading && styles.disabledButton]}
              onPress={handleEmailSignUp}
              activeOpacity={0.8}
              disabled={loading}
            >
              <Text style={styles.emailButtonText}>
                {t('auth.signUp.emailButton')}
              </Text>
            </TouchableOpacity>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loading &&
                    loadingProvider !== 'google' &&
                    styles.disabledButton,
                ]}
                onPress={handleGoogleSignUp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loadingProvider === 'google' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <Ionicons
                    name="logo-google"
                    size={28}
                    color={AUTH_COLORS.border}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loading &&
                    loadingProvider !== 'apple' &&
                    styles.disabledButton,
                ]}
                onPress={handleAppleSignUp}
                activeOpacity={0.8}
                disabled={loading}
              >
                {loadingProvider === 'apple' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <Ionicons
                    name="logo-apple"
                    size={32}
                    color={AUTH_COLORS.border}
                  />
                )}
              </TouchableOpacity>

              {/*<TouchableOpacity*/}
              {/*  style={[*/}
              {/*    styles.socialButton,*/}
              {/*    loading && loadingProvider !== 'vk' && styles.disabledButton,*/}
              {/*  ]}*/}
              {/*  onPress={handleVKSignUp}*/}
              {/*  activeOpacity={0.8}*/}
              {/*  disabled={loading}*/}
              {/*>*/}
              {/*  {loadingProvider === 'vk' ? (*/}
              {/*    <ActivityIndicator color={AUTH_COLORS.border} size="small" />*/}
              {/*  ) : (*/}
              {/*    <View style={styles.vkIcon}>*/}
              {/*      <Text style={styles.vkText}>VK</Text>*/}
              {/*    </View>*/}
              {/*  )}*/}
              {/*</TouchableOpacity>*/}
            </View>
          </View>

          {loading && (
            <Text style={styles.loadingText}>
              {loadingProvider === 'google' && t('auth.signUp.loading.google')}
              {loadingProvider === 'apple' && t('auth.signUp.loading.apple')}
              {loadingProvider === 'vk' && t('auth.signUp.loading.vk')}
            </Text>
          )}
        </View>
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: AUTH_LAYOUT.horizontalPadding,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  subtitle: {
    ...AUTH_TYPOGRAPHY.subtitle,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginBottom: 36,
  },
  buttonsContainer: {
    width: '100%',
    gap: 12,
  },
  emailButton: {
    width: '100%',
    height: AUTH_LAYOUT.buttonHeight,
    backgroundColor: AUTH_COLORS.btnBg,
    borderRadius: AUTH_LAYOUT.buttonRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailButtonText: {
    ...AUTH_TYPOGRAPHY.button,
    color: AUTH_COLORS.btnText,
    textTransform: 'uppercase',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    height: AUTH_LAYOUT.buttonHeight,
    borderRadius: AUTH_LAYOUT.buttonRadius,
    borderWidth: 1,
    borderColor: AUTH_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  vkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  vkText: {
    fontSize: 20,
    fontWeight: '700',
    color: AUTH_COLORS.border,
  },
  disabledButton: {
    opacity: 0.5,
  },
  loadingText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim60,
    marginTop: 20,
    textAlign: 'center',
  },
});

export default SignUpScreen;
