import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';

@Injectable()
export class SupabaseAuthService {
  constructor(private supabaseService: SupabaseService) {}

  async login(loginDto: LoginRequest): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabaseService.signIn(
        loginDto.email,
        loginDto.password
      );

      if (error) {
        throw new UnauthorizedException('Неверный email или пароль');
      }

      if (!data.user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      // Get user profile from our User table
      const { data: userProfile, error: profileError } = await this.supabaseService
        .from('User')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw new UnauthorizedException('Ошибка получения профиля пользователя');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile?.name || undefined,
          birthDate: userProfile?.birth_date?.split('T')[0] || undefined,
          birthTime: userProfile?.birth_time || undefined,
          birthPlace: userProfile?.birth_place || undefined,
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
          throw new BadRequestException('Время рождения должно быть в формате HH:MM');
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
        }
      );

      if (error) {
        if (error.message.includes('already registered')) {
          throw new ConflictException('Пользователь с таким email уже существует');
        }
        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        throw new BadRequestException('Ошибка создания пользователя');
      }

      // Создаем профиль пользователя в нашей таблице User
      const { data: userProfile, error: createError } = await this.supabaseService
        .from('User')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: signupDto.name,
          birthDate: birthDate.toISOString(),
          birthTime: signupDto.birthTime || null,
          birthPlace: signupDto.birthPlace || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user profile:', createError);
        // Продолжаем, даже если создание профиля не удалось
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email || '',
          name: userProfile?.name || signupDto.name,
          birthDate: userProfile?.birthDate?.split('T')[0] || signupDto.birthDate,
          birthTime: userProfile?.birthTime || signupDto.birthTime,
          birthPlace: userProfile?.birthPlace || signupDto.birthPlace,
          createdAt: userProfile?.createdAt || data.user.created_at,
          updatedAt: userProfile?.updatedAt || data.user.updated_at,
        },
        access_token: data.session?.access_token || '',
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Ошибка регистрации');
    }
  }

  async validateToken(token: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.getUser(token);
      
      if (error || !data.user) {
        throw new UnauthorizedException('Недействительный токен');
      }

      return data.user;
    } catch (error) {
      throw new UnauthorizedException('Ошибка валидации токена');
    }
  }
}
