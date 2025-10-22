import axios from 'axios';
import { tokenService } from './tokenService';
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
import { supabase } from './supabase';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

// Определяем базовый URL в зависимости от платформы
const getApiBaseUrl = () => {
  // В Expo Go всегда используем IP адрес
  // Можно также использовать переменную окружения
  const EXPO_API_URL = 'http://192.168.1.69:3000/api';
  const LOCAL_API_URL = 'http://localhost:3000/api';

  // В веб-версии используем localhost, в мобильной - IP
  if (typeof window !== 'undefined' && window.location?.protocol === 'http:') {
    return LOCAL_API_URL;
  }

  // Для Expo Go используем IP адрес
  return EXPO_API_URL;
};

const API_BASE_URL = getApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к запросам
api.interceptors.request.use(async (config) => {
  console.log('🔍 Получение токена для запроса:', config.url);

  try {
    const token = await tokenService.getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        '🔐 Добавлен токен к запросу:',
        config.url,
        token.substring(0, 20) + '...'
      );
    } else {
      console.log('⚠️ Токен отсутствует для запроса:', config.url);
      // Для защищенных endpoints возвращаем ошибку вместо отправки запроса
      if (
        config.url &&
        (config.url.includes('/chart/') ||
          config.url.includes('/user/') ||
          config.url.includes('/connections/') ||
          config.url.includes('/dating/') ||
          config.url.includes('/subscription/')) &&
        !config.url.includes('/chart/test')
      ) {
        // Исключаем тестовый endpoint
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
    // Для защищенных endpoints возвращаем ошибку
    if (
      config.url &&
      (config.url.includes('/chart/') ||
        config.url.includes('/user/') ||
        config.url.includes('/connections/') ||
        config.url.includes('/dating/') ||
        config.url.includes('/subscription/')) &&
      !config.url.includes('/chart/test')
    ) {
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

// Обработка ответов и ошибок
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

    // Обработка ошибок авторизации
    if (error.response?.status === 401) {
      console.log('🔄 Ошибка 401, очищаем токен');
      tokenService.clearToken();
    }

    return Promise.reject(error);
  }
);

// Токены управляются локально через tokenService

// Auth API через backend
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

      if (!access_token) {
        throw new Error('Токен не получен от Backend');
      }

      // Сохраняем токен для дальнейших запросов
      await tokenService.setToken(access_token);

      console.log('✅ Успешный вход через Backend');

      return {
        access_token,
        user,
      };
    } catch (error: any) {
      console.log('❌ API login failed:', error);

      // Нормализуем сообщение об ошибке
      const errorMessage = error.response?.data?.message || error.message;
      if (typeof errorMessage === 'string') {
        error.message = errorMessage;
      }

      if (error.message?.includes('Invalid login credentials')) {
        error.message = 'Неверный email или пароль';
      } else if (error.message?.includes('Email not confirmed')) {
        error.message = 'Email не подтвержден';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети';
      }

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

      // Сохраняем токен в локальном хранилище
      await tokenService.setToken(access_token);

      return {
        access_token,
        user,
      };
    } catch (error: any) {
      console.log('❌ API signup failed:', error);

      // Обработка ошибок от backend
      const errorMessage = error.response?.data?.message || error.message;

      if (errorMessage?.includes('уже существует')) {
        error.message = 'Пользователь с таким email уже существует';
      } else if (errorMessage?.includes('Некорректная дата')) {
        error.message = errorMessage;
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети. Проверьте подключение к серверу';
      }

      throw error;
    }
  },

  /**
   * Отправка OTP кода через Supabase
   */
  sendVerificationCode: async (
    email: string
  ): Promise<{
    success: boolean;
    message: string;
  }> => {
    try {
      console.log('📧 Отправка Magic Link через Supabase на:', email);

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Создаем пользователя если не существует
          // ⚠️ ВАЖНО: Замените 'myapp' на вашу схему приложения из app.json
          emailRedirectTo: Platform.select({
            ios: 'astralink://auth/callback',
            android: 'astralink://auth/callback',
            web: `${window.location.origin}/auth/callback`,
            default: 'astralink://auth/callback',
          }),
        },
      });

      if (error) {
        console.error('❌ Ошибка отправки Magic Link:', error);
        throw error;
      }

      console.log('✅ Magic Link отправлен');

      return {
        success: true,
        message: 'Ссылка отправлена на email',
      };
    } catch (error: any) {
      console.error('❌ Ошибка отправки ссылки:', error);

      if (error.message?.includes('rate limit')) {
        error.message = 'Слишком много попыток. Подождите минуту';
      } else if (error.message?.includes('Invalid email')) {
        error.message = 'Некорректный email';
      } else {
        error.message = error.message || 'Не удалось отправить ссылку';
      }

      throw error;
    }
  },

  /**
   * Проверка OTP кода через Supabase
   */
  verifyCode: async (
    email: string,
    code: string
  ): Promise<{
    success: boolean;
    valid: boolean;
    message: string;
  }> => {
    try {
      console.log('🔍 Проверка OTP кода для:', email);

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (error) {
        console.error('❌ Ошибка проверки OTP:', error);
        throw error;
      }

      if (!data.session) {
        throw new Error('Не удалось создать сессию');
      }

      console.log('✅ OTP код подтвержден, сессия создана');

      // Сохраняем токен
      await tokenService.setToken(data.session.access_token);

      return {
        success: true,
        valid: true,
        message: 'Email подтвержден',
      };
    } catch (error: any) {
      console.error('❌ Ошибка проверки кода:', error);

      if (error.message?.includes('expired')) {
        error.message = 'Код истек. Запросите новый код';
      } else if (error.message?.includes('invalid')) {
        error.message = 'Неверный код';
      } else {
        error.message = error.message || 'Ошибка проверки кода';
      }

      throw error;
    }
  },

  /**
   * Завершение регистрации с уже подтвержденным email
   */
  completeSignup: async (data: {
    userId: string;
    name: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
  }): Promise<AuthResponse> => {
    try {
      console.log('📝 Завершение регистрации');

      // Отправляем дополнительные данные на backend
      const response = await api.post('/auth/complete-signup', {
        userId: data.userId,
        name: data.name,
        birthDate: data.birthDate,
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
      });

      console.log('✅ Регистрация завершена');

      return {
        access_token: response.data.access_token || '',
        user: response.data.user,
      };
    } catch (error: any) {
      console.error('❌ Ошибка завершения регистрации:', error);

      if (error.response?.data?.message) {
        error.message = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети. Проверьте подключение';
      }

      throw error;
    }
  },

  googleSignIn: async (): Promise<AuthResponse> => {
    try {
      console.log('🔐 Начинаем Google OAuth');

      const rememberMe = await tokenService.getRememberMe();
      if (!rememberMe) {
        console.log('⚠️ RememberMe отключен, включаем временно для OAuth');
        await tokenService.setRememberMe(true);
      }

      // ⚠️ ВАЖНО: Замените 'myapp' на вашу схему приложения
      const redirectUrl = Platform.select({
        ios: 'myapp://auth/callback',
        android: 'myapp://auth/callback',
        web: `${window.location.origin}/auth/callback`,
        default: 'myapp://auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('❌ Ошибка OAuth:', error);
        throw error;
      }

      if (!data.url) {
        throw new Error('Не получен URL для авторизации');
      }

      console.log('🌐 Открываем OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type !== 'success') {
        throw new Error('Авторизация отменена');
      }

      console.log('✅ OAuth успешно завершен, получаем сессию');

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        console.error('❌ Ошибка получения сессии:', sessionError);
        throw new Error('Не удалось получить сессию после авторизации');
      }

      const { access_token, user } = sessionData.session;

      if (!user) {
        throw new Error('Пользователь не найден в сессии');
      }

      console.log('👤 Пользователь:', user.email);

      await tokenService.setToken(access_token);
      console.log('✅ Токен сохранен в SecureStore');

      try {
        console.log('🔄 Синхронизация профиля с backend');

        const response = await api.post('/auth/google-callback', {
          access_token,
          user: {
            id: user.id,
            email: user.email,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0],
          },
        });

        console.log('✅ Профиль синхронизирован с backend');

        return {
          access_token,
          user: response.data.user,
        };
      } catch (backendError: any) {
        console.warn(
          '⚠️ Backend недоступен, используем данные от Supabase:',
          backendError.message
        );

        return {
          access_token,
          user: {
            id: user.id,
            email: user.email || '',
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              'Пользователь',
            role: 'user',
          },
        };
      }
    } catch (error: any) {
      console.error('❌ Google OAuth failed:', error);

      tokenService.clearToken();

      if (
        error.message?.includes('отменена') ||
        error.message?.includes('cancel')
      ) {
        error.message = 'Авторизация отменена пользователем';
      } else if (
        error.message?.includes('network') ||
        error.code === 'ERR_NETWORK'
      ) {
        error.message = 'Ошибка сети. Проверьте подключение к интернету';
      } else if (!error.message) {
        error.message = 'Ошибка авторизации через Google';
      }

      throw error;
    }
  },

  // Apple OAuth с биометрией (если включена)
  appleSignIn: async (): Promise<AuthResponse> => {
    try {
      console.log('🍎 Apple OAuth - в разработке');

      // TODO: Реализовать Apple OAuth аналогично Google
      // Можно добавить биометрическую проверку перед OAuth:
      // const biometricEnabled = await tokenService.getBiometricEnabled();
      // if (biometricEnabled) {
      //   const authenticated = await tokenService.authenticateWithBiometrics();
      //   if (!authenticated) {
      //     throw new Error('Биометрическая аутентификация не пройдена');
      //   }
      // }

      throw new Error('Apple Sign In пока не реализован');
    } catch (error: any) {
      console.error('❌ Apple OAuth failed:', error);
      throw error;
    }
  },

  // VK OAuth
  vkSignIn: async (): Promise<AuthResponse> => {
    try {
      console.log('🔵 VK OAuth - в разработке');

      // TODO: Реализовать VK OAuth
      // VK не поддерживается напрямую в Supabase
      // Нужна кастомная реализация через VK API

      throw new Error('VK Sign In пока не реализован');
    } catch (error: any) {
      console.error('❌ VK OAuth failed:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      console.log('🔐 Выход из системы');

      // Очищаем локальный токен
      tokenService.clearToken();

      console.log('✅ Успешный выход из системы');
    } catch (error) {
      console.log('❌ API logout failed:', error);
      throw error;
    }
  },
};

// Alias for backward compatibility
export const removeStoredToken = tokenService.clearToken;

// User/Profile API
export const userAPI = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get('/user/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await api.put('/user/profile', data);
    return response.data;
  },

  deleteAccount: async (): Promise<void> => {
    const response = await api.delete('/user/account');
    return response.data;
  },
};

// Alias for backward compatibility
export const profileAPI = userAPI;

// Subscription API
export const subscriptionAPI = {
  getStatus: async (): Promise<Subscription> => {
    const response = await api.get('/subscription/status');
    return response.data;
  },

  upgrade: async (data: UpgradeSubscriptionRequest): Promise<Subscription> => {
    const response = await api.post('/subscription/upgrade', data);
    return response.data;
  },
};

// Connections API с реальными вызовами
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

// Dating API с реальными вызовами
export const datingAPI = {
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

// Обновленный chartAPI с новыми методами
export const chartAPI = {
  // Существующие методы
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

  // Новый метод: получить интерпретацию натальной карты
  getChartInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/interpretation');
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки интерпретации:', error);
      return null;
    }
  },

  // Новый метод: получить полную карту с интерпретацией
  getNatalChartWithInterpretation: async (): Promise<any> => {
    try {
      const response = await api.get('/chart/natal/full');
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки полной карты:', error);
      throw error;
    }
  },

  // Новый метод: получить гороскоп на период
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

  // Новый метод: получить все гороскопы сразу
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

  //Реальные биоритмы (Swiss Ephemeris JD) — новый метод
  getBiorhythms: async (
    date?: string
  ): Promise<{
    date: string;
    physical: number;
    emotional: number;
    intellectual: number;
  }> => {
    const url = date ? `/chart/biorhythms?date=${date}` : '/chart/biorhythms';
    // Явно прокидываем токен в заголовок, чтобы избежать 401 при прямых вызовах
    const token = await tokenService.getToken();
    const response = await api.get(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data;
  },

  // Новый метод: получить расширенные детали интерпретации (“Подробнее”)
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
  // 🗑️ НОВЫЙ МЕТОД: Полное удаление аккаунта пользователя
  deleteAccount: async (): Promise<void> => {
    try {
      console.log('🗑️ Отправка запроса на удаление аккаунта');

      // Отправляем DELETE запрос на бэкенд
      const response = await api.delete('/user/account');

      console.log('✅ Аккаунт успешно удален', response.data);

      // Удаляем токен из локального хранилища
      tokenService.clearToken();

      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка удаления аккаунта:', error);

      // Обработка специфичных ошибок
      if (error.response?.status === 401) {
        throw new Error('Сессия истекла. Пожалуйста, войдите снова.');
      } else if (error.response?.status === 404) {
        throw new Error('Пользователь не найден.');
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Не удалось удалить аккаунт. Попробуйте позже.');
      }
    }
  },
};

// Advisor API — Premium only
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
