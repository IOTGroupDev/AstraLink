import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
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
    // Проверяем, существует ли пользователь
    const existingUser = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

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

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    // Создаем пользователя
    const user = await this.prisma.user.create({
      data: {
        email: signupDto.email,
        password: hashedPassword,
        name: signupDto.name,
        birthDate: birthDate,
        birthTime: signupDto.birthTime,
        birthPlace: signupDto.birthPlace,
      },
    });

    // Генерируем токен
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
}
