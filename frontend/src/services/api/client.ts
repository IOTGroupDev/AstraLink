import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../supabase';
import { apiLogger } from '../logger';
import { tokenService } from '../tokenService';
import i18n from '../../i18n';
import { invalidateLocalAuthSession } from '../authInvalidation';
import { useAuthStore } from '../../stores/auth.store';

// Ensure base URL ends with /api/v1 (API versioning)
function ensureApiBase(url: string): string {
  try {
    const u = (url || '').trim();
    if (!u) return '/api/v1';
    if (u.endsWith('/api/v1')) return u;
    if (u.endsWith('/api')) return u + '/v1';
    return u.replace(/\/+$/, '') + '/api/v1';
  } catch {
    return url;
  }
}

const getApiBaseUrl = () => {
  // 1) Явная переменная окружения имеет приоритет
  const envUrl =
    (typeof process !== 'undefined' &&
      (process as any)?.env?.EXPO_PUBLIC_API_URL) ||
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL;

  // Флаг: внешний прокси уже монтирует backend под /api (например, Nginx/Cloudflare)
  const hasApiPrefix =
    (typeof process !== 'undefined' &&
      (process as any)?.env?.EXPO_PUBLIC_API_HAS_PREFIX === 'true') ||
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_HAS_PREFIX ===
      'true';

  if (envUrl) {
    // Если прокси уже добавляет /api — не модифицируем путь
    const trimmed = (envUrl as string).trim().replace(/\/+$/, '');
    return hasApiPrefix ? trimmed : ensureApiBase(trimmed);
  }

  // 2) Web (браузер/Expo Web): используем текущий origin
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location
  ) {
    return `${window.location.origin}/api/v1`;
  }

  // 3) Попробуем взять хост из Expo (для LAN/туннеля)
  const anyConst: any = Constants;
  const hostUri: string | undefined =
    anyConst?.expoGoConfig?.hostUri ||
    anyConst?.expoConfig?.hostUri ||
    anyConst?.manifest2?.extra?.expoClient?.hostUri ||
    anyConst?.manifest?.hostUri;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3000/api/v1`;
  }

  // 4) Фолбэк — localhost
  return 'http://localhost:3000/api/v1';
};

export const API_BASE_URL = getApiBaseUrl();
apiLogger.log('🌐 API Base URL:', API_BASE_URL);

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Список публичных эндпоинтов (не требуют авторизации)
const PUBLIC_ENDPOINTS = [
  '/auth/signup',
  '/auth/verify',
  '/auth/magic-link',
  '/auth/send-magic-link',
  '/geo/cities',
];

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function getAccessTokenWithRetry(): Promise<string | null> {
  const storeToken = useAuthStore.getState().session?.access_token ?? null;
  if (storeToken) {
    try {
      await tokenService.setToken(storeToken);
    } catch {
      // token cache sync failure should not block the request
    }
    return storeToken;
  }

  const maxAttempts = 6;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        apiLogger.warn(
          '⚠️ supabase.auth.getSession failed during token lookup:',
          error
        );
      }

      const token = data.session?.access_token ?? null;
      if (token) {
        try {
          await tokenService.setToken(token);
        } catch {
          // token cache sync failure should not block the request
        }
        return token;
      }
    } catch (error) {
      apiLogger.warn('⚠️ Unexpected token lookup error:', error);
    }

    if (attempt < maxAttempts - 1) {
      await sleep(200);
    }
  }

  try {
    return await tokenService.getToken();
  } catch (error) {
    apiLogger.warn('⚠️ tokenService.getToken failed:', error);
    return null;
  }
}

function getNormalizedLocale(): 'ru' | 'en' | 'es' {
  const rawLocale = String(i18n.language || 'en').toLowerCase();
  if (rawLocale.startsWith('ru')) return 'ru';
  if (rawLocale.startsWith('es')) return 'es';
  return 'en';
}

function getSafeRequestLabel(config: {
  method?: string;
  url?: string;
}): string {
  const method = config.method?.toUpperCase() ?? 'GET';
  const path =
    String(config.url ?? '')
      .split('?')[0]
      .split('#')[0] || '/';
  return `${method} ${path}`;
}

function getBearerTokenFromHeader(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/^Bearer%20/i, 'Bearer ').trim();
  const match = normalized.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

async function shouldInvalidateAuthFor401(error: any): Promise<boolean> {
  const requestToken =
    getBearerTokenFromHeader(error?.config?.headers?.Authorization) ??
    getBearerTokenFromHeader(error?.config?.headers?.authorization);

  try {
    const { data } = await supabase.auth.getSession();
    const currentToken = data.session?.access_token ?? null;

    // Supabase Auth is the source of truth on the client. A protected backend
    // request can return 401 while the local Supabase session is still valid
    // (profile race, stale request, backend/profile mismatch). Do not let one
    // failed API call tear down a live mobile session.
    if (currentToken) {
      apiLogger.warn(
        requestToken && requestToken !== currentToken
          ? 'Ignoring 401 from stale request token:'
          : 'Ignoring 401 while Supabase session exists:',
        getSafeRequestLabel(error?.config ?? {})
      );
      return false;
    }

    return true;
  } catch (sessionError) {
    apiLogger.warn(
      'Failed to compare session token for 401 handling:',
      sessionError
    );
    return true;
  }
}

// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
  const requestLabel = getSafeRequestLabel(config);
  const locale = getNormalizedLocale();

  (config.headers as any)['x-locale'] = locale;
  (config.headers as any)['Accept-Language'] = locale;

  // Проверяем, публичный ли это эндпоинт
  const isPublic = PUBLIC_ENDPOINTS.some((endpoint) =>
    config.url?.includes(endpoint)
  );

  // Для публичных эндпоинтов токен не нужен
  if (isPublic) {
    apiLogger.log('🌐 Public endpoint, no token required:', requestLabel);
    return config;
  }

  // Для защищенных эндпоинтов требуем токен
  apiLogger.log('🔍 Получение токена для запроса:', requestLabel);

  try {
    const token = await getAccessTokenWithRetry();

    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
      apiLogger.log('🔐 Добавлен токен к запросу:', requestLabel);
    } else {
      apiLogger.error('❌ No token for protected endpoint:', requestLabel);
      // Отменяем запрос, но не сбрасываем auth state здесь: на старте приложения
      // protected prefetch может стартовать раньше, чем Supabase восстановит session.
      // Реальную невалидную сессию обрабатывает 401 от backend ниже.
      return Promise.reject(
        new Error('Authentication required but no token available')
      );
    }
  } catch (error) {
    apiLogger.error('❌ Ошибка получения токена:', error);
    return Promise.reject(error);
  }

  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestLabel = getSafeRequestLabel(error?.config ?? {});
    const status = error?.response?.status ?? 'ERR';
    apiLogger.error(
      `❌ HTTP ${status} for ${requestLabel}`,
      error?.response?.data ?? error?.message
    );

    if (
      error.response?.status === 401 &&
      (await shouldInvalidateAuthFor401(error))
    ) {
      apiLogger.error(`❌ HTTP 401 auth failure - resetting local session`);
      await invalidateLocalAuthSession(`401 from ${requestLabel}`);
    }
    return Promise.reject(error);
  }
);
