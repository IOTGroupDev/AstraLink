import { supabase } from './supabase';

class TokenService {
  private static instance: TokenService;
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
    // Если уже есть активный запрос токена, ждем его
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Создаем новый запрос токена
    this.tokenPromise = this.fetchToken();
    const token = await this.tokenPromise;
    this.tokenPromise = null;

    return token;
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.log('❌ Ошибка получения сессии:', error);
        return null;
      }

      const token = data.session?.access_token || null;
      this.currentToken = token;

      if (token) {
        console.log('🔐 Токен получен:', token.substring(0, 20) + '...');
      } else {
        console.log('⚠️ Токен отсутствует');
      }

      return token;
    } catch (error) {
      console.log('❌ Ошибка при получении токена:', error);
      return null;
    }
  }

  clearToken(): void {
    this.currentToken = null;
    this.tokenPromise = null;
  }

  getCurrentToken(): string | null {
    return this.currentToken;
  }
}

export const tokenService = TokenService.getInstance();
