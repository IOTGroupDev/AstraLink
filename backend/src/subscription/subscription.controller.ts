// backend/src/subscription/subscription.controller.ts
import {
  Controller,
  Get,
  Post,
  Request,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { IsEnum, IsOptional, IsIn, IsString } from 'class-validator';
import * as jwt from 'jsonwebtoken';
import { SubscriptionService } from './subscription.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SubscriptionStatusResponse, SubscriptionTier } from '../types';

// Interface for authenticated user on Express Request
interface AuthenticatedUser {
  id: string;
  userId?: string;
  email: string;
  name?: string;
}

// Extend Express Request to include our user type
interface AuthenticatedRequest extends ExpressRequest {
  user?: AuthenticatedUser;
}

/**
 * DTO для апгрейда подписки
 */
export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'premium', description: 'Новый уровень подписки' })
  @IsString()
  tier?: string;

  @ApiProperty({
    example: 'mock',
    required: false,
    description: 'Метод оплаты (для теста можно "mock")',
  })
  @IsOptional()
  @IsIn(['apple', 'google', 'mock'])
  paymentMethod?: 'apple' | 'google' | 'mock';

  @ApiProperty({
    example: 'txn_123456',
    required: false,
    description: 'ID транзакции от платёжного провайдера',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}

/**
 * DTO для ответа на апгрейд подписки
 */
export class UpgradeSubscriptionResponseDto {
  @ApiProperty({ example: true, description: 'Успешно ли выполнен апгрейд' })
  success?: boolean;

  @ApiProperty({
    example: 'Подписка Premium активирована (Mock)',
    description: 'Сообщение',
  })
  message?: string;

  @ApiProperty({
    type: 'object',
    properties: {
      tier: { example: 'premium', description: 'Уровень подписки' },
      expiresAt: {
        example: '2025-12-31T23:59:59.000Z',
        description: 'Дата окончания',
      },
    },
  })
  subscription?: {
    tier: SubscriptionTier;
    expiresAt: string;
  };
}

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  private getUserId(req: AuthenticatedRequest): string {
    // 1) Попробуем взять из guard-а
    const direct = req.user?.userId || req.user?.id;
    if (direct) return direct;

    // 2) Fallback: декодируем Bearer JWT без верификации, чтобы достать sub
    const rawHeader =
      req.headers?.authorization ??
      (req.headers?.['Authorization'] as string | undefined);
    const authHeader = rawHeader?.trim();

    if (authHeader) {
      const normalized = authHeader.replace(/^Bearer%20/i, 'Bearer ').trim();
      const parts = normalized.split(/\s+/);
      if (parts.length >= 2 && /^Bearer$/i.test(parts[0])) {
        let token = parts.slice(1).join(' ').trim();
        try {
          token = decodeURIComponent(token);
        } catch {
          // ignore decode fail
        }
        try {
          const decoded: any = jwt.decode(token);
          const userId =
            decoded?.sub || decoded?.user_id || decoded?.userId || decoded?.id;
          if (userId) return userId;
        } catch {
          // ignore decode fail
        }
      }
    }

    // 3) Если определить не удалось — это ошибка запроса
    throw new BadRequestException('Не удалось определить пользователя');
  }

  /**
   * Получить статус подписки текущего пользователя
   */
  @Get('status')
  @ApiOperation({ summary: 'Получить статус подписки пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Статус подписки',
  })
  async getStatus(
    @Request() req: AuthenticatedRequest,
  ): Promise<SubscriptionStatusResponse> {
    return this.subscriptionService.getStatus(this.getUserId(req));
  }

  /**
   * Активировать Trial (7 дней Premium бесплатно)
   */
  @Post('trial/activate')
  @ApiOperation({ summary: 'Активировать Trial период' })
  @ApiResponse({ status: 200, description: 'Trial активирован' })
  @ApiResponse({ status: 400, description: 'Trial уже был использован' })
  async activateTrial(@Request() req: AuthenticatedRequest) {
    return this.subscriptionService.activateTrial(this.getUserId(req));
  }

  /**
   * Обновить подписку (Mock платеж для разработки)
   */
  @Post('upgrade')
  @ApiOperation({ summary: 'Обновить подписку' })
  @ApiResponse({ status: 200, description: 'Подписка обновлена' })
  @ApiResponse({ status: 400, description: 'Неверный уровень подписки' })
  async upgrade(
    @Request() req: AuthenticatedRequest,
    @Body() upgradeData: UpgradeSubscriptionDto,
  ): Promise<UpgradeSubscriptionResponseDto> {
    // Нормализуем вход (enum в рантайме — обычная строка)
    const rawTier = (upgradeData as any)?.tier;
    const tierStr =
      typeof rawTier === 'string' ? rawTier.toLowerCase().trim() : rawTier;

    if (!tierStr || !['free', 'premium', 'max'].includes(tierStr)) {
      throw new BadRequestException('Неверный уровень подписки');
    }

    const pmRaw = (upgradeData as any)?.paymentMethod;
    const paymentMethod =
      pmRaw === 'apple' || pmRaw === 'google' || pmRaw === 'mock'
        ? pmRaw
        : 'mock';

    return this.subscriptionService.upgrade(
      this.getUserId(req),
      tierStr as SubscriptionTier,
      paymentMethod,
      (upgradeData as any)?.transactionId,
    );
  }

  /**
   * Отменить подписку
   */
  @Post('cancel')
  @ApiOperation({ summary: 'Отменить подписку' })
  @ApiResponse({ status: 200, description: 'Подписка отменена' })
  async cancel(@Request() req: AuthenticatedRequest) {
    return this.subscriptionService.cancel(this.getUserId(req));
  }

  /**
   * Получить доступные планы подписок
   */
  @Get('plans')
  @ApiOperation({ summary: 'Получить доступные планы' })
  @ApiResponse({ status: 200, description: 'Список планов' })
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  /**
   * Проверить лимиты использования (для MAX подписки)
   */
  @Get('limits')
  @ApiOperation({ summary: 'Проверить лимиты использования' })
  @ApiResponse({ status: 200, description: 'Лимиты использования' })
  async checkLimits(@Request() req: AuthenticatedRequest) {
    return this.subscriptionService.checkUsageLimits(this.getUserId(req));
  }

  /**
   * Получить персонализированные рекомендации upgrade
   */
  @Get('recommendations')
  @ApiOperation({
    summary: 'Получить персонализированные рекомендации upgrade',
  })
  @ApiResponse({ status: 200, description: 'Рекомендации на основе FOMO' })
  async getRecommendations(@Request() _req: AuthenticatedRequest) {
    // TODO: Implement personalized recommendations using AnalyticsService
    return { recommendations: [] };
  }

  /**
   * Получить историю платежей
   */
  @Get('payments')
  @ApiOperation({ summary: 'Получить историю платежей' })
  @ApiResponse({ status: 200, description: 'История платежей' })
  async getPaymentHistory(@Request() req: AuthenticatedRequest) {
    // ✅ PRISMA: Используем новый метод сервиса
    return await this.subscriptionService.getPaymentHistory(
      this.getUserId(req),
    );
  }
}
