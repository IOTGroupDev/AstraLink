// src/services/tokenService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

type TokenListener = (token: string | null) => void;

class TokenService {
  private static instance: TokenService;
  private static SECURE_KEY = 'al_token_secure';
  private static SETTINGS_PREFIX = 'al_settings_';

  private ready = false;
  private readyPromise: Promise<void> | null = null;

  private currentToken: string | null = null;
  private listeners = new Set<TokenListener>();

  private constructor() {}

  static getInstance() {
    if (!TokenService.instance) TokenService.instance = new TokenService();
    return TokenService.instance;
  }

  /** Должен быть вызван на старте приложения (см. App.tsx) */
  init() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = (async () => {
      try {
        const stored =
          Platform.OS !== 'web'
            ? await SecureStore.getItemAsync(TokenService.SECURE_KEY)
            : await AsyncStorage.getItem(TokenService.SECURE_KEY);

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

  async waitUntilReady() {
    if (this.ready) return;
    if (this.readyPromise) await this.readyPromise;
  }

  /** Получить токен (гарантировано после init) */
  async getToken() {
    if (!this.ready) await this.waitUntilReady();
    return this.currentToken;
  }

  /** Установить/очистить токен и сохранить его в хранилище */
  async setToken(token: string | null) {
    this.currentToken = token;

    try {
      if (token) {
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync(TokenService.SECURE_KEY, token);
        } else {
          await AsyncStorage.setItem(TokenService.SECURE_KEY, token);
        }
      } else {
        if (Platform.OS !== 'web') {
          await SecureStore.deleteItemAsync(TokenService.SECURE_KEY);
        } else {
          await AsyncStorage.removeItem(TokenService.SECURE_KEY);
        }
      }
    } finally {
      this.notify(this.currentToken);
    }
  }

  clearToken() {
    return this.setToken(null);
  }

  subscribe(fn: TokenListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(token: string | null) {
    for (const l of this.listeners) {
      try {
        l(token);
      } catch {}
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
      let biometricType = null;

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
      console.error('Biometric check error:', error);
      return { available: false, type: null };
    }
  }

  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const { available, type } = await this.checkBiometricSupport();

      if (!available) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Войти с помощью ${type || 'биометрии'}`,
        fallbackLabel: 'Использовать пароль',
        cancelLabel: 'Отмена',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
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

  async getRememberMe(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(
        TokenService.SETTINGS_PREFIX + 'remember_me'
      );
      return value !== 'false'; // По умолчанию true
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

      // Если отключили, удаляем токен
      if (!remember) {
        await this.clearToken();
      }
    } catch (error) {
      console.error('Error setting remember me:', error);
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

  // ============ УТИЛИТЫ ============

  /** Очистить все данные (полный logout) */
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
