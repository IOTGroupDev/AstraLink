import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SignInWithOAuthCredentials } from '@supabase/supabase-js';
import { api } from './client';
import { supabase } from '../supabase';
import { authLogger } from '../logger';
import type { SignupRequest, AuthResponse } from '../../types';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_PATH = 'auth/callback';
const OAUTH_NATIVE_REDIRECT_URI = 'astralink://auth/callback';
const runtimeEnv: Record<string, string | undefined> =
  typeof process !== 'undefined'
    ? ((process as { env?: Record<string, string | undefined> }).env ?? {})
    : {};
const expoExtra = (Constants?.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;
const YANDEX_OAUTH_PROVIDER =
  runtimeEnv.EXPO_PUBLIC_SUPABASE_YANDEX_PROVIDER ||
  expoExtra.SUPABASE_YANDEX_PROVIDER ||
  runtimeEnv.SUPABASE_YANDEX_PROVIDER ||
  'custom:yandex';

// Persisted backoff for Supabase email OTP rate limits.
// We can't bypass server limits; this only prevents hammering /otp and makes UX messaging accurate across app restarts.
type OtpRateLimitState = { lastAtMs: number; backoffSec: number };
const OTP_RATE_LIMIT_STORAGE_KEY = 'al_otp_rate_limit_v1';

const otpRateLimitState: OtpRateLimitState = {
  lastAtMs: 0,
  backoffSec: 60,
};

async function loadOtpRateLimitState(): Promise<OtpRateLimitState> {
  // Web: try localStorage (if available)
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(OTP_RATE_LIMIT_STORAGE_KEY)
          : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<OtpRateLimitState>;
        if (
          typeof parsed.lastAtMs === 'number' &&
          typeof parsed.backoffSec === 'number'
        ) {
          return parsed as OtpRateLimitState;
        }
      }
    } catch (_error) {
      return otpRateLimitState;
    }
    return otpRateLimitState;
  }

  // Native: AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(OTP_RATE_LIMIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OtpRateLimitState>;
      if (
        typeof parsed.lastAtMs === 'number' &&
        typeof parsed.backoffSec === 'number'
      ) {
        return parsed as OtpRateLimitState;
      }
    }
  } catch (_error) {
    return otpRateLimitState;
  }
  return otpRateLimitState;
}

async function saveOtpRateLimitState(state: OtpRateLimitState): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          OTP_RATE_LIMIT_STORAGE_KEY,
          JSON.stringify(state)
        );
      }
    } catch (_error) {
      return;
    }
    return;
  }

  try {
    await AsyncStorage.setItem(
      OTP_RATE_LIMIT_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch (_error) {
    return;
  }
}

function computeNextOtpRetryAfterSec(
  nowMs: number,
  prev: OtpRateLimitState
): OtpRateLimitState {
  const next: OtpRateLimitState = { ...prev };

  // If last rate-limit was long ago, reset backoff.
  if (nowMs - next.lastAtMs > 15 * 60 * 1000) {
    next.backoffSec = 60;
  } else {
    // Exponential backoff up to 1 hour.
    next.backoffSec = Math.min(next.backoffSec * 2, 3600);
  }

  next.lastAtMs = nowMs;
  return next;
}

// Redirect URI helper for OTP/Magic Link/OAuth
function isExpoGo(): boolean {
  const constants = Constants as any;
  return (
    constants?.executionEnvironment === 'storeClient' ||
    constants?.appOwnership === 'expo'
  );
}

function getRedirectUri(): string {
  try {
    // Web prod: same-origin callback route
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location
    ) {
      return `${window.location.origin}/${OAUTH_REDIRECT_PATH}`;
    }

    const expoGo = isExpoGo();
    const url = expoGo
      ? AuthSession.makeRedirectUri({
          path: OAUTH_REDIRECT_PATH,
        })
      : AuthSession.makeRedirectUri({
          native: OAUTH_NATIVE_REDIRECT_URI,
          scheme: 'astralink',
          path: OAUTH_REDIRECT_PATH,
        });

    authLogger.log(
      `🔗 ${expoGo ? 'Expo Go' : 'Native'} redirect URI via makeRedirectUri:`,
      url
    );
    return url;
  } catch (error) {
    authLogger.error('❌ Ошибка получения redirect URI:', error);
    return OAUTH_NATIVE_REDIRECT_URI;
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

async function establishSessionFromRedirectUrl(redirectedUrl: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  authLogger.log('↩️ OAuth redirect URL received:', redirectedUrl);
  const { accessToken, refreshToken, code } =
    extractFromRedirectUrl(redirectedUrl);

  if (accessToken && refreshToken) {
    const { error: setErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setErr) {
      throw setErr;
    }

    return { accessToken, refreshToken };
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const exchangedAccessToken = sessionData.session?.access_token ?? null;
    const exchangedRefreshToken = sessionData.session?.refresh_token ?? null;

    if (!exchangedAccessToken || !exchangedRefreshToken) {
      throw new Error('Не удалось получить сессию после OAuth code exchange');
    }

    return {
      accessToken: exchangedAccessToken,
      refreshToken: exchangedRefreshToken,
    };
  }

  // Some providers can return control to the app without preserving query/hash
  // params on the native deep link. In that case, try the current Supabase session
  // before failing hard.
  const { data: existingSessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    authLogger.warn(
      '⚠️ Failed to inspect Supabase session after OAuth:',
      sessionError
    );
  }

  const existingAccessToken = existingSessionData.session?.access_token ?? null;
  const existingRefreshToken =
    existingSessionData.session?.refresh_token ?? null;

  if (existingAccessToken && existingRefreshToken) {
    authLogger.log('✅ OAuth session recovered from existing Supabase session');
    return {
      accessToken: existingAccessToken,
      refreshToken: existingRefreshToken,
    };
  }

  throw new Error('Токены или code не получены из OAuth потока');
}

function ensureUserProfileInBackground(data: {
  userId: string;
  email: string;
}): void {
  void authAPI.ensureUserProfile(data).catch((ensureError: any) => {
    authLogger.warn('⚠️ ensure-profile failed (background):', ensureError);
  });
}

export const authAPI = {
  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    try {
      authLogger.log(
        '🔐 Отправляем данные для регистрации через Backend API:',
        data
      );

      const response = await api.post('/auth/signup', {
        email: data.email,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
      });

      authLogger.log('✅ Успешная регистрация через Backend');

      const { user, access_token } = response.data;
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
  ): Promise<{
    success: boolean;
    message: string;
    flow: 'signup' | 'login';
  }> => {
    try {
      const normalizedEmail = String(email).trim().toLowerCase();

      // Client-side throttle BEFORE hitting Supabase.
      // Supabase has both "per last request" and "per hour" limits; this prevents accidental spam
      // (double taps, rerenders, multiple screens calling resend) that can lock the project for a long time.
      const nowMs = Date.now();
      const stored = await loadOtpRateLimitState();
      const waitMs = stored.lastAtMs + stored.backoffSec * 1000 - nowMs;

      if (waitMs > 0) {
        const retryAfterSec = Math.max(1, Math.ceil(waitMs / 1000));
        const err: any = new Error(
          `Лимит отправки писем исчерпан. Подождите ${retryAfterSec} секунд и попробуйте снова.`
        );
        err.code = 'email_rate_limit_exceeded';
        err.retryAfterSec = retryAfterSec;
        err.status = 429;

        authLogger.warn('⏳ OTP client-side throttle hit:', {
          email: normalizedEmail,
          retryAfterSec,
          backoffSec: stored.backoffSec,
        });

        throw err;
      }

      authLogger.log(
        '📧 Отправка OTP через Backend → Supabase на:',
        normalizedEmail
      );
      authLogger.log('➡️ POST /auth/send-magic-link', {
        email: normalizedEmail,
      });

      const response = await api.post('/auth/send-magic-link', {
        email: normalizedEmail,
      });

      if (!response?.data?.success) {
        throw new Error(response?.data?.message || 'Не удалось отправить код');
      }

      const flow: 'signup' | 'login' = 'signup';

      // Mark successful send to enforce at least the base 60s window locally.
      // This mirrors Supabase's default "last request" window and reduces hitting hourly quotas.
      await saveOtpRateLimitState({ lastAtMs: Date.now(), backoffSec: 60 });

      const message =
        flow === 'signup'
          ? 'Код отправлен на email'
          : 'Пользователь с таким email уже есть. Мы отправили код для входа.';

      authLogger.log('✅ OTP отправлен', { flow });

      return { success: true, message, flow };
    } catch (error: any) {
      const rawMsg = String(error?.message || '');

      // Supabase can return: "email rate limit exceeded"
      const isEmailRateLimit =
        /email rate limit exceeded/i.test(rawMsg) || /rate limit/i.test(rawMsg);

      if (isEmailRateLimit) {
        const nowMs = Date.now();

        // If Supabase doesn't provide Retry-After (usually it doesn't via supabase-js),
        // we persist an exponential backoff to reflect that the server window can be > 60s
        // and to keep it consistent across app reloads.
        const stored = await loadOtpRateLimitState();
        const nextState = computeNextOtpRetryAfterSec(nowMs, stored);

        // keep in-memory in sync too
        otpRateLimitState.lastAtMs = nextState.lastAtMs;
        otpRateLimitState.backoffSec = nextState.backoffSec;

        await saveOtpRateLimitState(nextState);

        const retryAfterSec =
          Number((error as any)?.retryAfterSec) || nextState.backoffSec;

        // attach metadata for UI (screens can read it to disable button / show countdown)
        (error as any).code =
          (error as any)?.code || 'email_rate_limit_exceeded';
        (error as any).retryAfterSec = retryAfterSec;

        // Don't overpromise 60s; show the computed backoff.
        error.message = `Лимит отправки писем исчерпан. Подождите ${retryAfterSec} секунд и попробуйте снова.`;
      } else if (/invalid email/i.test(rawMsg)) {
        error.message = 'Некорректный email';
      } else {
        error.message = error.message || 'Не удалось отправить код';
      }

      // Логируем нормализованную ошибку + статус, чтобы было видно 429 и backoff
      authLogger.error('❌ Ошибка отправки OTP:', {
        message: String(error?.message || ''),
        status: (error as any)?.status,
        code: (error as any)?.code,
        retryAfterSec: (error as any)?.retryAfterSec,
        rawMessage: rawMsg,
      });

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

      try {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } catch (setErr) {
        authLogger.warn('⚠️ Failed to set Supabase session after OTP:', setErr);
      }

      authLogger.log('✅ Код подтвержден');

      ensureUserProfileInBackground({
        userId: data.user!.id,
        email: data.user!.email!,
      });

      return {
        access_token: data.session.access_token,
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name: (data.user!.user_metadata as any)?.name || '',
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

        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });
        if (error) throw error;

        const { data: s } = await supabase.auth.getSession();
        const accessToken = s.session?.access_token ?? null;

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user)
          throw new Error(
            'Не удалось получить пользователя после Apple sign in'
          );

        ensureUserProfileInBackground({
          userId: user.id,
          email: user.email || '',
        });

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email: user.email || '',
            name: (user.user_metadata as any)?.name || '',
          },
        };
      }

      // Android and others: use web OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true, // RN: prevent SDK from opening its own browser
        },
      });
      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
          {
            preferEphemeralSession: true,
          }
        );
        if (result.type === 'success' && result.url) {
          const { accessToken } = await establishSessionFromRedirectUrl(
            result.url
          );

          const { data: userRes } = await supabase.auth.getUser();
          const user = userRes.user;
          if (!user)
            throw new Error(
              'Не удалось получить пользователя после Apple OAuth'
            );

          ensureUserProfileInBackground({
            userId: user.id,
            email: user.email || '',
          });

          return {
            access_token: accessToken || '',
            user: {
              id: user.id,
              email: user.email || '',
              name: (user.user_metadata as any)?.name || '',
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
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true, // RN: prevent SDK from opening its own browser
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
          {
            preferEphemeralSession: true,
          }
        );
        if (result.type === 'success' && result.url) {
          const { accessToken } = await establishSessionFromRedirectUrl(
            result.url
          );

          const { data: userRes } = await supabase.auth.getUser();
          const user = userRes.user;
          if (!user) throw new Error('Не удалось получить данные пользователя');

          ensureUserProfileInBackground({
            userId: user.id,
            email: user.email || '',
          });

          return {
            access_token: accessToken || '',
            user: {
              id: user.id,
              email: user.email!,
              name: (user.user_metadata as any)?.name || '',
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

  yandexSignIn: async (): Promise<AuthResponse> => {
    try {
      authLogger.log(
        '🔐 Начало Yandex OAuth. Provider:',
        YANDEX_OAUTH_PROVIDER
      );
      const redirectUri = getRedirectUri();
      authLogger.log('🔗 Yandex Redirect URI:', redirectUri);

      const credentials = {
        // `custom:*` identifier must match the provider configured in Supabase Auth.
        provider: YANDEX_OAUTH_PROVIDER,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      } as unknown as SignInWithOAuthCredentials;

      const { data, error } = await supabase.auth.signInWithOAuth(credentials);
      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri,
          {
            preferEphemeralSession: true,
          }
        );
        if (result.type === 'success' && result.url) {
          const { accessToken } = await establishSessionFromRedirectUrl(
            result.url
          );

          const { data: userRes } = await supabase.auth.getUser();
          const user = userRes.user;
          if (!user) throw new Error('Не удалось получить данные пользователя');

          ensureUserProfileInBackground({
            userId: user.id,
            email: user.email || '',
          });

          return {
            access_token: accessToken || '',
            user: {
              id: user.id,
              email: user.email || '',
              name: (user.user_metadata as any)?.name || '',
            },
          };
        }
        throw new Error('Авторизация отменена или не завершена');
      }

      throw new Error('Не удалось инициировать OAuth');
    } catch (error: any) {
      authLogger.error('❌ Yandex sign in failed:', error);
      throw error;
    }
  },

  completeSignup: async (data: {
    userId?: string;
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

  ensureUserProfile: async (data: {
    userId: string;
    email: string;
  }): Promise<void> => {
    try {
      await api.post('/auth/ensure-profile', {
        userId: data.userId,
        email: data.email,
      });
    } catch (error: any) {
      authLogger.error('❌ ensure profile failed:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      authLogger.log('👋 Выход из системы');
      await supabase.auth.signOut();
      authLogger.log('✅ Выход выполнен');
    } catch (error: any) {
      authLogger.error('❌ Logout failed:', error);
      throw error;
    }
  },
};
