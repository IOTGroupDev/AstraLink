// import {
//   Controller,
//   Post,
//   Body,
//   Get,
//   Request,
//   UseGuards, HttpStatus, HttpCode,
// } from '@nestjs/common';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiBearerAuth,
// } from '@nestjs/swagger';
// import { SupabaseAuthService } from './supabase-auth.service';
// import type { LoginRequest, SignupRequest, AuthResponse } from '@/types';
// import { Public } from './decorators/public.decorator';
// import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
// import type { AuthenticatedRequest } from '@/types/auth';
// import { SendVerificationCodeDto, VerifyCodeDto } from '@/auth/dto/send-verification-code.dto';
// import { CompleteSignupDto } from '@/auth/dto/complete-signup.dto';
//
// @ApiTags('auth')
// @Controller('auth')
// export class AuthController {
//   constructor(private readonly supabaseAuthService: SupabaseAuthService) {}
//
//   @Public()
//   @Post('login')
//   @ApiOperation({ summary: 'Вход в систему через Supabase' })
//   @ApiResponse({ status: 200, description: 'Успешный вход' })
//   @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
//   async login(@Body() loginDto: LoginRequest): Promise<AuthResponse> {
//     return this.supabaseAuthService.login(loginDto);
//   }
//
//   @Public()
//   @Post('signup')
//   @ApiOperation({ summary: 'Регистрация пользователя через Supabase' })
//   @ApiResponse({ status: 201, description: 'Пользователь создан' })
//   @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
//   async signup(@Body() signupDto: SignupRequest): Promise<AuthResponse> {
//     return this.supabaseAuthService.signup(signupDto);
//   }
//
//   @Get('profile')
//   @UseGuards(SupabaseAuthGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
//   @ApiResponse({ status: 200, description: 'Профиль пользователя' })
//   @ApiResponse({ status: 401, description: 'Не авторизован' })
//   getProfile(@Request() req: AuthenticatedRequest) {
//     return req.user;
//   }
//
//   @Post('google-callback')
//   async handleGoogleCallback(
//     @Body()
//     body: {
//       access_token: string;
//       user: { id: string; email: string; name?: string };
//     },
//   ) {
//     return this.supabaseAuthService.handleGoogleCallback(body);
//   }
//
//   @Post('send-verification-code')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Отправить код верификации на email' })
//   @ApiResponse({ status: 200, description: 'Код успешно отправлен' })
//   @ApiResponse({
//     status: 400,
//     description: 'Некорректный email или слишком частые запросы',
//   })
//   @Post('complete-signup')
//   @HttpCode(HttpStatus.OK)
//   @ApiOperation({ summary: 'Завершить регистрацию с дополнительными данными' })
//   @ApiResponse({ status: 200, description: 'Регистрация завершена' })
//   @ApiResponse({ status: 400, description: 'Некорректные данные' })
//   async completeSignup(@Body() dto: CompleteSignupDto) {
//     return this.supabaseAuthService.completeSignup(dto);
//   }
// }

import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  HttpStatus,
  HttpCode,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SupabaseAuthService } from './supabase-auth.service';
import type { SignupRequest, AuthResponse } from '@/types';
import { Public } from './decorators/public.decorator';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { MagicLinkRateLimitGuard } from './guards/magic-link-rate-limit.guard';
import { SignupRateLimitGuard } from './guards/signup-rate-limit.guard';
import type { AuthenticatedRequest } from '@/types/auth';
import { CompleteSignupDto } from '@/auth/dto/complete-signup.dto';
import { SendMagicLinkDto } from '@/auth/dto/send-magic-link.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly supabaseAuthService: SupabaseAuthService) {}

  /**
   * 📝 Регистрация нового пользователя
   * После регистрации на email отправляется письмо для верификации
   */
  @Public()
  @UseGuards(SignupRateLimitGuard)
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Регистрация пользователя через email (без пароля)',
    description:
      'После регистрации на email будет отправлено письмо для подтверждения',
  })
  @ApiResponse({
    status: 201,
    description: 'Пользователь создан, проверьте email для подтверждения',
  })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит попыток регистрации (5 в день на IP)',
  })
  async signup(
    @Body() signupDto: SignupRequest,
  ): Promise<{ success: boolean; message: string }> {
    return this.supabaseAuthService.signup(signupDto);
  }

  /**
   * 🔗 Отправка магической ссылки для входа
   * Пользователь получит письмо со ссылкой для входа без пароля
   */
  @Public()
  @UseGuards(MagicLinkRateLimitGuard)
  @Post('send-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Отправить магическую ссылку для входа',
    description:
      'Отправляет на email ссылку для входа без пароля (passwordless)',
  })
  @ApiResponse({ status: 200, description: 'Ссылка отправлена на email' })
  @ApiResponse({ status: 400, description: 'Некорректный email' })
  @ApiResponse({
    status: 429,
    description:
      'Превышен лимит попыток отправки (3 в час на IP, 10 в час на email)',
  })
  async sendMagicLink(
    @Body() dto: SendMagicLinkDto,
  ): Promise<{ success: boolean }> {
    return this.supabaseAuthService.sendMagicLink(dto.email);
  }

  /**
   * ✅ Верификация токена (после клика по магической ссылке)
   * Этот эндпоинт используется после редиректа из email
   */
  @Public()
  @Get('verify')
  @ApiOperation({
    summary: 'Верификация магической ссылки или email',
    description: 'Обрабатывает токен из email и авторизует пользователя',
  })
  @ApiResponse({ status: 200, description: 'Успешная верификация' })
  @ApiResponse({ status: 401, description: 'Неверный или истекший токен' })
  async verifyToken(@Query('token') token: string): Promise<AuthResponse> {
    return this.supabaseAuthService.verifyMagicLink(token);
  }

  /**
   * 🔐 Google OAuth callback
   * Обработка авторизации через Google
   */
  @Public()
  @Post('google-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обработка Google OAuth callback',
    description:
      'Создает или авторизует пользователя после успешной OAuth авторизации через Google',
  })
  @ApiResponse({ status: 200, description: 'OAuth успешно обработан' })
  @ApiResponse({ status: 400, description: 'Ошибка обработки OAuth' })
  async handleGoogleCallback(
    @Body()
    body: {
      access_token: string;
      user: { id: string; email: string; name?: string };
    },
  ): Promise<AuthResponse> {
    return this.supabaseAuthService.handleGoogleCallback(body);
  }

  /**
   * 🎯 Завершение регистрации
   * Для пользователей, зарегистрированных через OAuth без данных о рождении
   */
  @Public()
  @Post('complete-signup-OAuth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Завершить регистрацию для OAuth пользователей',
    description:
      'Добавляет данные о рождении и создает натальную карту для пользователей, зарегистрированных через OAuth',
  })

  /**
   * 🚪 Выход из системы
   */
  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход из системы' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async logout(
    @Request() _req: AuthenticatedRequest,
  ): Promise<{ success: boolean }> {
    // Можно добавить логику очистки токенов на сервере если нужно
    return { success: true };
  }
  /**
   * 🎯 Завершение регистрации для OAuth пользователей
   * POST /auth/complete-signup
   *
   * Обновляет профиль данными о рождении и создает натальную карту
   */
  @Public()
  @Post('complete-signup')
  @HttpCode(HttpStatus.OK)
  async completeSignup(@Body() dto: CompleteSignupDto) {
    try {
      this.logger.log(`Complete signup request for user: ${dto.userId}`);

      const result = await this.supabaseAuthService.completeSignup(dto);

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      this.logger.error('Complete signup error:', error);
      throw error;
    }
  }
}
