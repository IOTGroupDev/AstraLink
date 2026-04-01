import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';
import type {
  SignupRequest,
  AuthResponse,
  OAuthCallbackRequest,
} from '../types';
import { CompleteSignupDto } from '@/auth/dto/complete-signup.dto';
import { UserSignupCompletedEvent } from '@/auth/events';

const DEFAULT_UNKNOWN_BIRTH_TIME = '12:00';
const DEFAULT_YANDEX_OAUTH_PROVIDER = 'custom:yandex';

@Injectable()
export class SupabaseAuthService {
  private readonly logger = new Logger(SupabaseAuthService.name);

  constructor(
    private supabaseService: SupabaseService,
    private chartService: ChartService,
    private ephemerisService: EphemerisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 🌐 Создание ссылки для OAuth авторизации
   */
  async getOAuthUrl(
    provider: string,
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

  async getYandexOAuthUrl(redirectUri?: string): Promise<{ url: string }> {
    return this.getOAuthUrl(
      process.env.SUPABASE_YANDEX_PROVIDER || DEFAULT_YANDEX_OAUTH_PROVIDER,
      redirectUri,
    );
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
          birthDate:
            this.normalizeBirthDateInput(userProfile?.birth_date) || undefined,
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
      const birthDateOnly = this.normalizeBirthDateInput(signupDto.birthDate);
      if (!birthDateOnly) {
        throw new BadRequestException('Неверный формат даты рождения');
      }
      const birthDateStorageIso = this.birthDateToStorageIso(birthDateOnly);

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

      // 2) Создаем пользователя через Admin API без пароля.
      const { data: created, error: createError } =
        await this.supabaseService.createUserWithoutPassword(signupDto.email, {
          name: signupDto.name,
          birth_date: birthDateStorageIso,
          birth_time: signupDto.birthTime || DEFAULT_UNKNOWN_BIRTH_TIME,
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
            birth_date: birthDateStorageIso,
            birth_time: signupDto.birthTime || DEFAULT_UNKNOWN_BIRTH_TIME,
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
          birthDateOnly,
          signupDto.birthTime || DEFAULT_UNKNOWN_BIRTH_TIME,
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

  async handleYandexCallback(
    data: OAuthCallbackRequest,
  ): Promise<AuthResponse> {
    return this.processOAuthCallback('Yandex', data);
  }

  private async processOAuthCallback(
    provider: 'Google' | 'Apple' | 'Yandex',
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
            birthDate:
              this.normalizeBirthDateInput(existingProfile.birth_date) ||
              undefined,
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
      const birthDateOnly = this.normalizeBirthDateInput(birthDate);
      if (!birthDateOnly) {
        throw new BadRequestException('Неверный формат даты рождения');
      }
      const birthDateStorageIso = this.birthDateToStorageIso(birthDateOnly);

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
          birth_date: birthDateStorageIso,
          birth_time: birthTime || DEFAULT_UNKNOWN_BIRTH_TIME,
          birth_place: birthPlace || 'Moscow',
          updated_at: new Date().toISOString(),
        });

      if (updateError) {
        this.logger.error('Error updating user profile:', updateError);
        throw new BadRequestException('Ошибка обновления профиля');
      }

      this.logger.log('✅ User profile updated');

      // 2.1. Помечаем онбординг завершенным в обеих пользовательских таблицах
      const nowIso = new Date().toISOString();
      const { error: onboardingFlagError } = await this.supabaseService
        .fromAdmin('users')
        .update({
          onboarding_completed: true,
          updated_at: nowIso,
        })
        .eq('id', userId);

      if (onboardingFlagError) {
        this.logger.error(
          'Error updating onboarding_completed in public.users:',
          onboardingFlagError,
        );
        throw new BadRequestException('Ошибка обновления статуса онбординга');
      }

      const { error: extendedProfileError } = await this.supabaseService
        .fromAdmin('user_profiles')
        .upsert({
          user_id: userId,
          is_onboarded: true,
          updated_at: nowIso,
        })
        .select('user_id')
        .single();

      if (extendedProfileError) {
        this.logger.error(
          'Error updating is_onboarded in public.user_profiles:',
          extendedProfileError,
        );
        throw new BadRequestException('Ошибка обновления расширенного профиля');
      }

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

      // 4. Планируем создание натальной карты в фоне
      try {
        this.eventEmitter.emit(
          'user.signup.completed',
          new UserSignupCompletedEvent(userId, {
            birthDate: birthDateOnly,
            birthTime: birthTime || DEFAULT_UNKNOWN_BIRTH_TIME,
            birthPlace: birthPlace || 'Moscow',
          }),
        );
        this.logger.log('🛰️ Natal chart creation scheduled in background');
      } catch (scheduleError) {
        this.logger.error(
          'Error scheduling natal chart creation (non-blocking):',
          scheduleError,
        );
      }

      this.logger.log('🎉 Signup completion successful');

      return {
        user: {
          id: userId,
          email: existingProfile.email,
          name: updatedProfile.name,
          birthDate:
            this.normalizeBirthDateInput(updatedProfile.birth_date) ||
            undefined,
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
    const birthDateStr = this.normalizeBirthDateInput(birthDate);
    if (!birthDateStr) {
      throw new BadRequestException('Неверный формат даты рождения');
    }

    const natalChartData =
      await this.chartService.createNatalChartWithInterpretation(
        userId,
        birthDateStr,
        birthTime,
        birthPlace,
      );

    if (!natalChartData) {
      throw new BadRequestException('Не удалось создать натальную карту');
    }

    this.logger.log('✅ Natal chart created');
  }

  private normalizeBirthDateInput(input?: string): string | null {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;

    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private birthDateToStorageIso(dateOnly: string): string {
    return `${dateOnly}T00:00:00.000Z`;
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
