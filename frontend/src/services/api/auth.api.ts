import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { Linking, Platform, type EmitterSubscription } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SignInWithOAuthCredentials } from '@supabase/supabase-js';
import { api } from './client';
import { supabase } from '../supabase';
import { authLogger } from '../logger';
import { tokenService } from '../tokenService';
import type { SignupRequest, AuthResponse } from '../../types';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_REDIRECT_PATH = 'auth/callback';
const OAUTH_NATIVE_REDIRECT_URI = 'astralink://auth/callback';
const OAUTH_SESSION_TIMEOUT_MS = 60_000;
const OAUTH_SESSION_RECOVERY_MS = 10_000;
const ENSURE_PROFILE_TIMEOUT_MS = 10_000;
const runtimeEnv: Record<string, string | undefined> =
  typeof process !== 'undefined'
    ? ((process as { env?: Record<string, string | undefined> }).env ?? {})
    : {};
const expoExtra = (Constants?.expoConfig?.extra ?? {}) as Record<
  string,
  string | undefined
>;
const configuredOAuthRedirectUri =
  runtimeEnv.EXPO_PUBLIC_AUTH_REDIRECT_URI ||
  expoExtra.EXPO_PUBLIC_AUTH_REDIRECT_URI ||
  runtimeEnv.AUTH_REDIRECT_URI ||
  expoExtra.AUTH_REDIRECT_URI;
const YANDEX_OAUTH_PROVIDER =
  runtimeEnv.EXPO_PUBLIC_SUPABASE_YANDEX_PROVIDER ||
  expoExtra.SUPABASE_YANDEX_PROVIDER ||
  runtimeEnv.SUPABASE_YANDEX_PROVIDER ||
  'custom:yandex';

type EnsureUserProfileResult = {
  success: boolean;
  created?: boolean;
  existing?: boolean;
  linkedByEmail?: boolean;
  user?: {
    id: string;
    email: string | null;
    name?: string | null;
    birthDate?: string | null;
    birthTime?: string | null;
    birthPlace?: string | null;
    onboardingCompleted?: boolean;
  };
  onboardingCompleted?: boolean;
};

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`${label}_timeout`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function ensureUserProfileWithTimeout(data: {
  userId: string;
  email: string;
}): Promise<EnsureUserProfileResult> {
  try {
    return await withTimeout(
      authAPI.ensureUserProfile(data),
      ENSURE_PROFILE_TIMEOUT_MS,
      'ensure_profile'
    );
  } catch (error) {
    authLogger.warn(
      '⚠️ ensureUserProfile did not finish in time; continuing with Supabase session',
      error
    );
    return {
      success: false,
      user: {
        id: data.userId,
        email: data.email,
        onboardingCompleted: false,
      },
      onboardingCompleted: false,
    };
  }
}

function collectEmailLikeValues(value: unknown, out: string[] = []): string[] {
  if (!value) return out;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      out.push(trimmed);
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectEmailLikeValues(item, out));
    return out;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) =>
      collectEmailLikeValues(item, out)
    );
  }

  return out;
}

function getUserEmailFromProvider(user: any): string | null {
  if (!user) return null;
  const candidateStrings: Array<string | null | undefined> = [
    user.email,
    user.user_metadata?.email,
    user.user_metadata?.login,
    user.user_metadata?.sub,
    user.user_metadata?.preferred_username,
    user.app_metadata?.email,
    user.app_metadata?.login,
    user.raw_user_meta_data?.email,
  ];

  for (const candidate of candidateStrings) {
    if (
      typeof candidate === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.trim())
    ) {
      return candidate.trim();
    }
  }

  const nestedEmails = collectEmailLikeValues({
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
    raw_user_meta_data: user.raw_user_meta_data,
    identities: user.identities,
  });

  if (nestedEmails[0]) {
    return nestedEmails[0];
  }

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const identity of identities) {
    const identity1 = identity?.identity_data?.email;
    if (
      typeof identity1 === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity1.trim())
    ) {
      return identity1.trim();
    }
    const identity2 = identity?.identity_data?.login;
    if (
      typeof identity2 === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity2.trim())
    ) {
      return identity2.trim();
    }
  }

  return null;
}

function getUserNameFromProvider(user: any): string {
  if (!user) return '';
  const metadataName = user.user_metadata?.name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }
  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0];
  }
  if (typeof user.user_metadata?.login === 'string') {
    return user.user_metadata.login;
  }
  return '';
}

function optionalOnboardingCompleted(ensured: EnsureUserProfileResult): {
  onboardingCompleted?: boolean;
} {
  return typeof ensured.onboardingCompleted === 'boolean'
    ? { onboardingCompleted: ensured.onboardingCompleted }
    : {};
}

async function syncAccessToken(accessToken: string | null): Promise<void> {
  try {
    await tokenService.setToken(accessToken);
  } catch (error) {
    authLogger.warn('⚠️ Failed to sync auth token after sign in:', error);
  }
}

function getEmailFromYandexInfo(data: unknown): string | null {
  const value = data as Record<string, unknown> | null;
  if (!value || typeof value !== 'object') return null;

  const direct = [
    value.default_email,
    value.email,
    value.defaultEmail,
    value.login,
  ];

  for (const candidate of direct) {
    if (
      typeof candidate === 'string' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.trim())
    ) {
      return candidate.trim();
    }
  }

  const emails = collectEmailLikeValues(value.emails);
  return emails[0] ?? null;
}

async function getYandexEmailFromProviderToken(
  explicitProviderToken?: string | null
): Promise<string | null> {
  try {
    let providerToken = explicitProviderToken ?? null;
    if (!providerToken) {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        authLogger.warn('⚠️ Failed to read session for Yandex email:', error);
        return null;
      }
      providerToken = (data.session as any)?.provider_token ?? null;
    }

    if (typeof providerToken !== 'string' || !providerToken.trim()) {
      return null;
    }

    const response = await fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${providerToken}`,
      },
    });

    if (!response.ok) {
      authLogger.warn('⚠️ Yandex userinfo request failed:', response.status);
      return null;
    }

    return getEmailFromYandexInfo(await response.json());
  } catch (error) {
    authLogger.warn('⚠️ Failed to fetch Yandex userinfo:', error);
    return null;
  }
}

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

async function clearOtpRateLimitState(): Promise<void> {
  otpRateLimitState.lastAtMs = 0;
  otpRateLimitState.backoffSec = 60;

  if (Platform.OS === 'web') {
    try {
      // eslint-disable-next-line no-undef
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(OTP_RATE_LIMIT_STORAGE_KEY);
      }
    } catch (_error) {
      return;
    }
    return;
  }

  try {
    await AsyncStorage.removeItem(OTP_RATE_LIMIT_STORAGE_KEY);
  } catch (_error) {
    return;
  }
}

function getOtpErrorDetails(error: any): {
  message: string;
  status?: number;
  retryAfterSec?: number;
} {
  const status =
    typeof error?.response?.status === 'number'
      ? error.response.status
      : typeof error?.status === 'number'
        ? error.status
        : undefined;
  const responseData = error?.response?.data;
  const responseMessage =
    typeof responseData?.message === 'string'
      ? responseData.message
      : Array.isArray(responseData?.message)
        ? responseData.message.join(' ')
        : '';
  const message = responseMessage || String(error?.message || '');

  const retryAfterHeader =
    error?.response?.headers?.['retry-after'] ??
    error?.response?.headers?.['Retry-After'];
  const retryAfterFromHeader = Number(retryAfterHeader);
  const retryAfterValue = Number(responseData?.retryAfter);
  const retryAfterSec = Number.isFinite(retryAfterFromHeader)
    ? Math.max(1, Math.ceil(retryAfterFromHeader))
    : Number.isFinite(retryAfterValue)
      ? Math.max(1, Math.ceil((retryAfterValue - Date.now()) / 1000))
      : undefined;

  return { message, status, retryAfterSec };
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
    if (configuredOAuthRedirectUri) {
      authLogger.log('🔗 Configured redirect URI selected');
      return configuredOAuthRedirectUri;
    }

    // Web prod: same-origin callback route
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      window.location
    ) {
      return `${window.location.origin}/${OAUTH_REDIRECT_PATH}`;
    }

    // Native OAuth must use the app scheme. In Expo Go, makeRedirectUri()
    // produces an exp:// local URL, which can send Supabase/Google back to the
    // Expo development host instead of the app callback.
    authLogger.log(
      `🔗 Native redirect URI selected${isExpoGo() ? ' for Expo Go' : ''}`
    );
    return OAUTH_NATIVE_REDIRECT_URI;
  } catch (error) {
    authLogger.error('❌ Ошибка получения redirect URI:', error);
    return OAUTH_NATIVE_REDIRECT_URI;
  }
}

// Parse tokens from Supabase OAuth redirect URL (supports query and hash)
function extractFromRedirectUrl(redirectedUrl: string): {
  accessToken: string | null;
  refreshToken: string | null;
  providerToken: string | null;
  code: string | null;
  error: string | null;
  errorDescription: string | null;
} {
  const empty = {
    accessToken: null,
    refreshToken: null,
    providerToken: null,
    code: null,
    error: null,
    errorDescription: null,
  };

  const nestedUrlParamNames = [
    'redirect_to',
    'redirectTo',
    'return_to',
    'returnTo',
    'url',
    'link',
    'next',
  ];

  const parseUrl = (
    url: string,
    visited: Set<string>
  ): ReturnType<typeof extractFromRedirectUrl> => {
    if (!url || visited.has(url)) return empty;
    visited.add(url);

    const parsed = new URL(url);
    const search = parsed.searchParams;
    const hashString = parsed.hash?.startsWith('#')
      ? parsed.hash.slice(1)
      : parsed.hash || '';
    const hash = new URLSearchParams(hashString);
    const get = (k: string) => search.get(k) || hash.get(k);

    const direct = {
      accessToken: get('access_token'),
      refreshToken: get('refresh_token'),
      providerToken: get('provider_token'),
      code: get('code'),
      error: get('error'),
      errorDescription: get('error_description'),
    };

    if (
      direct.accessToken ||
      direct.refreshToken ||
      direct.providerToken ||
      direct.code ||
      direct.error ||
      direct.errorDescription
    ) {
      return direct;
    }

    for (const paramName of nestedUrlParamNames) {
      const nestedUrl = get(paramName);
      if (!nestedUrl) continue;

      try {
        const nested = parseUrl(decodeURIComponent(nestedUrl), visited);
        if (
          nested.accessToken ||
          nested.refreshToken ||
          nested.providerToken ||
          nested.code ||
          nested.error ||
          nested.errorDescription
        ) {
          return nested;
        }
      } catch (_nestedError) {
        // Continue checking other params.
      }
    }

    return empty;
  };

  try {
    return parseUrl(redirectedUrl, new Set<string>());
  } catch {
    return empty;
  }
}

function isOAuthRedirectUrl(url: string, redirectUri: string): boolean {
  if (url.startsWith(redirectUri)) return true;
  if (url.includes(OAUTH_REDIRECT_PATH)) return true;

  const parsed = extractFromRedirectUrl(url);
  return Boolean(
    parsed.accessToken ||
      parsed.refreshToken ||
      parsed.providerToken ||
      parsed.code ||
      parsed.error ||
      parsed.errorDescription
  );
}

async function openOAuthSession(
  authUrl: string,
  redirectUri: string
): Promise<string> {
  let linkingSubscription: EmitterSubscription | undefined;
  let stopSessionRecovery = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  let previousAccessToken: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    previousAccessToken = data.session?.access_token ?? null;
  } catch {
    previousAccessToken = null;
  }

  const linkingUrl = new Promise<string>((resolve) => {
    linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (url && isOAuthRedirectUrl(url, redirectUri)) {
        resolve(url);
      }
    });
  });

  const sessionEstablished = getExistingOAuthSession({
    previousAccessToken,
    timeoutMs: OAUTH_SESSION_TIMEOUT_MS,
    allowCurrentSession: false,
    initialDelayMs: 250,
    shouldStop: () => stopSessionRecovery,
  }).then((session) => {
    if (session) {
      return buildSessionEstablishedRedirectUrl(redirectUri);
    }

    return new Promise<string>(() => {
      // Keep this branch pending; the explicit timeout below owns the error.
    });
  });

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('OAuth авторизация не завершилась'));
    }, OAUTH_SESSION_TIMEOUT_MS);
  });

  try {
    try {
      WebBrowser.dismissBrowser();
    } catch {
      // No browser session is open. Continue with a fresh OAuth attempt.
    }

    authLogger.log('🔗 Opening OAuth browser session', {
      redirectUri,
      hasAuthUrl: !!authUrl,
    });

    const browserUrl = WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
      preferEphemeralSession: true,
    }).then(async (result) => {
      authLogger.log('🔗 OAuth browser session result', {
        type: result.type,
        hasUrl: 'url' in result ? !!result.url : false,
      });

      if (result.type === 'success' && result.url) {
        return result.url;
      }

      const recoveredSession = await getExistingOAuthSession({
        previousAccessToken,
        timeoutMs: 2500,
        allowCurrentSession: false,
      });
      if (recoveredSession) {
        return buildSessionEstablishedRedirectUrl(redirectUri);
      }

      throw new Error('Авторизация отменена или не завершена');
    });

    return await Promise.race([
      browserUrl,
      linkingUrl,
      sessionEstablished,
      timeout,
    ]);
  } finally {
    stopSessionRecovery = true;
    if (timeoutId) clearTimeout(timeoutId);
    linkingSubscription?.remove();
  }
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function buildSessionEstablishedRedirectUrl(redirectUri: string): string {
  return `${redirectUri}${redirectUri.includes('?') ? '&' : '?'}session_established=1`;
}

async function getExistingOAuthSession(
  options: {
    previousAccessToken?: string | null;
    timeoutMs?: number;
    allowCurrentSession?: boolean;
    initialDelayMs?: number;
    shouldStop?: () => boolean;
  } = {}
): Promise<{
  accessToken: string;
  refreshToken: string;
} | null> {
  const {
    previousAccessToken = null,
    timeoutMs = OAUTH_SESSION_RECOVERY_MS,
    allowCurrentSession = true,
    initialDelayMs = 0,
    shouldStop = () => false,
  } = options;
  const startedAt = Date.now();

  if (initialDelayMs > 0) {
    await wait(initialDelayMs);
  }

  while (!shouldStop()) {
    let existingSessionData: Awaited<
      ReturnType<typeof supabase.auth.getSession>
    >['data'];

    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        authLogger.warn(
          '⚠️ Failed to inspect Supabase session after OAuth:',
          sessionError
        );
      }
      existingSessionData = data;
    } catch (sessionError) {
      authLogger.warn(
        '⚠️ Failed to inspect Supabase session after OAuth:',
        sessionError
      );
      existingSessionData = { session: null };
    }

    const existingAccessToken =
      existingSessionData.session?.access_token ?? null;
    const existingRefreshToken =
      existingSessionData.session?.refresh_token ?? null;

    const isExpectedSession =
      allowCurrentSession || existingAccessToken !== previousAccessToken;

    if (existingAccessToken && existingRefreshToken && isExpectedSession) {
      authLogger.log(
        '✅ OAuth session recovered from existing Supabase session'
      );
      return {
        accessToken: existingAccessToken,
        refreshToken: existingRefreshToken,
      };
    }

    if (Date.now() - startedAt >= timeoutMs) {
      break;
    }

    await wait(250);
  }

  return null;
}

async function establishSessionFromRedirectUrl(redirectedUrl: string): Promise<{
  accessToken: string;
  refreshToken: string;
  providerToken?: string | null;
}> {
  authLogger.log('↩️ OAuth redirect received');
  const {
    accessToken,
    refreshToken,
    providerToken,
    code,
    error,
    errorDescription,
  } = extractFromRedirectUrl(redirectedUrl);

  if (error || errorDescription) {
    throw new Error(errorDescription || error || 'OAuth authorization failed');
  }

  if (accessToken && refreshToken) {
    const { error: setErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (setErr) {
      throw setErr;
    }

    await syncAccessToken(accessToken);
    return { accessToken, refreshToken, providerToken };
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

    await syncAccessToken(exchangedAccessToken);
    return {
      accessToken: exchangedAccessToken,
      refreshToken: exchangedRefreshToken,
      providerToken: (sessionData.session as any)?.provider_token ?? null,
    };
  }

  // Some providers can return control to the app without preserving query/hash
  // params on the native deep link. In that case, try the current Supabase session
  // before failing hard.
  const existingSession = await getExistingOAuthSession();
  if (existingSession) {
    await syncAccessToken(existingSession.accessToken);
    return existingSession;
  }

  throw new Error('Токены или code не получены из OAuth потока');
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

      if (waitMs > 0 && stored.backoffSec <= 60) {
        const retryAfterSec = Math.max(1, Math.ceil(waitMs / 1000));
        const err: any = new Error(
          `Лимит отправки писем исчерпан. Подождите ${retryAfterSec} секунд и попробуйте снова.`
        );
        err.code = 'email_rate_limit_exceeded';
        err.retryAfterSec = retryAfterSec;
        err.status = 429;

        authLogger.warn('⏳ OTP client-side throttle hit:', {
          retryAfterSec,
          backoffSec: stored.backoffSec,
        });

        throw err;
      }

      if (waitMs > 0) {
        await clearOtpRateLimitState();
      }

      authLogger.log('📧 Отправка OTP через Backend → Supabase');
      authLogger.log('➡️ POST /auth/send-magic-link');

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
      const details = getOtpErrorDetails(error);
      const rawMsg = details.message;

      // Supabase can return: "email rate limit exceeded"
      const isEmailRateLimit =
        details.status === 429 ||
        ((details.status === 403 || details.status === 400) &&
          /too many|rate limit|лимит/i.test(rawMsg)) ||
        /email rate limit exceeded/i.test(rawMsg) ||
        /rate limit/i.test(rawMsg);

      if (isEmailRateLimit) {
        const retryAfterSec =
          Number((error as any)?.retryAfterSec) || details.retryAfterSec || 60;

        await clearOtpRateLimitState();

        // attach metadata for UI (screens can read it to disable button / show countdown)
        (error as any).code =
          (error as any)?.code || 'email_rate_limit_exceeded';
        (error as any).retryAfterSec = retryAfterSec;
        (error as any).status = 429;

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
        status: (error as any)?.status ?? details.status,
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
        await syncAccessToken(data.session.access_token);
      } catch (setErr) {
        authLogger.warn('⚠️ Failed to set Supabase session after OTP:', setErr);
      }

      authLogger.log('✅ Код подтвержден');

      let ensured: EnsureUserProfileResult;
      try {
        ensured = await ensureUserProfileWithTimeout({
          userId: data.user!.id,
          email: data.user!.email!,
        });
      } catch (ensureError: any) {
        authLogger.error(
          '❌ ensureUserProfile failed after OTP verification:',
          ensureError
        );
        throw new Error('Не удалось создать профиль пользователя');
      }

      return {
        access_token: data.session.access_token,
        user: {
          id: data.user!.id,
          email: data.user!.email!,
          name: (data.user!.user_metadata as any)?.name || '',
          ...optionalOnboardingCompleted(ensured),
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
      authLogger.log('🍎 Apple sign in start');

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
        await syncAccessToken(accessToken);

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes?.user;
        if (!user)
          throw new Error(
            'Не удалось получить пользователя после Apple sign in'
          );

        const email = getUserEmailFromProvider(user);
        if (!email) {
          throw new Error('Email не получен от Apple провайдера');
        }

        const ensured = await ensureUserProfileWithTimeout({
          userId: user.id,
          email,
        });

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email,
            name: getUserNameFromProvider(user),
            ...optionalOnboardingCompleted(ensured),
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
        const redirectedUrl = await openOAuthSession(data.url, redirectUri);
        const { accessToken } =
          await establishSessionFromRedirectUrl(redirectedUrl);

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) {
          throw new Error('Не удалось получить пользователя после Apple OAuth');
        }

        const email = getUserEmailFromProvider(user);
        if (!email) {
          throw new Error('Email не получен от Apple провайдера');
        }

        const ensured = await ensureUserProfileWithTimeout({
          userId: user.id,
          email,
        });

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email,
            name: getUserNameFromProvider(user),
            ...optionalOnboardingCompleted(ensured),
          },
        };
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
      authLogger.log('🔗 Google redirect URI prepared');

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
        const redirectedUrl = await openOAuthSession(data.url, redirectUri);
        const { accessToken } =
          await establishSessionFromRedirectUrl(redirectedUrl);

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) throw new Error('Не удалось получить данные пользователя');

        const email = getUserEmailFromProvider(user);
        if (!email) {
          throw new Error('Email не получен от OAuth провайдера');
        }

        const ensured = await ensureUserProfileWithTimeout({
          userId: user.id,
          email,
        });

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email,
            name: getUserNameFromProvider(user),
            ...optionalOnboardingCompleted(ensured),
          },
        };
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
      authLogger.log('🔗 Yandex redirect URI prepared');

      const yandexScope = 'login:email login:info';
      const credentials = {
        // `custom:*` identifier must match the provider configured in Supabase Auth.
        provider: YANDEX_OAUTH_PROVIDER,
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          scopes: yandexScope,
          queryParams: {
            scope: yandexScope,
          },
        },
      } as unknown as SignInWithOAuthCredentials;

      const { data, error } = await supabase.auth.signInWithOAuth(credentials);
      if (error) throw error;

      if (data.url) {
        const redirectedUrl = await openOAuthSession(data.url, redirectUri);
        const { accessToken, providerToken } =
          await establishSessionFromRedirectUrl(redirectedUrl);

        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) throw new Error('Не удалось получить данные пользователя');

        const email =
          getUserEmailFromProvider(user) ||
          (await getYandexEmailFromProviderToken(providerToken));
        if (!email) {
          throw new Error('Email не получен от Yandex провайдера');
        }

        const ensured = await ensureUserProfileWithTimeout({
          userId: user.id,
          email,
        });

        return {
          access_token: accessToken || '',
          user: {
            id: user.id,
            email,
            name: getUserNameFromProvider(user),
            ...optionalOnboardingCompleted(ensured),
          },
        };
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
    latitude?: number;
    longitude?: number;
    timezone?: string;
    birthTimeKnown?: boolean;
  }): Promise<{
    success: boolean;
    user?: AuthResponse['user'];
  }> => {
    try {
      authLogger.log('📝 Завершение регистрации');
      const response = await api.post('/auth/complete-signup', {
        userId: data.userId,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime || '12:00',
        birthPlace: data.birthPlace || 'Moscow',
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        birthTimeKnown: data.birthTimeKnown,
      });
      authLogger.log('✅ Регистрация завершена');
      return response.data;
    } catch (error: any) {
      authLogger.error('❌ Complete signup failed:', error);
      throw error;
    }
  },

  ensureUserProfile: async (data: {
    userId: string;
    email: string;
  }): Promise<EnsureUserProfileResult> => {
    try {
      const response = await api.post('/auth/ensure-profile', {
        userId: data.userId,
        email: data.email,
      });
      return response.data;
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
