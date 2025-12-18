// src/screens/auth/AuthCallbackScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AuthLayout } from '../../components/auth/AuthLayout';
import ZodiacLoadingAnimation from '../../components/shared/ZodiacLoadingAnimation';
import { supabase } from '../../services/supabase';
import { tokenService } from '../../services/tokenService';
import { AUTH_COLORS, AUTH_TYPOGRAPHY } from '../../constants/auth.constants';

const AuthCallbackScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      if (Platform.OS === 'web') {
        const url = new URL(window.location.href);
        const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
        const searchParams = url.searchParams;
        const getParam = (key: string) =>
          hashParams.get(key) || searchParams.get(key);

        const errorParam = getParam('error') || getParam('error_description');
        if (errorParam) throw new Error(decodeURIComponent(errorParam));

        let accessToken = getParam('access_token');
        let refreshToken = getParam('refresh_token');
        const code = getParam('code');

        if (accessToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          const { data: s } = await supabase.auth.getSession();
          accessToken = s.session?.access_token || null;
          refreshToken = s.session?.refresh_token || null;
        } else {
          const storedToken = await tokenService.getToken();
          if (storedToken) {
            const { error } = await supabase.auth.setSession({
              access_token: storedToken,
              refresh_token: '',
            });
            if (error) throw error;
            accessToken = storedToken;
          } else {
            throw new Error(
              t('auth.callback.noTokenOrCode', {
                defaultValue: 'Authorization token or code not found in URL',
              })
            );
          }
        }

        if (accessToken) {
          await tokenService.setToken(accessToken);
        }

        try {
          // @ts-ignore
          const bc = new BroadcastChannel('supabase-auth');
          bc.postMessage({
            type: 'SIGNED_IN',
            accessToken,
            refreshToken: refreshToken || '',
            ts: Date.now(),
          });
          bc.close();
        } catch (bcError) {
          // Silent fail
        } finally {
          try {
            if (accessToken) {
              localStorage.setItem('al_token_value', accessToken);
            }
            localStorage.setItem('al_token_broadcast', String(Date.now()));
          } catch (storageError) {
            // Silent fail
          }
        }

        try {
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        } catch {}

        // @ts-ignore
        navigation.reset({
          index: 0,
          routes: [{ name: 'UserDataLoader' }],
        });
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error(
          t('auth.callback.sessionNotFound', {
            defaultValue: 'Session not found',
          })
        );
      }

      await tokenService.setToken(session.access_token);

      // @ts-ignore
      navigation.reset({
        index: 0,
        routes: [{ name: 'UserDataLoader' }],
      });
    } catch (err: any) {
      setError(
        err?.message ||
          t('auth.callback.authorizationError', {
            defaultValue: 'Authorization error',
          })
      );
      setTimeout(() => {
        // @ts-ignore
        navigation.navigate('SignUp');
      }, 3000);
    }
  };

  return (
    <AuthLayout>
      <View style={styles.content}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>{t('auth.callback.error')}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.redirectText}>
              {t('auth.callback.redirecting')}
            </Text>
          </View>
        ) : (
          <View style={styles.loadingContainer}>
            <ZodiacLoadingAnimation />
            <Text style={styles.text}>{t('auth.callback.loading')}</Text>
            <Text style={styles.subtitle}>{t('auth.callback.subtitle')}</Text>
          </View>
        )}
      </View>
    </AuthLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...AUTH_TYPOGRAPHY.body,
    fontSize: 20,
    fontWeight: '600',
    color: AUTH_COLORS.text,
    marginTop: 40,
    textAlign: 'center',
  },
  subtitle: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim70,
    marginTop: 12,
    textAlign: 'center',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: AUTH_COLORS.error,
    marginBottom: 12,
  },
  errorText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim70,
    textAlign: 'center',
    marginBottom: 24,
  },
  redirectText: {
    ...AUTH_TYPOGRAPHY.hint,
    color: AUTH_COLORS.textDim50,
    textAlign: 'center',
  },
});

export default AuthCallbackScreen;
