import axios, { AxiosError, AxiosHeaders } from 'axios';
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  Chart,
  TransitsResponse,
  UserProfile,
  UpdateProfileRequest,
  Subscription,
  UpgradeSubscriptionRequest,
  LunarCalendarDay,
  LunarDay,
  MoonPhase,
} from '../types';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { SubscriptionTier } from '../types/subscription';
import { tokenService } from './tokenService';
import { useAuthStore } from '../stores/auth.store';
import {
  StartConversationRequest,
  StartConversationResponse,
} from '../types/chat';

WebBrowser.maybeCompleteAuthSession();

// --------------------------------------------------
// Base URL selection (Expo Go / Web / Native)
// --------------------------------------------------

// Ensure base URL ends with /api (because backend uses global prefix 'api')
function ensureApiBase(url: string): string {
  try {
    const u = (url || '').trim();
    if (!u) return '/api';
    if (u.endsWith('/api')) return u;
    return u.replace(/\/+$/, '') + '/api';
  } catch {
    return url;
  }
}

const getApiBaseUrl = () => {
  // // 1) ENV overrides (prod/staging)
  // const ENV =
  //   typeof process !== 'undefined' && (process as any)?.env
  //     ? (process as any).env
  //     : ({} as any);
  // const ENV_URL: string | undefined = ENV.EXPO_PUBLIC_API_URL || ENV.API_URL;
  //
  // // Special case for Web: prefer same-host to avoid CORS during dev
  // if (Platform.OS === 'web') {
  //   try {
  //     if (ENV_URL && typeof window !== 'undefined' && window.location) {
  //       const envHost = new URL(ENV_URL).hostname;
  //       const curHost = window.location.hostname;
  //       // Use ENV_URL only if it matches current host (so no CORS); otherwise ignore it on web
  //       if (envHost === curHost) {
  //         return ENV_URL;
  //       }
  //     }
  //   } catch {
  //     // ignore parse errors and continue with detection
  //   }
  // } else {
  //   // Native: accept ENV_URL as-is (LAN/IP setup for device/emulator)
  //   if (ENV_URL) return ENV_URL;
  // }
  //
  // // 2) Try to detect host (LAN / emulator) dynamically
  // const detectHost = (): string | null => {
  //   try {
  //     // Web: use current hostname
  //     if (
  //       Platform.OS === 'web' &&
  //       typeof window !== 'undefined' &&
  //       window.location
  //     ) {
  //       return window.location.hostname || null;
  //     }
  //
  //     // Native (Expo Go): use host from Expo Constants
  //     // Try multiple fields to be robust across SDK versions
  //     const anyConst: any = Constants as any;
  //     const hostUri: string | undefined =
  //       anyConst?.expoConfig?.hostUri ||
  //       anyConst?.manifest2?.extra?.expoGo?.developerHost ||
  //       anyConst?.manifest?.debuggerHost;
  //
  //     if (hostUri) {
  //       // Examples:
  //       // - "192.168.1.100:19000"
  //       // - "localhost:19000"
  //       const host = hostUri.split(':')[0];
  //       return host || null;
  //     }
  //   } catch {
  //     // ignore
  //   }
  //   return null;
  // };
  //
  // const host = detectHost();
  //
  // // Android emulator special-case
  // if (Platform.OS === 'android') {
  //   if (!host || host === 'localhost' || host === '127.0.0.1') {
  //     // 10.0.2.2 maps to host machine from Android emulator
  //     return 'http://10.0.2.2:3000/api';
  //   }
  // }
  //
  // // No host detected -> assume local backend on dev machine
  // if (!host) {
  //   return 'http://localhost:3000/api';
  // }
  //
  // // Determine if host looks local/LAN
  // const isLocalOrLan =
  //   host === 'localhost' ||
  //   host === '127.0.0.1' ||
  //   /^192\.168\./.test(host) ||
  //   /^10\./.test(host);
  //
  // // 3) Web production without ENV: warn and try same host:3000
  // if (Platform.OS === 'web' && !isLocalOrLan) {
  //   console.warn(
  //     '[API] EXPO_PUBLIC_API_URL not set for web production. Using fallback http://' +
  //       host +
  //       ':3000/api'
  //   );
  // }
  //
  // // 4) Default: use detected host on port 3000 with /api prefix
  // return `http://${host}:3000/api`;

  // 1) Явная переменная окружения имеет приоритет
  const envUrl =
    (typeof process !== 'undefined' &&
      (process as any)?.env?.EXPO_PUBLIC_API_URL) ||
    (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_API_URL;
  if (envUrl) return ensureApiBase(envUrl);

  // 2) Web (браузер/Expo Web): используем текущий origin
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    window.location
  ) {
    return `${window.location.origin}/api`;
  }

  // 3) Попробуем взять хост из Expo (для LAN/туннеля)
  const anyConst: any = Constants;
  const hostUri: string | undefined =
    anyConst?.expoGoConfig?.hostUri ||
    anyConst?.expoConfig?.hostUri ||
    anyConst?.manifest2?.extra?.expoClient?.hostUri ||
    anyConst?.manifest?.hostUri;

  if (hostUri) {
    // hostUri часто вида "192.168.1.69:8081" или "rknloqc-andreiya-8081.exp.direct"
    const host = hostUri.split(':')[0]; // до первого двоеточия
    // если это домен *.exp.direct — всё равно пробуем 3000
    return `http://${host}:3000/api`;
  }

  // 4) Фолбэк — localhost (рабочий для твоего кейса сейчас)
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --------------------------------------------------
// Axios interceptors
// --------------------------------------------------
api.interceptors.request.use(async (config) => {
  console.log('🔍 Получение токена для запроса:', config.url);

  try {
    // ✅ ИЗМЕНЕНИЕ: берем токен из Supabase напрямую
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
      console.log(
        '🔐 Добавлен токен к запросу:',
        config.url,
        token.substring(0, 20) + '...'
      );
    } else {
      console.log('⚠️ Токен отсутствует для запроса:', config.url);
      const url = config.url || '';
      const isProtected =
        (url.includes('/chart/') ||
          url.includes('/user/') ||
          url.includes('/connections/') ||
          url.includes('/dating/') ||
          url.includes('/subscription/')) &&
        !url.includes('/chart/test');

      if (isProtected) {
        console.log('🚫 Блокировка запроса без токена:', config.url);
        return Promise.reject({
          response: {
            status: 401,
            data: { message: 'Требуется аутентификация' },
          },
        });
      }
    }
  } catch (error) {
    console.log('❌ Ошибка в интерцепторе запроса:', error);
    const url = config.url || '';
    const isProtected =
      (url.includes('/chart/') ||
        url.includes('/user/') ||
        url.includes('/connections/') ||
        url.includes('/dating/') ||
        url.includes('/subscription/')) &&
      !url.includes('/chart/test');

    if (isProtected) {
      return Promise.reject({
        response: {
          status: 401,
          data: { message: 'Ошибка аутентификации' },
        },
      });
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('✅ API ответ:', response.config.url, response.status);
    return response;
  },
  async (error) => {
    console.log(
      '❌ API ошибка:',
      error.config?.url,
      error.response?.status,
      error.message
    );

    const url: string | undefined = error.config?.url;

    // Ранние 401/404 на /user/profile или /auth/complete-signup могут происходить при рестарте backend.
    // НЕ выполняем auto signOut/clearToken, чтобы не терять сессию Supabase. Дадим UI/повторным попыткам восстановиться.
    if (
      (error.response?.status === 401 || error.response?.status === 404) &&
      url &&
      (url.includes('/user/profile') || url.includes('/auth/complete-signup'))
    ) {
      console.log(
        '⏳ Профиль временно недоступен (',
        error.response?.status,
        '), сессию не сбрасываем.'
      );
    }

    if (error.response?.status === 401) {
      // Не очищаем токен автоматически на любой 401.
      // Причины:
      // - единичные 401 на защищённых эндпоинтах (например, истёкшая сессия бэкенда) не должны стирать secure-токен Supabase
      // - "al_token_secure" не должен стираться без явного logout'а или onAuthStateChange(null)
      console.log('🔄 Ошибка 401, токен НЕ очищаем автоматически');
      // Если потребуется принудительный логаут — делайте это явно в UI или по спец-коду ответа сервера
    }

    return Promise.reject(error);
  }
);

// --------------------------------------------------
// Redirect URI helper for OTP/Magic Link/OAuth
// --------------------------------------------------
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
      console.log('🔗 DEV redirect via AuthSession proxy:', url);
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
    console.log('🔗 PROD native redirect URI via makeRedirectUri:', url);
    return url;
  } catch (error) {
    console.error('❌ Ошибка получения redirect URI:', error);
    return 'astralink://auth/callback';
  }
}

function headersToPlain(h: any): Record<string, string> {
  if (!h) return {};
  const out: Record<string, string> = {};
  // AxiosHeaders v1/v2
  if (typeof (h as AxiosHeaders).forEach === 'function') {
    (h as AxiosHeaders).forEach((v: any, k: string) => (out[k] = String(v)));
    return out;
  }
  // Plain object
  for (const k of Object.keys(h)) out[k] = String(h[k]);
  return out;
}

function safeJsonify(value: any) {
  try {
    if (typeof value === 'string') return value;
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

export interface DebugHttpDump {
  durationMs: number;
  request: {
    method?: string;
    baseURL?: string;
    url?: string;
    fullUrl?: string;
    headers: Record<string, string>;
    data?: any;
    params?: any;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: any;
  };
  error?: {
    message: string;
    code?: string;
    isAxiosError: boolean;
  };
}

/**
 * Делает GET /health и возвращает полный дамп запроса/ответа
 */
export async function testBackendDebug(): Promise<DebugHttpDump> {
  const started = Date.now();
  try {
    const res = await api.get('/health', {
      headers: { 'X-Debug': 'on' },
    });

    const durationMs = Date.now() - started;
    const cfg = res.config || {};
    const baseURL = (cfg as any).baseURL || '';
    const url = (cfg as any).url || '';
    const fullUrl = `${baseURL}${url}`;

    return {
      durationMs,
      request: {
        method: (cfg as any).method,
        baseURL,
        url,
        fullUrl,
        headers: headersToPlain((cfg as any).headers),
        data: safeJsonify((cfg as any).data),
        params: safeJsonify((cfg as any).params),
      },
      response: {
        status: res.status,
        statusText: res.statusText,
        headers: headersToPlain(res.headers),
        data: safeJsonify(res.data),
      },
    };
  } catch (e) {
    const err = e as AxiosError;
    const durationMs = Date.now() - started;
    const cfg = err.config || {};
    const baseURL = (cfg as any).baseURL || '';
    const url = (cfg as any).url || '';
    const fullUrl = `${baseURL}${url}`;

    const dump: DebugHttpDump = {
      durationMs,
      request: {
        method: (cfg as any).method,
        baseURL,
        url,
        fullUrl,
        headers: headersToPlain((cfg as any).headers),
        data: safeJsonify((cfg as any).data),
        params: safeJsonify((cfg as any).params),
      },
      error: {
        message: err.message,
        code: err.code,
        isAxiosError: !!(err as any).isAxiosError,
      },
    };

    if (err.response) {
      dump.response = {
        status: err.response.status,
        statusText: err.response.statusText || '',
        headers: headersToPlain(err.response.headers || {}),
        data: safeJsonify(err.response.data),
      };
    }

    return dump;
  }
}

// --------------------------------------------------
// Auth API (backend + Supabase auth layer)
// --------------------------------------------------
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('🔐 Отправляем данные для входа через Backend API:', {
        email: data.email,
      });

      const response = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { access_token, user } = response.data;
      if (!access_token) throw new Error('Токен не получен от Backend');

      await tokenService.setToken(access_token);
      console.log('✅ Успешный вход через Backend');

      return { access_token, user };
    } catch (error: any) {
      console.log('❌ API login failed:', error);
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
      console.log(
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

      console.log('✅ Успешная регистрация через Backend');

      const { user, access_token } = response.data;
      await tokenService.setToken(access_token);
      return { access_token, user };
    } catch (error: any) {
      console.log('❌ API signup failed:', error);
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
      console.log('📧 Отправка OTP через Supabase на:', email);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      console.log('✅ OTP отправлен');
      return { success: true, message: 'Код отправлен на email' };
    } catch (error: any) {
      console.error('❌ Ошибка отправки OTP:', error);
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
      console.log('🔐 Проверка OTP кода');
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      if (!data.session) throw new Error('Не удалось создать сессию');

      await tokenService.setToken(data.session.access_token);
      console.log('✅ Код подтвержден');

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
      console.error('❌ Ошибка проверки кода:', error);
      if (error.message?.includes('expired'))
        error.message = 'Код истек. Запросите новый код';
      else if (error.message?.includes('invalid'))
        error.message = 'Неверный код';
      else error.message = error.message || 'Не удалось проверить код';
      throw error;
    }
  },

  googleSignIn: async (): Promise<AuthResponse> => {
    try {
      console.log('🔐 Начало Google OAuth');
      const redirectUri = getRedirectUri();
      console.log('🔗 Google Redirect URI:', redirectUri);

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
          const url = new URL(result.url);
          const accessToken =
            url.searchParams.get('access_token') ||
            new URLSearchParams(url.hash.replace('#', '')).get('access_token');

          if (accessToken) {
            await tokenService.setToken(accessToken);
            const { data: userRes } = await supabase.auth.getUser(accessToken);
            const user = userRes.user;
            if (!user)
              throw new Error('Не удалось получить данные пользователя');
            return {
              access_token: accessToken,
              user: {
                id: user.id,
                email: user.email!,
                name: (user.user_metadata as any)?.name || '',
                role: 'user',
              },
            };
          }
        }
        throw new Error('Авторизация отменена или не завершена');
      }

      throw new Error('Не удалось инициировать OAuth');
    } catch (error: any) {
      console.error('❌ Google sign in failed:', error);
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
      console.log('📝 Завершение регистрации:', data);
      await api.post('/auth/complete-signup', {
        userId: data.userId,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime || '12:00',
        birthPlace: data.birthPlace || 'Moscow',
      });
      console.log('✅ Регистрация завершена');
    } catch (error: any) {
      console.error('❌ Complete signup failed:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      console.log('👋 Выход из системы');
      await supabase.auth.signOut();
      tokenService.clearToken();
      console.log('✅ Выход выполнен');
    } catch (error: any) {
      console.error('❌ Logout failed:', error);
      tokenService.clearToken();
      throw error;
    }
  },
};

// --------------------------------------------------
// User API
// --------------------------------------------------
export const userAPI = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  // Back-compat wrappers -> delegate to subscriptionAPI endpoints
  getSubscription: async (): Promise<Subscription> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },

  upgradeSubscription: async (
    data: UpgradeSubscriptionRequest
  ): Promise<Subscription> => {
    const response = await api.post('/subscription/upgrade', data);
    return response.data;
  },

  cancelSubscription: async (): Promise<void> => {
    await api.post('/subscription/cancel');
  },

  deleteAccount: async (): Promise<void> => {
    try {
      console.log('🗑️ Отправка запроса на удаление аккаунта');
      const response = await api.delete('/user/account');
      console.log('✅ Аккаунт успешно удален', response.data);
      tokenService.clearToken();
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка удаления аккаунта:', error);
      if (error.response?.status === 401)
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      else if (error.response?.status === 404)
        throw new Error('Пользователь не найден.');
      else if (error.response?.data?.message)
        throw new Error(error.response.data.message);
      else throw new Error('Не удалось удалить аккаунт. Попробуйте позже.');
    }
  },
};

// --------------------------------------------------
// Connections API
// --------------------------------------------------
export const connectionsAPI = {
  getConnections: async (): Promise<any[]> => {
    const response = await api.get('/connections');
    return response.data;
  },

  createConnection: async (data: any): Promise<any> => {
    const response = await api.post('/connections', data);
    return response.data;
  },

  getSynastry: async (connectionId: string): Promise<any> => {
    const response = await api.get(`/connections/${connectionId}/synastry`);
    return response.data;
  },

  getComposite: async (connectionId: string): Promise<any> => {
    const response = await api.get(`/connections/${connectionId}/composite`);
    return response.data;
  },
};

// --------------------------------------------------
// Dating API
// --------------------------------------------------
export const datingAPI = {
  // Candidate feed (badge-only)
  getCandidates: async (
    limit = 20
  ): Promise<
    Array<{
      userId: string;
      badge: 'high' | 'medium' | 'low';
      photoUrl: string | null;
      avatarUrl?: string | null;
      name?: string | null;
      age?: number | null;
      zodiacSign?: string | null;
      bio?: string | null;
      interests?: string[] | null;
      city?: string | null;
    }>
  > => {
    const safeLimit = Math.max(1, Math.min(50, limit));
    const response = await api.get(`/dating/candidates?limit=${safeLimit}`);
    const raw = response?.data;
    // Унификация формы ответа: поддерживаем и массив, и {items}
    const list: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
        ? raw.items
        : [];
    // Нормализуем разные возможные ключи полей, чтобы UI получал ожидаемые данные
    return list.map((it: any) => {
      const photo =
        it?.photoUrl ?? it?.primaryPhotoUrl ?? it?.avatarUrl ?? null;
      return {
        userId: it?.userId ?? it?.user_id ?? it?.id ?? '',
        badge: (it?.badge ?? 'low') as 'high' | 'medium' | 'low',
        photoUrl: photo,
        avatarUrl: it?.avatarUrl ?? null,
        name: it?.name ?? null,
        age: typeof it?.age === 'number' ? it.age : (it?.age ?? null),
        zodiacSign: it?.zodiacSign ?? it?.sign ?? null,
        bio: it?.bio ?? null,
        interests: Array.isArray(it?.interests) ? it.interests : null,
        city: it?.city ?? null,
      };
    });
  },

  // Public profile for Dating card (backend aggregates users + user_profiles + charts + photos)
  getProfile: async (
    userId: string
  ): Promise<{
    userId: string;
    name: string | null;
    age: number | null;
    zodiacSign: string | null;
    bio: string | null;
    interests: string[] | null;
    city: string | null;
    primaryPhotoUrl: string | null;
    photos?: string[] | null;
  }> => {
    const response = await api.get(
      `/dating/profile/${encodeURIComponent(userId)}`
    );
    const d = response?.data || {};
    return {
      userId: d?.userId ?? userId,
      name: d?.name ?? null,
      age: typeof d?.age === 'number' ? d.age : (d?.age ?? null),
      zodiacSign: d?.zodiacSign ?? d?.sign ?? null,
      bio: d?.bio ?? null,
      interests: Array.isArray(d?.interests) ? d.interests : null,
      city: d?.city ?? null,
      primaryPhotoUrl: d?.primaryPhotoUrl ?? null,
      photos: Array.isArray(d?.photos) ? d.photos : null,
    };
  },

  like: async (
    targetUserId: string,
    action: 'like' | 'super_like' | 'pass' = 'like'
  ): Promise<{ success: boolean; matchId: string | null; message: string }> => {
    const response = await api.post('/dating/like', { targetUserId, action });
    return response.data;
  },

  // Legacy matches
  getMatches: async (): Promise<any[]> => {
    const response = await api.get('/dating/matches');
    return response.data;
  },

  likeMatch: async (matchId: string): Promise<any> => {
    const response = await api.post(`/dating/match/${matchId}/like`);
    return response.data;
  },

  rejectMatch: async (matchId: string): Promise<any> => {
    const response = await api.post(`/dating/match/${matchId}/reject`);
    return response.data;
  },
};

// --------------------------------------------------
// Chart API
// --------------------------------------------------
export const chartAPI = {
  getNatalChart: async (): Promise<Chart | null> => {
    try {
      const response = await api.get('/chart/natal');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log('ℹ️ Натальная карта не найдена');
        return null;
      }
      throw error;
    }
  },

  createNatalChart: async (data: any): Promise<Chart> => {
    const response = await api.post('/chart/natal', { data });
    return response.data;
  },

  getChartInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/interpretation');
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки интерпретации:', error);
      return null;
    }
  },

  getNatalChartWithInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/full');
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки полной карты:', error);
      throw error;
    }
  },

  getHoroscope: async (
    period: 'day' | 'tomorrow' | 'week' | 'month' = 'day'
  ): Promise<any> => {
    try {
      const response = await api.get(`/chart/horoscope?period=${period}`);
      return response.data;
    } catch (error) {
      console.error(`Ошибка загрузки гороскопа на ${period}:`, error);
      throw error;
    }
  },

  getAllHoroscopes: async (): Promise<{
    today: any;
    tomorrow: any;
    week: any;
    month: any;
    isPremium: boolean;
  }> => {
    try {
      const response = await api.get('/chart/horoscope/all');
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки всех гороскопов:', error);
      throw error;
    }
  },

  getTransits: async (from: string, to: string): Promise<TransitsResponse> => {
    const response = await api.get(`/chart/transits?from=${from}&to=${to}`);
    return response.data;
  },

  getCurrentPlanets: async (): Promise<any> => {
    const response = await api.get('/chart/current');
    return response.data;
  },

  getMoonPhase: async (date?: string): Promise<MoonPhase> => {
    try {
      const url = date ? `/chart/moon-phase?date=${date}` : '/chart/moon-phase';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки фазы луны:', error);
      throw error;
    }
  },

  getLunarDay: async (date?: string): Promise<LunarDay> => {
    try {
      const url = date ? `/chart/lunar-day?date=${date}` : '/chart/lunar-day';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки лунного дня:', error);
      throw error;
    }
  },

  getLunarCalendar: async (
    year?: number,
    month?: number
  ): Promise<LunarCalendarDay[]> => {
    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? now.getMonth();
      const response = await api.get(
        `/chart/lunar-calendar?year=${targetYear}&month=${targetMonth}`
      );
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки лунного календаря:', error);
      throw error;
    }
  },

  getBiorhythms: async (
    date?: string
  ): Promise<{
    physical: number;
    emotional: number;
    intellectual: number;
    date: string;
    physicalPhase: 'peak' | 'high' | 'low' | 'critical';
    emotionalPhase: 'peak' | 'high' | 'low' | 'critical';
    intellectualPhase: 'peak' | 'high' | 'low' | 'critical';
  }> => {
    const url = date ? `/chart/biorhythms?date=${date}` : '/chart/biorhythms';
    // ✅ Убран tokenService - токен добавится автоматически через interceptor
    const response = await api.get(url);
    return response.data;
  },

  getInterpretationDetails: async (params: {
    type: 'planet' | 'ascendant' | 'house' | 'aspect';
    planet?: string;
    sign?: string;
    houseNum?: number | string;
    aspect?: string;
    planetA?: string;
    planetB?: string;
    locale?: 'ru' | 'en' | 'es';
  }): Promise<{ lines: string[] }> => {
    const qs = new URLSearchParams();
    qs.set('type', params.type);
    if (params.planet) qs.set('planet', params.planet);
    if (params.sign) qs.set('sign', params.sign);
    if (params.houseNum != null) qs.set('houseNum', String(params.houseNum));
    if (params.aspect) qs.set('aspect', params.aspect);
    if (params.planetA) qs.set('planetA', params.planetA);
    if (params.planetB) qs.set('planetB', params.planetB);
    if (params.locale) qs.set('locale', params.locale);

    const url = `/chart/interpretation/details?${qs.toString()}`;
    const response = await api.get(url);
    return response.data;
  },
};

// --------------------------------------------------
// advisor API — Premium only
// --------------------------------------------------
export const advisorAPI = {
  evaluate: async (data: {
    topic:
      | 'contract'
      | 'meeting'
      | 'date'
      | 'travel'
      | 'purchase'
      | 'health'
      | 'negotiation'
      | 'custom';
    date: string; // YYYY-MM-DD
    timezone?: string;
    customNote?: string;
  }): Promise<{
    verdict: 'good' | 'neutral' | 'challenging';
    color: string;
    score: number;
    factors: {
      label: string;
      weight: number;
      value: number;
      contribution: number;
    }[];
    aspects: {
      planetA: string;
      planetB: string;
      type: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
      orb: number;
      impact: number;
    }[];
    houses: {
      house: number;
      theme: string;
      relevant: boolean;
      impact: number;
    }[];
    bestWindows: { startISO: string; endISO: string; score: number }[];
    explanation: string;
    generatedBy: 'rules' | 'hybrid';
    evaluatedAt: string;
    date: string;
    topic: string;
    timezone?: string;
  }> => {
    const response = await api.post('/advisor/evaluate', data);
    return response.data;
  },
};

// --------------------------------------------------
// Subscription API (canonical)
// --------------------------------------------------
export const subscriptionAPI = {
  getStatus: async (): Promise<Subscription> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },
  activateTrial: async (): Promise<any> => {
    const response = await api.post('/subscription/trial/activate');
    return response.data;
  },
  upgrade: async (
    tier: SubscriptionTier,
    paymentMethod: 'apple' | 'google' | 'mock' = 'mock',
    transactionId?: string
  ): Promise<any> => {
    const response = await api.post('/subscription/upgrade', {
      tier,
      paymentMethod,
      transactionId,
    });
    return response.data;
  },
  cancel: async (): Promise<any> => {
    const response = await api.post('/subscription/cancel');
    return response.data;
  },
};

// --------------------------------------------------
// Chat API — messages
// --------------------------------------------------
export const chatAPI = {
  listConversations: async (
    limit = 50
  ): Promise<
    Array<{
      otherUserId: string;
      lastSenderId: string;
      lastMessageText: string | null;
      lastMessageMediaPath: string | null;
      lastMessageAt: string;
      primaryPhotoUrl?: string | null;
      displayName?: string | null;
    }>
  > => {
    const response = await api.get(
      `/chat/conversations?limit=${Math.max(1, Math.min(100, limit))}`
    );
    return response.data?.items ?? [];
  },
  listMessages: async (
    userId: string,
    limit = 50
  ): Promise<
    Array<{
      id: string;
      senderId: string;
      recipientId: string;
      text: string | null;
      mediaPath: string | null;
      createdAt: string;
    }>
  > => {
    const response = await api.get(
      `/chat/messages?userId=${encodeURIComponent(userId)}&limit=${Math.max(1, Math.min(100, limit))}`
    );
    return response.data?.items ?? [];
  },

  sendMessage: async (
    recipientId: string,
    text?: string,
    mediaPath?: string | null
  ): Promise<{ success: boolean; id: string }> => {
    const response = await api.post('/chat/messages/send', {
      recipientId,
      text,
      mediaPath: mediaPath ?? null,
    });
    return response.data;
  },

  deleteMessage: async (
    id: string,
    mode: 'for_me' | 'for_all' = 'for_me'
  ): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/chat/messages/${encodeURIComponent(id)}?mode=${mode}`
    );
    return response.data;
  },

  deleteConversation: async (
    otherUserId: string
  ): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/chat/conversations/${encodeURIComponent(otherUserId)}`
    );
    return response.data;
  },
};

// --------------------------------------------------
// User Photos API (signed upload)
// --------------------------------------------------
export type UserPhotoItem = {
  id: string;
  userId: string;
  path: string;
  isPrimary: boolean;
  url: string | null;
  createdAt: string;
};

export const userPhotosAPI = {
  // 1) Ask backend for signed PUT URL
  getUploadUrl: async (params?: {
    ext?: 'jpg' | 'jpeg' | 'png' | 'webp';
    path?: string;
  }): Promise<{
    path: string;
    signedUrl: string;
    token: string;
    method: 'PUT';
    requiredHeaders: Record<string, string>;
  }> => {
    const response = await api.post('/user/photos/upload-url', {
      ext: params?.ext ?? 'jpg',
      path: params?.path,
    });
    return response.data;
  },

  // 2) Upload directly to signed URL (PUT)
  uploadToSignedUrl: async (
    signedUrl: string,
    data: Blob | ArrayBuffer | Uint8Array,
    contentType: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg'
  ): Promise<boolean> => {
    const headers: Record<string, string> = {
      'Content-Type': contentType,
      'x-upsert': 'true', // harmless for most signed uploads; backend may ignore
    };

    const resp = await fetch(signedUrl, {
      method: 'PUT',
      headers,
      body: data as any,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Upload failed: ${resp.status} ${text}`);
    }
    return true;
  },

  // 3) Confirm uploaded file and persist DB record
  confirmPhoto: async (path: string): Promise<UserPhotoItem> => {
    const response = await api.post('/user/photos/confirm', { path });
    return response.data as UserPhotoItem;
  },

  listPhotos: async (): Promise<UserPhotoItem[]> => {
    const response = await api.get('/user/photos');
    return response.data as UserPhotoItem[];
  },

  deletePhoto: async (photoId: string): Promise<{ success: boolean }> => {
    const response = await api.delete(
      `/user/photos/${encodeURIComponent(photoId)}`
    );
    return response.data as { success: boolean };
  },

  setPrimary: async (photoId: string): Promise<{ success: boolean }> => {
    const response = await api.post(
      `/user/photos/${encodeURIComponent(photoId)}/set-primary`,
      {}
    );
    return response.data as { success: boolean };
  },
};

// --------------------------------------------------
// User Extended Profile API (bio, interests, etc)
// --------------------------------------------------
export const userExtendedProfileAPI = {
  getUserProfile: async (): Promise<{
    user_id: string;
    bio?: string;
    gender?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    zodiac_sign?: string;
    preferences: {
      interests?: string[];
      [key: string]: any;
    };
    last_active: string;
    is_onboarded: boolean;
    created_at: string;
    updated_at: string;
  }> => {
    const response = await api.get('/user/profile-extended');
    return response.data;
  },

  updateUserProfile: async (data: {
    bio?: string;
    gender?: string;
    city?: string;
    preferences?: {
      interests?: string[];
      [key: string]: any;
    };
    is_onboarded?: boolean;
  }): Promise<any> => {
    const response = await api.put('/user/profile-extended', data);
    return response.data;
  },
};

export const startConversation = (data: StartConversationRequest) =>
  api.post<StartConversationResponse>('/chat/conversations/start', data);
