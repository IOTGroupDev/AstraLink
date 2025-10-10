import AsyncStorage from '@react-native-async-storage/async-storage';

class TokenService {
  private static instance: TokenService;
  private static STORAGE_KEY = 'al_token';
  private currentToken: string | null = null;
  private tokenPromise: Promise<string | null> | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  async getToken(): Promise<string | null> {
    if (this.currentToken) {
      return this.currentToken;
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
    }
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TokenService.STORAGE_KEY);
      this.currentToken = token;
      if (token) {
        console.log('🔐 Токен получен:', token.substring(0, 20) + '...');
      } else {
        console.log('⚠️ Токен отсутствует');
      }
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
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const tokenService = TokenService.getInstance();
