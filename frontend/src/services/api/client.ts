import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../supabase';
import { apiLogger } from '../logger';

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

// Request interceptor - add auth token
api.interceptors.request.use(async (config) => {
  const fullUrl = `${(config as any).baseURL ?? ''}${config.url ?? ''}`;
  apiLogger.log('🔍 Получение токена для запроса:', fullUrl);

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
      apiLogger.log('🔐 Добавлен токен к запросу:', fullUrl);
    } else {
      apiLogger.warn('⚠️ Нет токена для запроса:', fullUrl);
    }
  } catch (error) {
    apiLogger.error('❌ Ошибка получения токена:', error);
  }

  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const fullUrl = `${error?.config?.baseURL ?? ''}${error?.config?.url ?? ''}`;
    const status = error?.response?.status ?? 'ERR';
    apiLogger.error(
      `❌ HTTP ${status} for ${fullUrl}`,
      error?.response?.data ?? error?.message
    );

    if (error.response?.status === 401) {
      apiLogger.error('❌ 401 Unauthorized - токен истек или недействителен');
    }
    return Promise.reject(error);
  }
);
