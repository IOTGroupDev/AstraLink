import axios from 'axios';
import { LoginRequest, SignupRequest, AuthResponse, User, Chart, TransitsResponse, UserProfile, UpdateProfileRequest, Subscription, UpgradeSubscriptionRequest } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к запросам
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Добавлен токен к запросу:', config.url, token.substring(0, 20) + '...');
  } else {
    console.log('⚠️ Токен отсутствует для запроса:', config.url);
  }
  return config;
});

// Обработка ответов и ошибок
api.interceptors.response.use(
  (response) => {
    console.log('✅ API ответ:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.log('❌ API ошибка:', error.config?.url, error.response?.status, error.message);
    
    // Обработка ошибок авторизации от middleware
    if (error.response?.status === 401) {
      const errorData = error.response.data;
      if (errorData?.redirectTo === '/signup' || errorData?.requiresAuth) {
        console.log('🔄 Перенаправление на регистрацию из-за отсутствия авторизации');
        // Удаляем токен и перенаправляем на регистрацию
        removeStoredToken();
        // В React Native можно использовать navigation для перенаправления
        // navigation.navigate('Signup');
      }
    }
    
    return Promise.reject(error);
  }
);

// Простое хранилище токенов для демо
let authToken: string | null = null;

// Сохраняем токен
export const setStoredToken = (token: string) => {
  console.log('💾 Сохраняем токен:', token.substring(0, 20) + '...');
  authToken = token;
  // В реальном приложении используйте SecureStore или AsyncStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('auth_token', token);
      console.log('✅ Токен сохранен в localStorage');
    } else {
      console.log('⚠️ localStorage недоступен, токен сохранен только в памяти');
    }
  } catch (error) {
    console.log('❌ Ошибка сохранения в localStorage:', error);
  }
};

// Получаем токен
export const getStoredToken = (): string | null => {
  if (authToken) {
    console.log('🔍 Токен найден в памяти:', authToken.substring(0, 20) + '...');
    return authToken;
  }
  
  // В реальном приложении используйте SecureStore или AsyncStorage
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('🔍 Токен найден в localStorage:', token.substring(0, 20) + '...');
        authToken = token;
        return token;
      }
    }
  } catch (error) {
    console.log('❌ Ошибка чтения localStorage:', error);
  }
  
  console.log('❌ Токен не найден');
  return null;
};

// Удаляем токен
export const removeStoredToken = () => {
  console.log('🗑️ Удаляем токен');
  authToken = null;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('auth_token');
      console.log('✅ Токен удален из localStorage');
    }
  } catch (error) {
    console.log('❌ Ошибка удаления из localStorage:', error);
  }
};

// Auth API с реальными вызовами и fallback на моки
export const authAPI = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    try {
      console.log('🔐 Отправляем данные для входа:', data);
      // Пробуем реальный API
      const response = await api.post('/auth/login', data);
      console.log('✅ Получен ответ от сервера:', response.data);
      const authResponse = response.data;
      
      // Backend возвращает 'token', используем его напрямую
      const token = authResponse.token || authResponse.access_token;
      if (!token) {
        throw new Error('Токен не получен от сервера');
      }
      
      // Сохраняем токен
      setStoredToken(token);
      
      // Обеспечиваем совместимость с типами
      authResponse.access_token = token;
      
      return authResponse;
    } catch (error) {
      console.log('❌ API login failed:', error);
      console.log('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config
      });
      
      // Добавляем более понятное сообщение об ошибке
      if (error.response?.status === 401) {
        error.message = 'Неверный email или пароль';
      } else if (error.response?.status === 400) {
        error.message = 'Некорректные данные';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети';
      }
      
      throw error;
    }
  },

  signup: async (data: SignupRequest): Promise<AuthResponse> => {
    try {
      const response = await api.post('/auth/signup', data);
      const authResponse = response.data;
      
      const token = authResponse.token || authResponse.access_token;
      if (!token) {
        throw new Error('Токен не получен от сервера');
      }
      
      setStoredToken(token);
      authResponse.access_token = token;
      
      return authResponse;
    } catch (error) {
      console.log('❌ API signup failed:', error);
      
      // Добавляем более понятное сообщение об ошибке
      if (error.response?.status === 409) {
        error.message = 'Пользователь с таким email уже существует';
      } else if (error.response?.status === 400) {
        error.message = 'Некорректные данные';
      } else if (error.code === 'ERR_NETWORK') {
        error.message = 'Ошибка сети';
      }
      
      throw error;
    }
  },
};

// Chart API с реальными вызовами
export const chartAPI = {
  getNatalChart: async (): Promise<Chart> => {
    const response = await api.get('/chart/natal');
    return response.data;
  },

  createNatalChart: async (data: any): Promise<Chart> => {
    const response = await api.post('/chart/natal', { data });
    return response.data;
  },

  getTransits: async (from: string, to: string): Promise<TransitsResponse> => {
    const response = await api.get(`/chart/transits?from=${from}&to=${to}`);
    return response.data;
  },

  getCurrentPlanets: async (): Promise<any> => {
    const response = await api.get('/chart/current');
    return response.data;
  },

  getPredictions: async (period: string = 'day'): Promise<any> => {
    const response = await api.get(`/chart/predictions?period=${period}`);
    return response.data;
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