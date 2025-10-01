import axios from 'axios';
import { supabase } from './supabase';
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  Chart,
  TransitsResponse,
  UserProfile,
  UpdateProfileRequest,
  Subscription,
  UpgradeSubscriptionRequest,
} from '../types';

// Определяем базовый URL в зависимости от платформы
const getApiBaseUrl = () => {
  // В Expo Go всегда используем IP адрес
  // Можно также использовать переменную окружения
  const EXPO_API_URL = 'http://192.168.1.14:3000/api';
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
  console.log('🔍 Получение сессии для запроса:', config.url);

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log('❌ Ошибка получения сессии:', error);
      throw error;
    }

    const token = data.session?.access_token;
    console.log('🔍 Токен из сессии:', !!token);

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
      const errorData = error.response.data;
      if (errorData?.redirectTo === '/signup' || errorData?.requiresAuth) {
        console.log(
          '🔄 Перенаправление на регистрацию из-за отсутствия авторизации'
        );
        // Выходим из системы через Supabase
        await supabase.auth.signOut();
        // В React Native можно использовать navigation для перенаправления
        // navigation.navigate('Signup');
      } else {
        // Попробуем обновить сессию и повторить запрос
        try {
          const { data, error: sessionError } =
            await supabase.auth.getSession();
          if (sessionError || !data.session) {
            console.log('❌ Невозможно обновить сессию, выход из системы');
            await supabase.auth.signOut();
          } else {
            console.log('🔄 Сессия обновлена, повторяем запрос');
            // Можно повторить запрос с новым токеном, но для простоты просто выбрасываем ошибку
          }
        } catch (refreshError) {
          console.log('❌ Ошибка при обновлении сессии:', refreshError);
          await supabase.auth.signOut();
        }
      }
    }

    return Promise.reject(error);
  }
);

// Токены теперь управляются Supabase автоматически

// Auth API с использованием Supabase
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('🔐 Отправляем данные для входа через Supabase:', data);

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.log('❌ Supabase login error:', error);
        throw new Error(error.message);
      }

      if (!authData.session?.access_token) {
        throw new Error('Токен не получен от Supabase');
      }

      console.log('✅ Успешный вход через Supabase');

      // Возвращаем совместимый с существующим кодом ответ
      return {
        access_token: authData.session.access_token,
        user: {
          id: authData.user?.id || '',
          email: authData.user?.email || '',
          name: authData.user?.user_metadata?.name || '',
        },
      };
    } catch (error) {
      console.log('❌ API login failed:', error);

      // Добавляем более понятное сообщение об ошибке
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
      console.log('🔐 Отправляем данные для регистрации через Supabase:', data);

      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
            birthDate: data.birthDate,
            birthTime: data.birthTime,
            birthPlace: data.birthPlace,
          },
        },
      });

      if (error) {
        console.log('❌ Supabase signup error:', error);
        throw new Error(error.message);
      }

      if (!authData.session?.access_token) {
        // Пользователь создан, но email нужно подтвердить
        throw new Error('Проверьте ваш email для подтверждения регистрации');
      }

      console.log('✅ Успешная регистрация через Supabase');

      // Возвращаем совместимый с существующим кодом ответ
      return {
        access_token: authData.session.access_token,
        user: {
          id: authData.user?.id || '',
          email: authData.user?.email || '',
          name: authData.user?.user_metadata?.name || data.name,
        },
      };
    } catch (error) {
      console.log('❌ API signup failed:', error);

      // Добавляем более понятное сообщение об ошибке
      if (error.message?.includes('User already registered')) {
        error.message = 'Пользователь с таким email уже существует';
      } else if (error.message?.includes('Password should be at least')) {
        error.message = 'Пароль должен содержать минимум 6 символов';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети';
      }

      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      console.log('🔐 Выход из системы через Supabase');

      const { error } = await supabase.auth.signOut();
      if (error) {
        console.log('❌ Supabase logout error:', error);
        throw new Error(error.message);
      }

      console.log('✅ Успешный выход из системы');
    } catch (error) {
      console.log('❌ API logout failed:', error);
      throw error;
    }
  },
};

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

// frontend/src/services/api.ts - Добавить в существующий файл

// Обновленный chartAPI с новыми методами
export const chartAPI = {
  // Существующие методы
  getNatalChart: async (): Promise<Chart | null> => {
    try {
      const response = await api.get('/chart/natal');
      return response.data;
    } catch (error) {
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

  // Устаревший метод - используйте getHoroscope вместо него
  getPredictions: async (period: string = 'day'): Promise<any> => {
    const response = await api.get(`/chart/predictions?period=${period}`);
    return response.data;
  },
};
