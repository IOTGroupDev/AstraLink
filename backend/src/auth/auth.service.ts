import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';

@Injectable()
export class AuthService {
  constructor(
    private supabaseService: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const { data, error } = await this.supabaseService.signIn(email, password);
      
      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name,
        birthDate: data.user.user_metadata?.birth_date,
        birthTime: data.user.user_metadata?.birth_time,
        birthPlace: data.user.user_metadata?.birth_place,
      };
    } catch (error) {
      return null;
    }
  }

  async login(loginDto: LoginRequest): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const payload = { email: user.email, sub: user.id };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name || undefined,
        birthDate: user.birthDate?.toISOString().split('T')[0] || undefined,
        birthTime: user.birthTime || undefined,
        birthPlace: user.birthPlace || undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      access_token: token,
    };
  }

  async signup(signupDto: SignupRequest): Promise<AuthResponse> {
    // Валидация даты рождения
    const birthDate = new Date(signupDto.birthDate);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Некорректная дата рождения');
    }

    // Проверяем, что дата не в будущем
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Конец дня
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

    // Создаем пользователя через Supabase
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

    // Генерируем токен
    const payload = { email: data.user.email, sub: data.user.id };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: data.user.id,
        email: data.user.email || '',
        name: data.user.user_metadata?.name || undefined,
        birthDate: data.user.user_metadata?.birth_date?.split('T')[0] || undefined,
        birthTime: data.user.user_metadata?.birth_time || undefined,
        birthPlace: data.user.user_metadata?.birth_place || undefined,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at,
      },
      access_token: token,
    };
  }
}
