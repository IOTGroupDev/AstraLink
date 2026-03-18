import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';
import type {
  SignupRequest,
  AuthResponse,
  OAuthCallbackRequest,
} from '../types';
import { CompleteSignupDto } from '@/auth/dto/complete-signup.dto';

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private chartService: ChartService,
    private ephemerisService: EphemerisService,
  ) {}

  /**
   * 🌐 Создание ссылки для OAuth авторизации
   */
  async getOAuthUrl(
    provider: 'google' | 'apple',
    redirectUri?: string,
  ): Promise<{ url: string }> {
    const redirectTo =
      redirectUri ||
      process.env.OAUTH_REDIRECT_URI ||
      `${process.env.FRONTEND_URL ?? ''}/auth/callback`;

    const { url, error } = await this.supabaseService.getOAuthSignInUrl(
      provider,
      redirectTo,
    );

    if (!url || error) {
      this.logger.error(`❌ Ошибка генерации ${provider} OAuth ссылки`, error);
      throw new BadRequestException('Не удалось создать OAuth ссылку');
    }

    this.logger.log(`🔗 ${provider} OAuth ссылка сгенерирована: ${url}`);
    return { url };
  }

  /**
   * 🔗 Отправка магической ссылки для входа
   * Пользователь получает email с ссылкой для входа
   */
  async sendMagicLink(email: string): Promise<{ success: boolean }> {
    try {
      const { error } = await this.supabaseService.signInWithOTP(email);

      if (error) {
        throw new BadRequestException('Ошибка отправки магической ссылки');
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Send magic link error:', error);
      throw new BadRequestException('Ошибка отправки магической ссылки');
    }
  }

  /**
   * 🔐 Вход по email + password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.signInWithPassword(
        email,
        password,
      );

      if (error || !data.user) {
        throw new UnauthorizedException(
          error?.message || 'Неверный email или пароль',
        );
      }

      const userId = data.user.id;
      let { data: userProfile } =
        await this.supabaseService.getUserProfileAdmin(userId);

      if (!userProfile) {
        try {
          await this.ensureUserProfile(userId, data.user.email || email);
          const retry = await this.supabaseService.getUserProfileAdmin(userId);
          userProfile = retry.data ?? null;
        } catch (ensureError) {
          this.logger.warn(
            '⚠️ ensure-profile failed during login (non-blocking):',
            ensureError,
          );
        }
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: userProfile?.name || data.user.user_metadata?.name,
          birthDate: userProfile?.birth_date
            ? new Date(userProfile.birth_date).toISOString().split('T')[0]
            : undefined,
          birthTime: userProfile?.birth_time,
          birthPlace: userProfile?.birth_place,
          createdAt: userProfile?.created_at || data.user.created_at,
          updatedAt: userProfile?.updated_at || data.user.updated_at,
        },
        access_token: data.session?.access_token || '',
        refresh_token: data.session?.refresh_token || undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Login error:', error);
      throw new UnauthorizedException('Ошибка входа');
    }
  }

  /**
   * ✅ Верификация магической ссылки
   * После клика по ссылке из email
   */
  async verifyMagicLink(token: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.verifyOTP(token);

      if (error || !data.user) {
        throw new UnauthorizedException('Неверная или истекшая ссылка');
      }

      // Получаем профиль пользователя
      const { data: userProfile } =
        await this.supabaseService.getUserProfileAdmin(data.user.id);

      // Проверяем натальную карту
      const { data: existingCharts } =
        await this.supabaseService.getUserChartsAdmin(data.user.id);

      // Создаем карту если есть все данные
      if (!existingCharts || existingCharts.length === 0) {
        if (
          userProfile?.birth_date &&
          userProfile?.birth_time &&
          userProfile?.birth_place
        ) {
          try {
            await this.createNatalChart(
              data.user.id,
              userProfile.birth_date,
              userProfile.birth_time,
              userProfile.birth_place,
            );
          } catch (error) {
            this.logger.error(
              'Error creating natal chart during login:',
              error,
            );
          }
        }
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile?.name || data.user.user_metadata?.name,
          birthDate: userProfile?.birth_date
            ? new Date(userProfile.birth_date).toISOString().split('T')[0]
            : undefined,
          birthTime: userProfile?.birth_time,
          birthPlace: userProfile?.birth_place,
          createdAt: userProfile?.created_at || data.user.created_at,
          updatedAt: userProfile?.updated_at || data.user.updated_at,
        },
        access_token: data.session?.access_token || '',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Verify magic link error:', error);
      throw new UnauthorizedException('Ошибка верификации');
    }
  }

  /**
   * 📝 Регистрация через email (без пароля)
   * Создает пользователя и отправляет verification email
   */
  async signup(
    signupDto: SignupRequest,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Валидация даты рождения
      const birthDate = new Date(signupDto.birthDate);
      if (isNaN(birthDate.getTime())) {
        throw new BadRequestException('Неверный формат даты рождения');
      }

      this.logger.log('🔍 Starting signup for:', signupDto.email);

      // 1) Проверяем, не существует ли уже пользователь в нашей таблице
      const { data: existingProfile } = await this.supabaseService
        .fromAdmin('users')
        .select('id')
        .eq('email', signupDto.email)
        .single();

      if (existingProfile) {
        throw new ConflictException(
          'Пользователь с таким email уже существует',
        );
      }

      // 2) Создаем пользователя через Admin API БЕЗ пароля
      const { data: created, error: createError } =
        await this.supabaseService.createUserWithoutPassword(signupDto.email, {
          name: signupDto.name,
          birth_date: birthDate.toISOString(),
          birth_time: signupDto.birthTime || '00:00',
          birth_place: signupDto.birthPlace || 'Moscow',
        });

      if (createError || !created?.user) {
        this.logger.error('Create user error:', createError);
        throw new BadRequestException('Ошибка создания пользователя');
      }

      const userId = created.user.id;
      const userEmail = created.user.email || signupDto.email;

      this.logger.log('✅ User created in auth.users:', userId);

      // 3) Создаем профиль пользователя
      const { error: profileError } = await this.supabaseService
        .fromAdmin('users')
        .upsert(
          {
            id: userId,
            email: userEmail,
            name: signupDto.name,
            birth_date: birthDate.toISOString(),
            birth_time: signupDto.birthTime || '00:00',
            birth_place: signupDto.birthPlace || 'Moscow',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' },
        );

      if (profileError) {
        this.logger.error('Error creating user profile:', profileError);
        await this.supabaseService.deleteUser(userId);
        throw new BadRequestException('Ошибка создания профиля пользователя');
      }

      this.logger.log('✅ User profile created');

      // 4) Создаем подписку (free с trial)
      await this.createUserSubscription(userId);

      // 5) Создаем натальную карту
      try {
        await this.createNatalChart(
          userId,
          birthDate.toISOString(),
          signupDto.birthTime || '00:00',
          signupDto.birthPlace || 'Moscow',
        );
      } catch (chartError) {
        this.logger.error(
          'Error creating natal chart (non-blocking):',
          chartError,
        );
      }

      // 6) Отправляем verification email через Supabase
      const { error: emailError } =
        await this.supabaseService.sendVerificationEmail(userEmail);

      if (emailError) {
        this.logger.warn('⚠️ Ошибка отправки verification email:', emailError);
      }

      this.logger.log('🎉 Signup completed successfully');

      return {
        success: true,
        message: 'Регистрация успешна! Проверьте email для подтверждения.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Signup error:', error);
      throw new BadRequestException('Ошибка регистрации');
    }
  }

  /**
   * 🔐 Google OAuth callback
   */
  async handleGoogleCallback(
    data: OAuthCallbackRequest,
  ): Promise<AuthResponse> {
    return this.processOAuthCallback('Google', data);
  }

  async handleAppleCallback(data: OAuthCallbackRequest): Promise<AuthResponse> {
    return this.processOAuthCallback('Apple', data);
  }

  private async processOAuthCallback(
    provider: 'Google' | 'Apple',
    data: OAuthCallbackRequest,
  ): Promise<AuthResponse> {
    try {
      const { user: userData } = data;

      this.logger.log(
        `🔍 Обработка ${provider} OAuth callback для:`,
        userData.email,
      );

      // 1. Проверяем существует ли профиль пользователя
      const { data: existingProfile } =
        await this.supabaseService.getUserProfileAdmin(userData.id);

      if (existingProfile) {
        this.logger.log('✅ Пользователь уже существует');

        // Проверяем натальную карту
        const { data: existingCharts } =
          await this.supabaseService.getUserChartsAdmin(userData.id);

        if (!existingCharts || existingCharts.length === 0) {
          if (
            existingProfile.birth_date &&
            existingProfile.birth_time &&
            existingProfile.birth_place
          ) {
            try {
              await this.createNatalChart(
                userData.id,
                existingProfile.birth_date,
                existingProfile.birth_time,
                existingProfile.birth_place,
              );
            } catch (error) {
              this.logger.error('Error creating natal chart:', error);
            }
          }
        }

        return {
          user: {
            id: userData.id,
            email: userData.email,
            name: existingProfile.name,
            birthDate: existingProfile.birth_date
              ? new Date(existingProfile.birth_date).toISOString().split('T')[0]
              : undefined,
            birthTime: existingProfile.birth_time,
            birthPlace: existingProfile.birth_place,
            createdAt: existingProfile.created_at,
            updatedAt: existingProfile.updated_at,
          },
          access_token: data.access_token,
        };
      }

      this.logger.log('🔍 Создаем новый профиль для OAuth пользователя');

      // 2. Создаем профиль пользователя
      const { data: newProfile, error: profileError } =
        await this.supabaseService
          .fromAdmin('users')
          .insert({
            id: userData.id,
            email: userData.email,
            name: userData.name || 'Пользователь',
            birth_date: null,
            birth_time: null,
            birth_place: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

      if (profileError) {
        this.logger.error('❌ Ошибка создания профиля:', profileError);
        throw new BadRequestException('Ошибка создания профиля пользователя');
      }

      this.logger.log('✅ Профиль создан');

      // 3. Создаем подписку
      await this.createUserSubscription(userData.id);

      this.logger.log(`🎉 ${provider} OAuth профиль создан успешно`);

      return {
        user: {
          id: userData.id,
          email: userData.email,
          name: newProfile.name,
          birthDate: undefined,
          birthTime: undefined,
          birthPlace: undefined,
          createdAt: newProfile.created_at,
          updatedAt: newProfile.updated_at,
        },
        access_token: data.access_token,
      };
    } catch (error) {
      this.logger.error(`❌ ${provider} callback error:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Ошибка обработки ${provider} авторизации`);
    }
  }

  async completeSignup(
    userId: string,
    dto: CompleteSignupDto,
    accessToken?: string,
  ): Promise<AuthResponse> {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const { name, birthDate, birthTime, birthPlace } = dto;

      this.logger.log('📝 Completing signup for user:', userId);
      this.logger.log(`📝 Completing signup payload: ${JSON.stringify(dto)}`);

      // Валидация даты рождения
      const parsedBirthDate = new Date(birthDate);
      if (isNaN(parsedBirthDate.getTime())) {
        throw new BadRequestException('Неверный формат даты рождения');
      }

      // 1. Проверяем существование пользователя
      let { data: existingProfile, error: checkError } =
        await this.supabaseService.getUserProfileAdmin(userId);

      let authEmail: string | null = null;

      if (checkError || !existingProfile) {
        // Попытка восстановить профиль через auth.users
        try {
          const admin = this.supabaseService.getAdminClient();
          const { data: authData, error: authErr } =
            await admin.auth.admin.getUserById(userId);
          if (!authErr) {
            authEmail = authData?.user?.email ?? null;
          }
        } catch (authLookupErr) {
          this.logger.warn(
            '⚠️ Failed to lookup auth user for missing profile',
            authLookupErr,
          );
        }

        if (!authEmail && accessToken) {
          try {
            const { data: tokenUser, error: tokenErr } =
              await this.supabaseService.getUser(accessToken);
            if (!tokenErr) {
              authEmail = tokenUser?.user?.email ?? null;
            }
          } catch (tokenLookupErr) {
            this.logger.warn(
              '⚠️ Failed to lookup auth user by access token',
              tokenLookupErr,
            );
          }
        }

        if (authEmail) {
          await this.ensureUserProfile(userId, authEmail);
          const retry = await this.supabaseService.getUserProfileAdmin(userId);
          existingProfile = retry.data ?? null;
          checkError = retry.error;
        }
      }

      if (checkError || !existingProfile) {
        // Финальный fallback: создать/апсертить профиль вручную
        if (authEmail) {
          const { error: upsertErr } = await this.supabaseService
            .fromAdmin('users')
            .upsert(
              {
                id: userId,
                email: authEmail,
                name: name || authEmail.split('@')[0] || 'User',
                birth_date: null,
                birth_time: null,
                birth_place: null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' },
            );

          if (!upsertErr) {
            const retry =
              await this.supabaseService.getUserProfileAdmin(userId);
            existingProfile = retry.data ?? null;
            checkError = retry.error;
          } else if (upsertErr?.code === '23505' && authEmail) {
            this.logger.warn(
              '⚠️ Duplicate email detected, removing stale profile by email',
            );
            await this.supabaseService
              .fromAdmin('users')
              .delete()
              .eq('email', authEmail);

            const { error: insertErr } = await this.supabaseService
              .fromAdmin('users')
              .insert({
                id: userId,
                email: authEmail,
                name: name || authEmail.split('@')[0] || 'User',
                birth_date: null,
                birth_time: null,
                birth_place: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (!insertErr) {
              const retry =
                await this.supabaseService.getUserProfileAdmin(userId);
              existingProfile = retry.data ?? null;
              checkError = retry.error;
            } else {
              this.logger.warn('⚠️ Manual profile insert failed:', insertErr);
            }
          } else {
            this.logger.warn('⚠️ Manual profile upsert failed:', upsertErr);
          }
        }
      }

      if (checkError || !existingProfile) {
        throw new BadRequestException('Пользователь не найден');
      }

      // 2. Обновляем профиль пользователя
      const { data: updatedProfile, error: updateError } =
        await this.supabaseService.updateUserProfileAdmin(userId, {
          name: name || existingProfile.name,
          birth_date: parsedBirthDate.toISOString(),
          birth_time: birthTime || '00:00',
          birth_place: birthPlace || 'Moscow',
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        this.logger.error('Error updating user profile:', updateError);
        throw new BadRequestException('Ошибка обновления профиля');
      }

      this.logger.log('✅ User profile updated');

      // 3. Проверяем и создаем подписку, если ее нет
      const { data: existingSubscription } = await this.supabaseService
        .fromAdmin('subscriptions')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!existingSubscription) {
        this.logger.log('📝 Creating subscription for user...');
        await this.createUserSubscription(userId);
      } else {
        this.logger.log('✅ Subscription already exists');
      }

      // 4. Создаем натальную карту
      try {
        await this.createNatalChart(
          userId,
          parsedBirthDate.toISOString(),
          birthTime || '00:00',
          birthPlace || 'Moscow',
        );
      } catch (chartError) {
        this.logger.error(
          'Error creating natal chart (non-blocking):',
          chartError,
        );
      }

      this.logger.log('🎉 Signup completion successful');

      return {
        user: {
          id: userId,
          email: existingProfile.email,
          name: updatedProfile.name,
          birthDate: new Date(updatedProfile.birth_date)
            .toISOString()
            .split('T')[0],
          birthTime: updatedProfile.birth_time,
          birthPlace: updatedProfile.birth_place,
          createdAt: updatedProfile.created_at,
          updatedAt: updatedProfile.updated_at,
        },
        access_token: '', // Токен должен быть получен на клиенте
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Complete signup error:', error);
      throw new BadRequestException('Ошибка завершения регистрации');
    }
  }

  /**
   * 🆕 Ensure user profile exists in public.users
   * Called after OTP verification to create profile if missing
   * This is a workaround for missing database trigger
   */
  async ensureUserProfile(
    userId: string,
    email: string,
  ): Promise<{ success: boolean }> {
    try {
      this.logger.log('🔍 Checking if user profile exists:', userId);

      // Check if profile exists
      const { data: existingProfile } =
        await this.supabaseService.getUserProfileAdmin(userId);

      if (existingProfile) {
        this.logger.log('✅ User profile already exists');
        return { success: true };
      }

      this.logger.log('📝 Creating missing user profile');

      // Create profile in public.users
      const { error: profileError } = await this.supabaseService
        .fromAdmin('users')
        .insert({
          id: userId,
          email: email,
          name: email.split('@')[0] || 'User',
          birth_date: null,
          birth_time: null,
          birth_place: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        // Ignore duplicate key errors (profile was created by trigger or race condition)
        if (profileError.code === '23505') {
          this.logger.log(
            '✅ Profile created by another process (race condition)',
          );
          return { success: true };
        }
        this.logger.error('❌ Error creating user profile:', profileError);
        throw new BadRequestException('Failed to create user profile');
      }

      this.logger.log('✅ User profile created successfully');

      // Create subscription for new user
      await this.createUserSubscription(userId);

      return { success: true };
    } catch (error) {
      this.logger.error('❌ ensureUserProfile error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to ensure user profile');
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Создание натальной карты
   */
  private async createNatalChart(
    userId: string,
    birthDate: string,
    birthTime: string,
    birthPlace: string,
  ): Promise<void> {
    const birthDateStr = new Date(birthDate).toISOString().split('T')[0];
    const location = this.getLocationCoordinates(birthPlace);

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDateStr,
      birthTime,
      location,
    );

    const { error: chartInsertError } =
      await this.supabaseService.createUserChartAdmin(userId, natalChartData);

    if (chartInsertError) {
      this.logger.error('Error creating natal chart:', chartInsertError);
      throw chartInsertError;
    } else {
      this.logger.log('✅ Natal chart created');
    }
  }

  /**
   * Создание подписки для нового пользователя
   */
  private async createUserSubscription(userId: string): Promise<void> {
    try {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      const { error: subscriptionError } = await this.supabaseService
        .fromAdmin('subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          trial_ends_at: trialEndsAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (subscriptionError) {
        this.logger.error(
          'Error creating subscription (non-blocking):',
          subscriptionError,
        );
      } else {
        this.logger.log('✅ Free subscription with trial created');
      }
    } catch (subscriptionError) {
      this.logger.error(
        'Error creating subscription (non-blocking):',
        subscriptionError,
      );
    }
  }

  /**
   * Получение координат по городу
   */
  private getLocationCoordinates(place: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    const cities: Record<
      string,
      { latitude: number; longitude: number; timezone: number }
    > = {
      Москва: { latitude: 55.7558, longitude: 37.6173, timezone: 3 },
      Moscow: { latitude: 55.7558, longitude: 37.6173, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      'Saint Petersburg': {
        latitude: 59.9311,
        longitude: 30.3609,
        timezone: 3,
      },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      Екатеринбург: { latitude: 56.8389, longitude: 60.6057, timezone: 5 },
      Казань: { latitude: 55.8304, longitude: 49.0661, timezone: 3 },
    };

    const normalized = place.trim();
    return cities[normalized] || cities['Москва'];
  }
}
