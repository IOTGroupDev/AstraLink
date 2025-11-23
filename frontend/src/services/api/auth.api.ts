import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import { api } from './client';
import { supabase } from '../supabase';
import { tokenService } from '../tokenService';
import { authLogger } from '../logger';
import type { LoginRequest, SignupRequest, AuthResponse } from '../../types';

WebBrowser.maybeCompleteAuthSession();

// Redirect URI helper for OTP/Magic Link/OAuth
function getRedirectUri(): string {
  try {
    // DEV: universal proxy (works in Expo Go, avoids origin issues)
    // __DEV__ is provided by Metro/RN
    // eslint-disable-next-line no-undef
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const url = AuthSession.makeRedirectUri({
        useProxy: true,
        path: 'auth/callback',
      });
      authLogger.log('🔗 DEV redirect via AuthSession proxy:', url);
      return url;
    }

    // Web prod: same-origin callback route
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location
    ) {
      return `${window.location.origin}/auth/callback`;
    }

    // Native prod: custom scheme
    const url = AuthSession.makeRedirectUri({
      scheme: 'astralink',
      path: 'auth/callback',
    });
    authLogger.log('🔗 PROD native redirect URI via makeRedirectUri:', url);
    return url;
  } catch (error) {
    authLogger.error('❌ Ошибка получения redirect URI:', error);
    return 'astralink://auth/callback';
  }
}

// Parse tokens from Supabase OAuth redirect URL (supports query and hash)
function extractFromRedirectUrl(redirectedUrl: string): {
  accessToken: string | null;
  refreshToken: string | null;
  code: string | null;
} {
  try {
    const parsed = new URL(redirectedUrl);
    const search = parsed.searchParams;
    const hashString = parsed.hash?.startsWith('#')
      ? parsed.hash.slice(1)
      : parsed.hash || '';
    const hash = new URLSearchParams(hashString);
    const get = (k: string) => search.get(k) || hash.get(k);
    return {
      accessToken: get('access_token'),
      refreshToken: get('refresh_token'),
      code: get('code'),
    };
  } catch {
    return { accessToken: null, refreshToken: null, code: null };
  }
}

export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      authLogger.log('🔐 Отправляем данные для входа через Backend API:', {
        email: data.email,
      });

      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { access_token, user } = response.data;
      if (!access_token) throw new Error('Токен не получен от Backend');

      await tokenService.setToken(access_token);
      authLogger.log('✅ Успешный вход через Backend');

      return { access_token, user };
    } catch (error: any) {
      authLogger.log('❌ API login failed:', error);
      const errorMessage = error.response?.data?.message || error.message;
      if (typeof errorMessage === 'string') error.message = errorMessage;
      if (error.message?.includes('Invalid login credentials'))
        error.message = 'Неверный email или пароль';
      else if (error.message?.includes('Email not confirmed'))
        error.message = 'Email не подтвержден';
      else if (error.code === 'ERR_NETWORK') error.message = 'Ошибка сети';
      throw error;
    }
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    try {
      authLogger.log(
        '🔐 Отправляем данные для регистрации через Backend API:',
        data
      );

      const response = await api.post('/auth/signup', {
        email: data.email,
        password: data.password,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
      });

      authLogger.log('✅ Успешная регистрация через Backend');

      const { user, access_token } = response.data;
      await tokenService.setToken(access_token);
      return { access_token, user };
    } catch (error: any) {
      authLogger.log('❌ API signup failed:', error);
      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage?.includes('уже существует'))
        error.message = 'Пользователь с таким email уже существует';
      else if (errorMessage?.includes('Некорректная дата'))
        error.message = errorMessage;
      else if (error.code === 'ERR_NETWORK')
        error.message = 'Ошибка сети. Проверьте подключение к серверу';
      throw error;
    }
  },

  // Send numeric OTP (no redirect)
  sendVerificationCode: async (
    email: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      authLogger.log('📧 Отправка OTP через Supabase на:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      authLogger.log('✅ OTP отправлен');
      return { success: true, message: 'Код отправлен на email' };
    } catch (error: any) {
      authLogger.error('❌ Ошибка отправки OTP:', error);
      if (error.message?.includes('rate limit'))
        error.message = 'Слишком много попыток. Подождите минуту';
      else if (error.message?.includes('Invalid email'))
        error.message = 'Некорректный email';
      else error.message = error.message || 'Не удалось отправить код';
      throw error;
    }
  },

  verifyCode: async (email: string, token: string): Promise<AuthResponse> => {
    try {
      authLogger.log('🔐 Проверка OTP кода');
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      if (!data.session) throw new Error('Не удалось создать сессию');

      await tokenService.setToken(data.session.access_token);
      authLogger.log('✅ Код подтвержден');

      return {
        access_token: data.session.access_token,
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name: (data.user!.user_metadata as any)?.name || '',
          role: 'user',
        },
      };
    } catch (error: any) {
      authLogger.error('❌ Ошибка проверки кода:', error);
      if (error.message?.includes('expired'))
        error.message = 'Код истек. Запросите новый код';
      else if (error.message?.includes('invalid'))
        error.message = 'Неверный код';
      else error.message = error.message || 'Не удалось проверить код';
      throw error;
    }
  },

  appleSignIn: async (): Promise<AuthResponse> => {
    try {
      const redirectUri = getRedirectUri();
      authLogger.log('🍎 Apple sign in start. Redirect URI:', redirectUri);

      if (Platform.OS === 'ios') {
        // Dynamic import to avoid bundling issues on non-iOS platforms
        // Ensure expo-apple-authentication is installed for iOS builds
        const Apple = await import('expo-apple-authentication');
        const credential = await Apple.signInAsync({
          requestedScopes: [
            Apple.AppleAuthenticationScope.FULL_NAME,
            Apple.AppleAuthenticationScope.EMAIL,
          ],
        });

        const idToken = (credential as any)?.identityToken as string | null;
        if (!idToken) {
          throw new Error('Apple identityToken отсутствует');
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });
        if (error) throw error;

        const { data: s } = await supabase.auth.getSession();
        const accessToken = s.session?.access_token ?? null;
        if (accessToken) {
          await tokenService.setToken(accessToken);
        }

        const { data: userRes } = await supabase.auth.getUser(
          (accessToken || undefined) as any
        );
        const user = userRes?.user;
        if (!user)
          throw new Error(
            'Не удалось получить пользователя после Apple sign in'
          );

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email: user.email || '',
            name: (user.user_metadata as any)?.name || '',
            role: 'user',
          },
        };
      }

      // Android and others: use web OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: redirectUri, skipBrowserRedirect: false },
      });
      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );
        if (result.type === 'success' && result.url) {
          const { accessToken, refreshToken } = extractFromRedirectUrl(
            result.url
          );

          if (accessToken && refreshToken) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setErr) throw setErr;
            await tokenService.setToken(accessToken);
          } else if (accessToken) {
            await tokenService.setToken(accessToken);
          } else {
            throw new Error('Токены не получены из Apple OAuth потока');
          }

          const { data: userRes } = await supabase.auth.getUser(
            ((await tokenService.getToken()) || undefined) as any
          );
          const user = userRes.user;
          if (!user)
            throw new Error(
              'Не удалось получить пользователя после Apple OAuth'
            );

          return {
            access_token: (await tokenService.getToken()) || '',
            user: {
              id: user.id,
              email: user.email || '',
              name: (user.user_metadata as any)?.name || '',
              role: 'user',
            },
          };
        }
        throw new Error('Авторизация отменена или не завершена');
      }

      throw new Error('Не удалось инициировать Apple OAuth');
    } catch (error: any) {
      authLogger.error('❌ Apple sign in failed:', error);
      throw error;
    }
  },

  googleSignIn: async (): Promise<AuthResponse> => {
    try {
      authLogger.log('🔐 Начало Google OAuth');
      const redirectUri = getRedirectUri();
      authLogger.log('🔗 Google Redirect URI:', redirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUri, skipBrowserRedirect: false },
      });
      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );
        if (result.type === 'success' && result.url) {
          const { accessToken, refreshToken } = extractFromRedirectUrl(
            result.url
          );

          if (accessToken && refreshToken) {
            const { error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setErr) throw setErr;
            await tokenService.setToken(accessToken);
          } else if (accessToken) {
            await tokenService.setToken(accessToken);
          } else {
            throw new Error('Токены не получены из Google OAuth потока');
          }

          const { data: userRes } = await supabase.auth.getUser(
            ((await tokenService.getToken()) || undefined) as any
          );
          const user = userRes.user;
          if (!user) throw new Error('Не удалось получить данные пользователя');
          return {
            access_token: (await tokenService.getToken()) || '',
            user: {
              id: user.id,
              email: user.email!,
              name: (user.user_metadata as any)?.name || '',
              role: 'user',
            },
          };
        }
        throw new Error('Авторизация отменена или не завершена');
      }

      throw new Error('Не удалось инициировать OAuth');
    } catch (error: any) {
      authLogger.error('❌ Google sign in failed:', error);
      throw error;
    }
  },

  completeSignup: async (data: {
    userId: string;
    name: string;
    birthDate: string;
    birthTime?: string;
    birthPlace?: string;
  }): Promise<void> => {
    try {
      authLogger.log('📝 Завершение регистрации:', data);
      await api.post('/auth/complete-signup', {
        userId: data.userId,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime || '12:00',
        birthPlace: data.birthPlace || 'Moscow',
      });
      authLogger.log('✅ Регистрация завершена');
    } catch (error: any) {
      authLogger.error('❌ Complete signup failed:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      authLogger.log('👋 Выход из системы');
      await supabase.auth.signOut();
      tokenService.clearToken();
      authLogger.log('✅ Выход выполнен');
    } catch (error: any) {
      authLogger.error('❌ Logout failed:', error);
      tokenService.clearToken();
      throw error;
    }
  },
};
