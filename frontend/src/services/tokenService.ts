import AsyncStorage from '@react-native-async-storage/async-storage';

type TokenListener = (token: string | null) => void;

class TokenService {
  private static instance: TokenService;
  private static STORAGE_KEY = 'al_token';

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

      // Prefer global atob if available (RN polyfills usually provide it)
      // @ts-ignore
      if (typeof globalThis.atob === 'function') {
        // @ts-ignore
        const bin = globalThis.atob(base64);
        // Convert binary string to UTF-8
        let utf8 = '';
        for (let i = 0; i < bin.length; i++) {
          const c = bin.charCodeAt(i);
          utf8 += '%' + ('00' + c.toString(16)).slice(-2);
        }
        return decodeURIComponent(utf8);
      }

      // Fallback to Buffer if present (web/node)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        await AsyncStorage.setItem(TokenService.STORAGE_KEY, token);
      } else {
        await AsyncStorage.removeItem(TokenService.STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    } finally {
      this.notify(token);
    }
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TokenService.STORAGE_KEY);

      if (!token) {
        this.currentToken = null;
        console.log('⚠️ Токен отсутствует');
        return null;
      }

      if (this.isExpired(token, 0)) {
        console.log('⚠️ Найден просроченный токен в хранилище, удаляю');
        this.currentToken = null;
        // fire-and-forget
        AsyncStorage.removeItem(TokenService.STORAGE_KEY).catch(() => {});
        this.notify(null);
        return null;
      }

      this.currentToken = token;
      console.log('🔐 Токен получен:', token.substring(0, 20) + '...');
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
    AsyncStorage.removeItem(TokenService.STORAGE_KEY).catch(() => {});
    this.notify(null);
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const tokenService = TokenService.getInstance();
