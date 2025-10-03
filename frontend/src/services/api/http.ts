import axios from 'axios';
import Constants from 'expo-constants';
import { supabase } from '../supabase';
import { tokenService } from '../tokenService';

// Safer API base URL resolution with ENV and Expo config support
const resolveApiBaseUrl = (): string => {
  const envUrl =
    process.env.EXPO_PUBLIC_API_URL ||
    // @ts-ignore - Expo constants typing may vary
    Constants.expoConfig?.extra?.apiUrl ||
    // @ts-ignore - classic app.json config
    Constants.manifest?.extra?.apiUrl;

  if (envUrl) return envUrl;

  // Fallbacks preserved from previous logic
  const EXPO_API_URL = 'http://192.168.1.14:3000/api';
  const LOCAL_API_URL = 'http://localhost:3000/api';

  // eslint-disable-next-line no-restricted-globals
  if (
    typeof window !== 'undefined' &&
    (window as any).location?.protocol === 'http:'
  ) {
    return LOCAL_API_URL;
  }
  return EXPO_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();
console.log('🌐 API Base URL:', API_BASE_URL);

// Dedicated axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token, and protect secured endpoints if no token
api.interceptors.request.use(async (config) => {
  try {
    const token = await tokenService.getToken();

    if (token) {
      config.headers = config.headers ?? {};
      // @ts-ignore
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      const url = config.url || '';
      const isSecured =
        url.includes('/chart/') ||
        url.includes('/user/') ||
        url.includes('/connections/') ||
        url.includes('/dating/') ||
        url.includes('/subscription/');

      const isChartTest = url.includes('/chart/test');

      if (isSecured && !isChartTest) {
        return Promise.reject({
          response: {
            status: 401,
            data: { message: 'Требуется аутентификация' },
          },
        });
      }
    }
  } catch (_e) {
    const url = config.url || '';
    const isSecured =
      url.includes('/chart/') ||
      url.includes('/user/') ||
      url.includes('/connections/') ||
      url.includes('/dating/') ||
      url.includes('/subscription/');
    const isChartTest = url.includes('/chart/test');

    if (isSecured && !isChartTest) {
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

// Normalize 401 handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      try {
        tokenService.clearToken();
        await supabase.auth.signOut();
      } catch (_e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);
