import { Injectable, OnModuleInit, Inject, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly client: SupabaseClient; // Добавь public

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    );
  }

  private supabase!: SupabaseClient;
  private adminSupabase: SupabaseClient | null = null;

  onModuleInit() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('Supabase client initialized');

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      this.adminSupabase = createClient(supabaseUrl, serviceRoleKey);
      this.logger.log('Supabase admin client initialized');
    } else {
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will be unavailable and RLS may cause 404.',
      );
    }
  }

  // ==================== Client Getters ====================

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    if (!this.adminSupabase) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is required for admin operations',
      );
    }
    return this.adminSupabase;
  }

  /**
   * Клиент с контекстом пользователя (JWT), чтобы auth.uid() работал в RLS/RPC
   */
  getClientForToken(token: string): SupabaseClient {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    return createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  /**
   * Алиас для getClientForToken (для обратной совместимости)
   */
  createClientWithToken(token: string): SupabaseClient {
    return this.getClientForToken(token);
  }

  // ==================== Database Methods ====================

  /**
   * Обычный доступ к таблице (с учетом RLS)
   */
  from(table: string) {
    return this.supabase.from(table);
  }

  /**
   * Админский доступ к таблице (обходит RLS)
   */
  fromAdmin(table: string) {
    return this.getAdminClient().from(table);
  }

  /**
   * Вызов RPC от имени пользователя (по его токену)
   */
  async rpcWithToken<T = any>(
    fn: string,
    args: Record<string, any> | undefined,
    token: string,
  ): Promise<{ data: T | null; error: any }> {
    const client = this.getClientForToken(token);
    const { data, error } = await client.rpc(fn, args ?? {});
    return { data: (data as T) ?? null, error };
  }

  /**
   * Вызов RPC от имени администратора (service role)
   */
  async rpcAdmin<T = any>(
    fn: string,
    args?: Record<string, any>,
  ): Promise<{ data: T | null; error: any }> {
    const admin = this.getAdminClient();
    const { data, error } = await admin.rpc(fn, args ?? {});
    return { data: (data as T) ?? null, error };
  }

  /**
   * Создать подписанную ссылку на объект в Storage (требует service role)
   * С Redis кэшированием для оптимизации повторных запросов
   */
  async createSignedUrl(
    bucket: string,
    path: string,
    expiresInSec = 900,
  ): Promise<string | null> {
    if (!this.adminSupabase) return null;

    // Проверяем кэш (ключ: signed-url:bucket:path)
    const cacheKey = `signed-url:${bucket}:${path}`;
    try {
      const cached = await this.redis.get<string>(cacheKey);
      if (cached) return cached;
    } catch {
      // Игнорируем ошибки кэша, продолжаем с реальным запросом
    }

    // Создаем signed URL
    const { data, error } = await this.adminSupabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSec);

    if (error) return null;

    const signedUrl = data?.signedUrl ?? null;

    // Сохраняем в кэш (TTL = expiresInSec - 60 для запаса)
    if (signedUrl) {
      try {
        const cacheTTL = Math.max(60, expiresInSec - 60);
        await this.redis.set(cacheKey, signedUrl, cacheTTL);
      } catch {
        // Игнорируем ошибки кэша
      }
    }

    return signedUrl;
  }

  /**
   * Batch создание подписанных ссылок для множества файлов (оптимизация N+1)
   * Возвращает Map<path, signedUrl | null> для быстрого доступа
   */
  async createSignedUrlsBatch(
    bucket: string,
    paths: string[],
    expiresInSec = 900,
  ): Promise<Map<string, string | null>> {
    if (!this.adminSupabase || !paths.length) {
      return new Map();
    }

    // Параллельное создание signed URLs для всех путей
    const urlPromises = paths.map((path) =>
      this.createSignedUrl(bucket, path, expiresInSec).then((url) => ({
        path,
        url,
      })),
    );

    const results = await Promise.all(urlPromises);

    // Преобразуем в Map для O(1) доступа
    return new Map(results.map((r) => [r.path, r.url]));
  }

  /**
   * Create a one-time signed upload URL for Storage (requires service role).
   * Client uploads the file directly via PUT to the returned signed URL.
   */
  async createSignedUploadUrl(
    bucket: string,
    path: string,
  ): Promise<{ signedUrl: string; token: string } | null> {
    if (!this.adminSupabase) return null;
    const { data, error } = await this.adminSupabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) return null;
    return { signedUrl: data.signedUrl, token: data.token };
  }

  // ==================== Passwordless Auth Methods ====================

  /**
   * 🔗 Отправка Magic Link на email
   * Пользователь получит письмо со ссылкой для входа
   */
  async signInWithOTP(email: string) {
    const { data, error } = await this.supabase.auth.signInWithOtp({
      email,
      options: {
        // emailRedirectTo: `${process.env.FRONTEND_URL}/auth/callback`,
      },
    });
    return { data, error };
  }

  /**
   * ✅ Верификация OTP токена
   * Используется после клика по magic link
   */
  async verifyOTP(token: string, type: 'email' | 'magiclink' = 'magiclink') {
    const { data, error } = await this.supabase.auth.verifyOtp({
      token_hash: token,
      type,
    });
    return { data, error };
  }

  /**
   * 📧 Отправка verification email
   * Отправляет письмо для подтверждения email при регистрации
   */
  async sendVerificationEmail(email: string) {
    // Supabase автоматически отправляет verification email при создании пользователя
    // Этот метод можно использовать для повторной отправки
    const { data, error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
    });
    return { data, error };
  }

  /**
   * 🆕 Создание пользователя БЕЗ пароля через Admin API
   * Email будет автоматически подтвержден
   */
  async createUserWithoutPassword(
    email: string,
    userData?: Record<string, any>,
  ) {
    const admin = this.getAdminClient();

    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true, // Автоматически подтверждаем email
      user_metadata: userData || {},
    });

    return { data, error };
  }

  /**
   * 🔐 Создание пользователя С паролем через Admin API
   * (Оставлено для совместимости, если понадобится)
   */
  async createUser(
    email: string,
    password?: string,
    userData?: Record<string, any>,
  ) {
    const admin = this.getAdminClient();

    const createPayload: any = {
      email,
      email_confirm: true,
      user_metadata: userData || {},
    };

    if (password) {
      createPayload.password = password;
    }

    const { data, error } = await admin.auth.admin.createUser(createPayload);
    return { data, error };
  }

  /**
   * 🚪 Выход из системы
   */
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  /**
   * 👤 Получить данные пользователя по токену
   */
  async getUser(token: string) {
    const { data, error } = await this.supabase.auth.getUser(token);
    return { data, error };
  }

  /**
   * 🗑️ Удаление пользователя из Supabase Auth
   * Требует admin права (service_role_key)
   */
  async deleteUser(userId: string) {
    if (!this.adminSupabase) {
      this.logger.error('Admin client not initialized');
      return {
        error: new Error(
          'SUPABASE_SERVICE_ROLE_KEY is required to delete users',
        ),
      };
    }

    try {
      this.logger.log(`Deleting user ${userId} from Supabase Auth`);

      const { data, error } =
        await this.adminSupabase.auth.admin.deleteUser(userId);

      if (error) {
        this.logger.error('Failed to delete user from Auth:', error);
        return { error };
      }

      this.logger.log(`User ${userId} successfully deleted from Supabase Auth`);
      return { data, error: null };
    } catch (error) {
      this.logger.error('Critical error deleting user:', error);
      return { error };
    }
  }

  // ==================== User Profile Methods (RLS) ====================

  /**
   * Получить профиль пользователя (с учетом RLS)
   */
  async getUserProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }

  /**
   * Обновить профиль пользователя (с учетом RLS)
   */
  async updateUserProfile(userId: string, profileData: any) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }

  // ==================== User Profile Methods (Admin) ====================

  /**
   * Получить профиль пользователя через админа (обходит RLS)
   */
  async getUserProfileAdmin(userId: string) {
    const { data, error } = await this.getAdminClient()
      .from('users')
      .select(
        'id, email, name, birth_date, birth_time, birth_place, created_at, updated_at',
      )
      .eq('id', userId)
      .single();
    return { data, error };
  }

  /**
   * Обновить профиль пользователя через админа (обходит RLS)
   */
  async updateUserProfileAdmin(userId: string, profileData: any) {
    const { data, error } = await this.getAdminClient()
      .from('users')
      .update({
        ...profileData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    return { data, error };
  }

  // ==================== Chart Methods (RLS) ====================

  /**
   * Создать натальную карту (с учетом RLS)
   */
  async createUserChart(userId: string, chartData: any) {
    const { data, error } = await this.supabase
      .from('charts')
      .insert({
        user_id: userId,
        data: chartData,
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Получить карты пользователя (с учетом RLS)
   */
  async getUserCharts(userId: string) {
    const { data, error } = await this.supabase
      .from('charts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // ==================== Chart Methods (Admin) ====================

  /**
   * Создать натальную карту через админа (обходит RLS)
   */
  async createUserChartAdmin(userId: string, chartData: any) {
    const { data, error } = await this.getAdminClient()
      .from('charts')
      .insert({
        user_id: userId,
        data: chartData,
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Получить карты пользователя через админа (обходит RLS)
   */
  async getUserChartsAdmin(userId: string) {
    const { data, error } = await this.getAdminClient()
      .from('charts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  }

  // ==================== Real-time Subscriptions ====================

  /**
   * Подписаться на изменения в таблице
   */
  subscribe(table: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`${table}_changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  }

  // ==================== Subscription Methods ====================

  /**
   * Получить подписку пользователя
   */
  async getUserSubscription(userId: string) {
    const { data, error } = await this.getAdminClient()
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    return { data, error };
  }

  /**
   * Создать подписку
   */
  async createSubscription(subscriptionData: {
    user_id: string;
    tier: string;
    trial_ends_at?: string;
  }) {
    const { data, error } = await this.getAdminClient()
      .from('subscriptions')
      .insert({
        ...subscriptionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  }

  /**
   * Обновить подписку
   */
  async updateSubscription(userId: string, subscriptionData: any) {
    const { data, error } = await this.getAdminClient()
      .from('subscriptions')
      .update({
        ...subscriptionData,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();
    return { data, error };
  }
}
