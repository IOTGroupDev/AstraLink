// src/services/tokenService.ts - С SecureStore и биометрией
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

type TokenListener = (token: string | null) => void;

class TokenService {
  private static instance: TokenService;
  private static SECURE_KEY = 'al_token_secure'; // Для SecureStore
  private static SETTINGS_PREFIX = 'al_settings_'; // Для настроек

  private currentToken: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;
  private listeners: Set<TokenListener> = new Set();

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  // Subscribe to token changes (set/clear). Returns unsubscribe fn.
  subscribe(listener: TokenListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
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

  private decodeBase64Url(input: string): string {
    try {
      let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      if (pad) base64 += '='.repeat(4 - pad);

      // @ts-ignore
      if (typeof globalThis.atob === 'function') {
        // @ts-ignore
        const bin = globalThis.atob(base64);
        let utf8 = '';
        for (let i = 0; i < bin.length; i++) {
          const c = bin.charCodeAt(i);
          utf8 += '%' + ('00' + c.toString(16)).slice(-2);
        }
        return decodeURIComponent(utf8);
      }

      // @ts-ignore
      const B: any = (globalThis as unknown as { Buffer?: any }).Buffer;
      if (B) {
        return B.from(base64, 'base64').toString('utf8');
      }
    } catch {
      // ignore
    }
    return '';
  }

  private parseJwt(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadStr = this.decodeBase64Url(parts[1]);
      if (!payloadStr) return null;
      return JSON.parse(payloadStr);
    } catch {
      return null;
    }
  }

  private isExpired(token: string, skewSec = 0): boolean {
    try {
      const payload = this.parseJwt(token) as { exp?: number } | null;
      const expSec = payload?.exp ? Number(payload.exp) : undefined;
      if (!expSec || !Number.isFinite(expSec)) return false;
      const nowSec = Math.floor(Date.now() / 1000);
      return nowSec >= expSec - skewSec;
    } catch {
      return false;
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

  // ============ ТОКЕНЫ (SecureStore) ============

  async getToken(): Promise<string | null> {
    // If we have a token in memory, validate freshness
    if (this.currentToken) {
      if (this.isExpired(this.currentToken, 0)) {
        console.log('⚠️ Token expired in memory, clearing');
        this.clearToken();
      } else {
        return this.currentToken;
      }
    }

    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    this.tokenPromise = this.fetchToken();
    const token = await this.tokenPromise;
    this.tokenPromise = null;

    return token;
  }

  async setToken(token: string | null): Promise<void> {
    this.currentToken = token;
    try {
      if (token) {
        // Проверяем rememberMe перед сохранением
        const rememberMe = await this.getRememberMe();
        if (rememberMe) {
          // Используем SecureStore для безопасного хранения
          if (Platform.OS !== 'web') {
            await SecureStore.setItemAsync(TokenService.SECURE_KEY, token);
          } else {
            // Fallback для web
            await AsyncStorage.setItem(TokenService.SECURE_KEY, token);
          }
          console.log('🔐 Token saved to SecureStore');
        } else {
          console.log('⚠️ RememberMe is false, token not saved');
        }
      } else {
        // Удаляем токен из обоих хранилищ
        if (Platform.OS !== 'web') {
          await SecureStore.deleteItemAsync(TokenService.SECURE_KEY);
        } else {
          await AsyncStorage.removeItem(TokenService.SECURE_KEY);
        }
        console.log('🗑️ Token removed from SecureStore');
      }
    } catch (error) {
      console.error('Error saving token:', error);
    } finally {
      this.notify(token);
    }
  }

  private async fetchToken(): Promise<string | null> {
    try {
      let token: string | null = null;

      // Читаем из SecureStore (или AsyncStorage на web)
      if (Platform.OS !== 'web') {
        token = await SecureStore.getItemAsync(TokenService.SECURE_KEY);
      } else {
        token = await AsyncStorage.getItem(TokenService.SECURE_KEY);
      }

      if (!token) {
        this.currentToken = null;
        console.log('⚠️ Токен отсутствует');
        return null;
      }

      if (this.isExpired(token, 0)) {
        console.log('⚠️ Найден просроченный токен в хранилище, удаляю');
        this.currentToken = null;
        // fire-and-forget
        if (Platform.OS !== 'web') {
          SecureStore.deleteItemAsync(TokenService.SECURE_KEY).catch(() => {});
        } else {
          AsyncStorage.removeItem(TokenService.SECURE_KEY).catch(() => {});
        }
        this.notify(null);
        return null;
      }

      this.currentToken = token;
      console.log(
        '🔓 Токен получен из SecureStore:',
        token.substring(0, 20) + '...'
      );
      return token;
    } catch (error) {
      console.log('❌ Ошибка при получении токена из хранилища:', error);
      return null;
    }
  }

  clearToken(): void {
    this.currentToken = null;
    this.tokenPromise = null;
    // fire-and-forget
    if (Platform.OS !== 'web') {
      SecureStore.deleteItemAsync(TokenService.SECURE_KEY).catch(() => {});
    } else {
      AsyncStorage.removeItem(TokenService.SECURE_KEY).catch(() => {});
    }
    this.notify(null);
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const tokenService = TokenService.getInstance();
