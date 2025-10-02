import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChartService } from '../chart/chart.service';
import { EphemerisService } from '../services/ephemeris.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthService {
  constructor(
    private supabaseService: SupabaseService,
    private chartService: ChartService,
    private ephemerisService: EphemerisService,
  ) {}

  async login(loginDto: LoginRequest): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.signIn(
        loginDto.email,
        loginDto.password,
      );

      if (error) {
        throw new UnauthorizedException('Неверный email или пароль');
      }

      if (!data.user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      // Получаем профиль пользователя из базы данных
      const { data: userProfile, error: profileError } =
        await this.supabaseService.getUserProfileAdmin(data.user.id);

      if (profileError) {
        console.error('Error getting user profile:', profileError);
        throw new UnauthorizedException(
          'Ошибка получения профиля пользователя',
        );
      }

      // Проверяем, есть ли натальная карта у пользователя
      console.log(`Checking natal chart for user ${data.user.id}`);
      const { data: existingCharts, error: chartsError } =
        await this.supabaseService.getUserChartsAdmin(data.user.id);

      if (chartsError) {
        console.error('Error checking user charts:', chartsError);
      } else {
        console.log(
          `Found ${existingCharts?.length || 0} existing charts for user ${data.user.id}`,
        );
      }

      // Если натальной карты нет, создаем её
      if (!existingCharts || existingCharts.length === 0) {
        console.log(`Creating natal chart for user ${data.user.id}`);
        try {
          const birthDateStr = userProfile?.birth_date
            ? new Date(userProfile.birth_date).toISOString().split('T')[0]
            : new Date(data.user.user_metadata?.birth_date)
                .toISOString()
                .split('T')[0];

          const birthTime =
            userProfile?.birth_time ||
            data.user.user_metadata?.birth_time ||
            '00:00';
          const birthPlace =
            userProfile?.birth_place ||
            data.user.user_metadata?.birth_place ||
            'Москва';

          const location = this.getLocationCoordinates(birthPlace);

          const natalChartData =
            await this.ephemerisService.calculateNatalChart(
              birthDateStr,
              birthTime,
              location,
            );

          const { data: createdChart, error: chartInsertError } =
            await this.supabaseService.createUserChartAdmin(
              data.user.id,
              natalChartData,
            );
          if (chartInsertError) {
            console.error(
              'Error creating natal chart during login:',
              chartInsertError,
            );
            // Не прерываем вход, просто логируем ошибку
          } else {
            console.log(
              `✅ Natal chart created for user ${data.user.id}, chart ID: ${createdChart?.id}`,
            );
          }
        } catch (chartError) {
          console.error('Error creating natal chart during login:', chartError);
          // Не прерываем вход, просто логируем ошибку
        }
      }

      // Return user data from database profile (preferred) or Supabase Auth
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile?.name || data.user.user_metadata?.name || undefined,
          birthDate: userProfile?.birth_date
            ? new Date(userProfile.birth_date).toISOString().split('T')[0]
            : data.user.user_metadata?.birth_date
              ? new Date(data.user.user_metadata.birth_date)
                  .toISOString()
                  .split('T')[0]
              : undefined,
          birthTime:
            userProfile?.birth_time ||
            data.user.user_metadata?.birth_time ||
            undefined,
          birthPlace:
            userProfile?.birth_place ||
            data.user.user_metadata?.birth_place ||
            undefined,
          createdAt: userProfile?.created_at || data.user.created_at,
          updatedAt: userProfile?.updated_at || data.user.updated_at,
        },
        access_token: data.session?.access_token || '',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Ошибка входа в систему');
    }
  }

  async signup(signupDto: SignupRequest): Promise<AuthResponse> {
    try {
      // Валидация даты рождения
      const birthDate = new Date(signupDto.birthDate);
      if (isNaN(birthDate.getTime())) {
        throw new BadRequestException('Некорректная дата рождения');
      }

      // Проверяем, что дата не в будущем
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (birthDate > today) {
        throw new BadRequestException('Дата рождения не может быть в будущем');
      }

      // Проверяем возраст (от 0 до 120 лет)
      const age = new Date().getFullYear() - birthDate.getFullYear();
      if (age < 0 || age > 120) {
        throw new BadRequestException('Некорректный возраст');
      }

      // Валидация времени рождения
      if (signupDto.birthTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(signupDto.birthTime)) {
          throw new BadRequestException(
            'Время рождения должно быть в формате HH:MM',
          );
        }
      }

      // // Создаем пользователя через Supabase Auth
      // const { data, error } = await this.supabaseService.signUp(
      //   signupDto.email,
      //   signupDto.password,
      //   {
      //     name: signupDto.name,
      //     birth_date: birthDate.toISOString(),
      //     birth_time: signupDto.birthTime,
      //     birth_place: signupDto.birthPlace,
      //   },
      // );
      //
      // if (error) {
      //   if (error.message.includes('already registered')) {
      //     throw new ConflictException(
      //       'Пользователь с таким email уже существует',
      //     );
      //   }
      //   throw new BadRequestException(error.message);
      // }
      //
      // if (!data.user) {
      //   throw new BadRequestException('Ошибка создания пользователя');
      // }
      const { data, error } = await this.supabaseService.signUp(
        signupDto.email,
        signupDto.password,
      );

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ConflictException(
            'Пользователь с таким email уже существует',
          );
        }
        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        throw new BadRequestException('Ошибка создания пользователя');
      }

      // ✅ Создаем профиль ВРУЧНУЮ с использованием service_role
      const { data: userProfile, error: createError } =
        await this.supabaseService
          .fromAdmin('users')
          .insert({
            id: data.user.id,
            email: signupDto.email,
            name: signupDto.name,
            birth_date: birthDate.toISOString(),
            birth_time: signupDto.birthTime || null,
            birth_place: signupDto.birthPlace || null,
          })
          .select()
          .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        // Откатываем создание пользователя в auth.users
        await this.supabaseService.deleteUser(data.user.id);
        throw new BadRequestException('Ошибка создания профиля пользователя');
      }

      // // Создаем или обновляем профиль пользователя в нашей таблице users
      // const { data: userProfile, error: createError } =
      //   await this.supabaseService
      //     .from('users')
      //     .upsert({
      //       id: data.user.id,
      //       email: signupDto.email,
      //       name: signupDto.name,
      //       birth_date: birthDate.toISOString(),
      //       birth_time: signupDto.birthTime || null,
      //       birth_place: signupDto.birthPlace || null,
      //     })
      //     .select()
      //     .single();
      //
      // if (createError) {
      //   console.error('Error creating user profile:', createError);
      //   throw new BadRequestException('Ошибка создания профиля пользователя');
      // }

      // Генерируем натальную карту для нового пользователя (атомарно, без Prisma)
      try {
        const birthDateStr = new Date(signupDto.birthDate)
          .toISOString()
          .split('T')[0];
        const birthTime = signupDto.birthTime || '00:00';
        const location = this.getLocationCoordinates(
          signupDto.birthPlace || 'Москва',
        );

        const natalChartData = await this.ephemerisService.calculateNatalChart(
          birthDateStr,
          birthTime,
          location,
        );

        const { error: chartInsertError } =
          await this.supabaseService.createUserChartAdmin(
            data.user.id,
            natalChartData,
          );
        if (chartInsertError) {
          // Не прерываем регистрацию из-за ошибки сохранения карты
          console.error(
            'Error inserting natal chart (non-blocking):',
            chartInsertError,
          );
        } else {
          console.log('✅ Natal chart created');
        }
      } catch (chartError) {
        // Не прерываем регистрацию из-за недоступности Swiss Ephemeris
        console.error(
          'Error creating natal chart via Supabase (non-blocking):',
          chartError,
        );
      }

      console.log('🎉 Signup completed successfully');

      //   return {
      //     user: {
      //       id: data.user.id,
      //       email: data.user.email || '',
      //       name: userProfile?.name || signupDto.name,
      //       birthDate: userProfile?.birth_date
      //         ? new Date(userProfile.birth_date).toISOString().split('T')[0]
      //         : signupDto.birthDate,
      //       birthTime: userProfile?.birth_time || signupDto.birthTime,
      //       birthPlace: userProfile?.birth_place || signupDto.birthPlace,
      //       createdAt: userProfile?.created_at || data.user.created_at,
      //       updatedAt: userProfile?.updated_at || data.user.updated_at,
      //     },
      //     access_token: data.session?.access_token || '',
      //   };
      // } catch (error) {
      //   if (
      //     error instanceof BadRequestException ||
      //     error instanceof ConflictException
      //   ) {
      //     throw error;
      //   }
      //   throw new BadRequestException('Ошибка регистрации');
      // }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile.name,
          birthDate: new Date(userProfile.birth_date)
            .toISOString()
            .split('T')[0],
          birthTime: userProfile.birth_time,
          birthPlace: userProfile.birth_place,
          createdAt: userProfile.created_at,
          updatedAt: userProfile.updated_at,
        },
        access_token: data.session?.access_token || '',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      console.error('❌ Signup error:', error);
      throw new BadRequestException('Ошибка регистрации');
    }
  }

  // Упрощённое определение координат по городу (совпадает с логикой ChartService)
  private getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    // Normalize the birth place by taking the first part before comma and trimming
    const normalizedPlace = birthPlace.split(',')[0].trim();

    const locations: Record<
      string,
      { latitude: number; longitude: number; timezone: number }
    > = {
      Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      Moscow: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      default: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };
    return (
      locations[normalizedPlace] ||
      locations[birthPlace] ||
      locations['default']
    );
  }

  async validateToken(token: string): Promise<any> {
    try {
      // For demo purposes, validate JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback-secret',
      ) as any;

      if (!decoded.sub) {
        throw new UnauthorizedException('Недействительный токен');
      }

      // Return mock user data
      return {
        id: decoded.sub,
        email: decoded.email,
      };
    } catch (_error) {
      throw new UnauthorizedException('Ошибка валидации токена');
    }
  }
}
