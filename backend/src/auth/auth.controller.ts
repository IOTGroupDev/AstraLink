import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthService } from './supabase-auth.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly supabaseAuthService: SupabaseAuthService,
  ) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Регистрация пользователя' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  async signup(@Body() signupDto: SignupRequest): Promise<AuthResponse> {
    return this.authService.signup(signupDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async getProfile(@Request() req) {
    return req.user;
  }

  // Supabase Auth endpoints
  @Public()
  @Post('supabase/login')
  @ApiOperation({ summary: 'Вход через Supabase' })
  @ApiResponse({ status: 200, description: 'Успешный вход через Supabase' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async supabaseLogin(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
    return this.supabaseAuthService.login(loginDto);
  }

  @Public()
  @Post('supabase/signup')
  @ApiOperation({ summary: 'Регистрация через Supabase' })
  @ApiResponse({ status: 201, description: 'Пользователь создан через Supabase' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  async supabaseSignup(@Body() signupDto: SignupRequest): Promise<AuthResponse> {
    return this.supabaseAuthService.signup(signupDto);
  }
}
