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
import type {
  SignupRequest,
  AuthResponse,
  OAuthCallbackRequest,
} from '@/types';
import { Public } from '../common/decorators/public.decorator';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { MagicLinkRateLimitGuard } from './guards/magic-link-rate-limit.guard';
import { SignupRateLimitGuard } from './guards/signup-rate-limit.guard';
import type { AuthenticatedRequest } from '@/types/auth';
import { CompleteSignupDto } from '@/auth/dto/complete-signup.dto';
import { SendMagicLinkDto } from '@/auth/dto/send-magic-link.dto';
import { EnsureUserProfileDto } from '@/auth/dto/ensure-user-profile.dto';

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
  @Get('google')
  @ApiOperation({
    summary: 'Инициация Google OAuth',
    description: 'Возвращает ссылку для начала авторизации через Google',
  })
  @ApiResponse({ status: 200, description: 'Ссылка успешно сгенерирована' })
  async getGoogleOAuthUrl(
    @Query('redirectUri') redirectUri?: string,
  ): Promise<{ url: string }> {
    return this.supabaseAuthService.getOAuthUrl('google', redirectUri);
  }

  /**
   * 🔗 Создание Apple OAuth ссылки
   * Возвращает URL для начала авторизации через Apple
   */
  @Public()
  @Get('apple')
  @ApiOperation({
    summary: 'Инициация Apple OAuth',
    description: 'Возвращает ссылку для начала авторизации через Apple',
  })
  @ApiResponse({ status: 200, description: 'Ссылка успешно сгенерирована' })
  async getAppleOAuthUrl(
    @Query('redirectUri') redirectUri?: string,
  ): Promise<{ url: string }> {
    return this.supabaseAuthService.getOAuthUrl('apple', redirectUri);
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
    @Body() body: OAuthCallbackRequest,
  ): Promise<AuthResponse> {
    return this.supabaseAuthService.handleGoogleCallback(body);
  }

  /**
   * 🍏 Apple OAuth callback
   * Обработка авторизации через Apple
   */
  @Public()
  @Post('apple-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Обработка Apple OAuth callback',
    description:
      'Создает или авторизует пользователя после успешной OAuth авторизации через Apple',
  })
  @ApiResponse({ status: 200, description: 'OAuth успешно обработан' })
  @ApiResponse({ status: 400, description: 'Ошибка обработки OAuth' })
  async handleAppleCallback(
    @Body() body: OAuthCallbackRequest,
  ): Promise<AuthResponse> {
    return this.supabaseAuthService.handleAppleCallback(body);
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
  async completeSignup(
    @Body() dto: CompleteSignupDto,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      const resolvedUserId = (req.user?.userId || req.user?.id) ?? dto.userId;
      const userId = resolvedUserId;
      const rawAuth =
        (req.headers as any)?.authorization ??
        (req.headers as any)?.Authorization;
      const accessToken =
        typeof rawAuth === 'string'
          ? rawAuth.replace(/^Bearer\s+/i, '').trim()
          : undefined;

      this.logger.log(`Complete signup request for user: ${userId}`);

      const result = await this.supabaseAuthService.completeSignup(
        userId,
        dto,
        accessToken,
      );

      return {
        success: true,
        user: result.user,
      };
    } catch (error) {
      this.logger.error('Complete signup error:', error);
      throw error;
    }
  }

  /**
   * 🔧 Ensure user profile exists in public.users
   * POST /auth/ensure-profile
   *
   * Workaround for missing database trigger on auth.users
   * Creates public.users record if it doesn't exist after OTP verification
   */
  @Public()
  @Post('ensure-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ensure user profile exists',
    description:
      'Creates public.users profile if missing after OTP/OAuth authentication. Workaround for missing database trigger.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile ensured successfully',
  })
  async ensureUserProfile(@Body() dto: EnsureUserProfileDto) {
    try {
      this.logger.log(`Ensure profile request for user: ${dto.userId}`);

      const result = await this.supabaseAuthService.ensureUserProfile(
        dto.userId,
        dto.email,
      );

      return result;
    } catch (error) {
      this.logger.error('Ensure profile error:', error);
      throw error;
    }
  }
}
