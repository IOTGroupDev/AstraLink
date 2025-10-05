import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SupabaseAuthService } from './supabase-auth.service';
import type { LoginRequest, SignupRequest, AuthResponse } from '../types';
import { Public } from './decorators/public.decorator';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import type { AuthenticatedRequest } from '../types/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly supabaseAuthService: SupabaseAuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Вход в систему через Supabase' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
    return this.supabaseAuthService.login(loginDto);
  }

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Регистрация пользователя через Supabase' })
  @ApiResponse({ status: 201, description: 'Пользователь создан' })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  async signup(@Body() signupDto: SignupRequest): Promise<AuthResponse> {
    return this.supabaseAuthService.signup(signupDto);
  }

  @Get('profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }
}
