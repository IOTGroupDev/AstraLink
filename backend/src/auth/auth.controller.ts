import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  async signup(@Body() signupDto: SignupRequest): Promise<AuthResponse> {
    return this.authService.signup(signupDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getProfile(@Request() req) {
    return req.user;
  }
}
