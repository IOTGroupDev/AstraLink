// src/services/tokenService.ts
// Унифицированный сервис токенов и настроек.
// - Держит access_token (в памяти + SecureStore/AsyncStorage) и рассылает изменения подписчикам
// - Хранит флаги настроек (onboardingCompleted, rememberMe, biometrics)
// - Предоставляет методы биометрии через expo-local-authentication
//
// SECURITY: Токены хранятся в SecureStore на iOS/Android, AsyncStorage на web (fallback)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

type TokenListener = (token: string | null) => void;

class TokenService {
  private static instance: TokenService;

  // Ключи хранения
  private static SECURE_KEY = 'al_token_secure';
  private static SETTINGS_PREFIX = 'al_settings_';

  // Состояние и слушатели
  private ready = false;
  private readyPromise: Promise<void> | null = null;
  private currentToken: string | null = null;
  private listeners = new Set<TokenListener>();

  private constructor() {}

  static getInstance() {
    if (!TokenService.instance) TokenService.instance = new TokenService();
    return TokenService.instance;
  }

  // ============ Жизненный цикл токена ============

  /** Должен быть вызван один раз на старте приложения (не строго обязательно, если supabase установит токен сам) */
  init() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      try {
        const stored = await this.getSecureItem(TokenService.SECURE_KEY);
        this.currentToken = stored || null;
      } catch {
        this.currentToken = null;
      } finally {
        this.ready = true;
        this.notify(this.currentToken);
      }
    })();

    return this.readyPromise;
  }

  private async waitUntilReady() {
    if (this.ready) return;
    if (this.readyPromise) await this.readyPromise;
  }

  /** Получить текущий токен. Если init() не вызывался, будет ожидать загрузки при первом вызове. */
  async getToken(): Promise<string | null> {
    if (!this.ready) await this.waitUntilReady();
    return this.currentToken;
  }

  /** Установить (или очистить) токен и сохранить его в SecureStore/AsyncStorage + уведомить подписчиков */
  async setToken(token: string | null): Promise<void> {
    this.currentToken = token;

    try {
      if (token) {
        await this.setSecureItem(TokenService.SECURE_KEY, token);
      } else {
        await this.deleteSecureItem(TokenService.SECURE_KEY);
      }
    } finally {
      this.notify(this.currentToken);
    }
  }

  clearToken(): Promise<void> {
    return this.setToken(null);
  }

  /** Подписка на изменения токена */
  subscribe(fn: TokenListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(token: string | null) {
    for (const l of this.listeners) {
      try {
        l(token);
      } catch {
        // ignore listener errors
      }
    }
  }

  // ============ БИОМЕТРИЯ ============

  async checkBiometricSupport(): Promise<{
    available: boolean;
    type: string | null;
  }> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) return { available: false, type: null };

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) return { available: false, type: null };

      const types =
        await LocalAuthentication.supportedAuthenticationTypesAsync();
      let biometricType: string | null = null;

      if (
        types.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        biometricType = Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      } else if (
        types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
      ) {
        biometricType = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Iris';
      }

      return { available: true, type: biometricType };
    } catch (error) {
      // Biometric check error silently handled
      return { available: false, type: null };
    }
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const { available, type } = await this.checkBiometricSupport();
      if (!available) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Войти с помощью ${type || 'биометрии'}`,
        fallbackLabel: 'Использовать пароль',
        cancelLabel: 'Отмена',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      // Biometric authentication error silently handled
      return false;
    }
  }

  // ============ SECURE STORAGE HELPERS ============
  // Use SecureStore on iOS/Android, AsyncStorage on web

  private async getSecureItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  }

  private async setSecureItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  }

  private async deleteSecureItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  }

  // ============ НАСТРОЙКИ ============

  async getBiometricEnabled(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        TokenService.SETTINGS_PREFIX + 'biometric_enabled'
      );
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setBiometricEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        TokenService.SETTINGS_PREFIX + 'biometric_enabled',
        enabled.toString()
      );
    } catch (error) {
      console.error('Error setting biometric enabled:', error);
    }
  }

  async getOnboardingCompleted(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        TokenService.SETTINGS_PREFIX + 'onboarding_completed'
      );
      return value === 'true';
    } catch {
      return false;
    }
  }

  async setOnboardingCompleted(completed: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        TokenService.SETTINGS_PREFIX + 'onboarding_completed',
        completed.toString()
      );
    } catch (error) {
      console.error('Error setting onboarding completed:', error);
    }
  }

  async getRememberMe(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        TokenService.SETTINGS_PREFIX + 'remember_me'
      );
      // По умолчанию true (сохраняем сессию между запусками)
      return value !== 'false';
    } catch {
      return true;
    }
  }

  async setRememberMe(remember: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(
        TokenService.SETTINGS_PREFIX + 'remember_me',
        remember.toString()
      );
      // Если отключили "запомнить меня" — очищаем токен
      if (!remember) {
        await this.clearToken();
      }
    } catch (error) {
      console.error('Error setting remember me:', error);
    }
  }

  // ============ УТИЛИТЫ ============

  /** Полная очистка локальных данных (без удаления Supabase-сессии на сервере) */
  async clearAll(): Promise<void> {
    try {
      await this.clearToken();
      await AsyncStorage.multiRemove([
        TokenService.SETTINGS_PREFIX + 'biometric_enabled',
        TokenService.SETTINGS_PREFIX + 'remember_me',
        TokenService.SETTINGS_PREFIX + 'onboarding_completed',
      ]);
    } catch (error) {
      console.error('Error clearing all data:', error);
    }
  }
}

export const tokenService = TokenService.getInstance();
