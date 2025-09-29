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

      // Return user data from Supabase Auth (user_metadata contains signup data)
      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || undefined,
          birthDate: data.user.user_metadata?.birth_date
            ? new Date(data.user.user_metadata.birth_date)
                .toISOString()
                .split('T')[0]
            : undefined,
          birthTime: data.user.user_metadata?.birth_time || undefined,
          birthPlace: data.user.user_metadata?.birth_place || undefined,
          createdAt: data.user.created_at,
          updatedAt: data.user.updated_at,
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

      // Создаем пользователя через Supabase Auth
      const { data, error } = await this.supabaseService.signUp(
        signupDto.email,
        signupDto.password,
        {
          name: signupDto.name,
          birth_date: birthDate.toISOString(),
          birth_time: signupDto.birthTime,
          birth_place: signupDto.birthPlace,
        },
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

      // Создаем или обновляем профиль пользователя в нашей таблице users
      const { data: userProfile, error: createError } =
        await this.supabaseService
          .from('users')
          .upsert({
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
        throw new BadRequestException('Ошибка создания профиля пользователя');
      }

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
          await this.supabaseService.createUserChart(
            data.user.id,
            natalChartData,
          );
        if (chartInsertError) {
          throw chartInsertError;
        }
      } catch (chartError) {
        console.error('Error creating natal chart via Supabase:', chartError);
        throw new BadRequestException(
          'Ошибка создания натальной карты. Регистрация отменена.',
        );
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile?.name || signupDto.name,
          birthDate: userProfile?.birth_date
            ? new Date(userProfile.birth_date).toISOString().split('T')[0]
            : signupDto.birthDate,
          birthTime: userProfile?.birth_time || signupDto.birthTime,
          birthPlace: userProfile?.birth_place || signupDto.birthPlace,
          createdAt: userProfile?.created_at || data.user.created_at,
          updatedAt: userProfile?.updated_at || data.user.updated_at,
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
      throw new BadRequestException('Ошибка регистрации');
    }
  }

  // Упрощённое определение координат по городу (совпадает с логикой ChartService)
  private getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    const locations: Record<
      string,
      { latitude: number; longitude: number; timezone: number }
    > = {
      Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      default: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };
    return locations[birthPlace] || locations['default'];
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
