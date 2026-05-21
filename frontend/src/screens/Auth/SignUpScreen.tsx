// src/screens/auth/SignUpScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/auth/AuthLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import { authAPI } from '../../services/api';
import { useOnboardingStore } from '../../stores/onboarding.store';
import {
  withBiometricProtection,
  handleOAuthError,
} from '../../services/oauthHelper';
import { AuthEngine } from '../../services/authEngine';
import { useAuthStore } from '../../stores/auth.store';
import { applyOAuthSessionToAuthStore } from '../../services/oauthSessionRouting';
import {
  clearSupabaseLocalAuthData,
  waitForUserDataCleanup,
} from '../../services/cleanupService';
import type { RootStackParamList } from '../../types/navigation';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_LAYOUT,
} from '../../constants/auth.constants';

const AUTH_CLEANUP_TIMEOUT_MS = 800;
const AUTH_CLEANUP_WAIT_TIMEOUT_MS = 2500;
const AUTH_ROUTE_FALLBACK_TIMEOUT_MS = 3500;

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | undefined> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<undefined>((resolve) => {
        timeoutId = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const SignUpScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const { reset } = useOnboardingStore();
  const authSceneVersion = useAuthStore((state) => state.authSceneVersion);

  useEffect(() => {
    setLoading(false);
    setLoadingProvider(null);
  }, [authSceneVersion]);

  const routeAfterOAuth = async (
    user?: Awaited<ReturnType<typeof authAPI.googleSignIn>>['user']
  ) => {
    const applied = await applyOAuthSessionToAuthStore(user);
    if (applied) {
      void AuthEngine.refreshProfileInBackground();
      return;
    }

    let profileRefreshed = false;
    try {
      await AuthEngine.refreshProfile();
      profileRefreshed = true;
    } catch {
      // ignore and fallback to current store state below
    }

    const nextState = useAuthStore.getState().authState;
    if (nextState === 'AUTHORIZED' || nextState === 'ONBOARDING') {
      return;
    }

    if (!profileRefreshed) {
      await AuthEngine.refreshProfileInBackground();
    }
  };

  const prepareFreshAuthAttempt = async () => {
    const currentState = useAuthStore.getState().authState;
    if (currentState === 'UNAUTHORIZED') {
      await Promise.race([
        clearSupabaseLocalAuthData(),
        new Promise<void>((resolve) =>
          setTimeout(resolve, AUTH_CLEANUP_TIMEOUT_MS)
        ),
      ]).catch(() => undefined);
    }
  };

  const handleEmailSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('email');
      await prepareFreshAuthAttempt();
      navigation.navigate('AuthEmail' as never);
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('google');
      await waitForUserDataCleanup(AUTH_CLEANUP_WAIT_TIMEOUT_MS);
      const result = await withBiometricProtection(
        () => authAPI.googleSignIn(),
        'Google'
      );
      reset();
      await routeAfterOAuth(result.user);
    } catch (error: unknown) {
      await withTimeout(routeAfterOAuth(), AUTH_ROUTE_FALLBACK_TIMEOUT_MS);
      const nextState = useAuthStore.getState().authState;
      if (nextState === 'AUTHORIZED' || nextState === 'ONBOARDING') {
        reset();
        return;
      }
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
      await waitForUserDataCleanup(AUTH_CLEANUP_WAIT_TIMEOUT_MS);
      const result = await withBiometricProtection(
        () => authAPI.appleSignIn(),
        'Apple'
      );
      reset();
      await routeAfterOAuth(result.user);
    } catch (error: unknown) {
      await withTimeout(routeAfterOAuth(), AUTH_ROUTE_FALLBACK_TIMEOUT_MS);
      const nextState = useAuthStore.getState().authState;
      if (nextState === 'AUTHORIZED' || nextState === 'ONBOARDING') {
        reset();
        return;
      }
      handleOAuthError(error, 'Apple');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  const handleYandexSignUp = async () => {
    try {
      setLoading(true);
      setLoadingProvider('yandex');
      await waitForUserDataCleanup(AUTH_CLEANUP_WAIT_TIMEOUT_MS);
      const result = await withBiometricProtection(
        () => authAPI.yandexSignIn(),
        'Yandex'
      );
      reset();
      await routeAfterOAuth(result.user);
    } catch (error: unknown) {
      await withTimeout(routeAfterOAuth(), AUTH_ROUTE_FALLBACK_TIMEOUT_MS);
      const nextState = useAuthStore.getState().authState;
      if (nextState === 'AUTHORIZED' || nextState === 'ONBOARDING') {
        reset();
        return;
      }
      handleOAuthError(error, 'Yandex');
    } finally {
      setLoading(false);
      setLoadingProvider(null);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.container}>
        <OnboardingHeader title="AstraLink" />

        <View style={styles.content}>
          <Text style={styles.subtitle}>{t('auth.signUp.subtitle')}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[
                styles.emailButton,
                loadingProvider === 'email' && styles.disabledButton,
              ]}
              onPress={handleEmailSignUp}
              activeOpacity={0.8}
              disabled={loadingProvider === 'email'}
            >
              <Text style={styles.emailButtonText}>
                {t('auth.signUp.emailButton')}
              </Text>
            </TouchableOpacity>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loadingProvider === 'google' && styles.disabledButton,
                ]}
                onPress={handleGoogleSignUp}
                activeOpacity={0.8}
                disabled={loadingProvider === 'google'}
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
                  loadingProvider === 'apple' && styles.disabledButton,
                ]}
                onPress={handleAppleSignUp}
                activeOpacity={0.8}
                disabled={loadingProvider === 'apple'}
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

              <TouchableOpacity
                style={[
                  styles.socialButton,
                  loadingProvider === 'yandex' && styles.disabledButton,
                ]}
                onPress={handleYandexSignUp}
                activeOpacity={0.8}
                disabled={loadingProvider === 'yandex'}
              >
                {loadingProvider === 'yandex' ? (
                  <ActivityIndicator color={AUTH_COLORS.border} size="small" />
                ) : (
                  <View style={styles.yandexIcon}>
                    <Text style={styles.yandexText}>Ya</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {loading && (
            <Text style={styles.loadingText}>
              {loadingProvider === 'google' && t('auth.signUp.loading.google')}
              {loadingProvider === 'apple' && t('auth.signUp.loading.apple')}
              {loadingProvider === 'yandex' && t('auth.signUp.loading.yandex')}
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
  yandexIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  yandexText: {
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
