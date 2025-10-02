// backend/src/subscription/subscription.controller.ts
import {
  Controller,
  Get,
  Post,
  Request,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SubscriptionStatusResponse, SubscriptionTier } from '../types';

/**
 * DTO для ответа "Статус подписки"
 */
export class SubscriptionStatusResponseDto {
  @ApiProperty({ example: 'premium', description: 'Уровень подписки' })
  tier: string;

  @ApiProperty({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Дата окончания подписки',
  })
  expiresAt: string;

  @ApiProperty({ example: true, description: 'Используется ли Trial' })
  isTrial: boolean;
}

/**
 * DTO для апгрейда подписки
 */
export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'premium', description: 'Новый уровень подписки' })
  tier: SubscriptionTier;

  @ApiProperty({
    example: 'mock',
    required: false,
    description: 'Метод оплаты (для теста можно "mock")',
  })
  paymentMethod?: 'apple' | 'google' | 'mock';

  @ApiProperty({
    example: 'txn_123456',
    required: false,
    description: 'ID транзакции от платёжного провайдера',
  })
  transactionId?: string;
}

/**
 * DTO для ответа на апгрейд подписки
 */
export class UpgradeSubscriptionResponseDto {
  @ApiProperty({ example: true, description: 'Успешно ли выполнен апгрейд' })
  success: boolean;

  @ApiProperty({
    example: 'Подписка Premium активирована (Mock)',
    description: 'Сообщение',
  })
  message: string;

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
  subscription: {
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

  private getUserId(req: any): string {
    return req.user?.userId || req.user?.id;
  }

  /**
   * Получить статус подписки текущего пользователя
   */
  @Get('status')
  @ApiOperation({ summary: 'Получить статус подписки пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Статус подписки',
    type: SubscriptionStatusResponseDto,
  })
  async getStatus(@Request() req): Promise<SubscriptionStatusResponse> {
    return this.subscriptionService.getStatus(this.getUserId(req));
  }

  /**
   * Активировать Trial (7 дней Premium бесплатно)
   */
  @Post('trial/activate')
  @ApiOperation({ summary: 'Активировать Trial период' })
  @ApiResponse({ status: 200, description: 'Trial активирован' })
  @ApiResponse({ status: 400, description: 'Trial уже был использован' })
  async activateTrial(@Request() req) {
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
    @Request() req,
    @Body() upgradeData: UpgradeSubscriptionDto,
  ): Promise<UpgradeSubscriptionResponseDto> {
    return this.subscriptionService.upgrade(
      this.getUserId(req),
      upgradeData.tier,
      upgradeData.paymentMethod || 'mock',
      upgradeData.transactionId,
    );
  }

  /**
   * Отменить подписку
   */
  @Post('cancel')
  @ApiOperation({ summary: 'Отменить подписку' })
  @ApiResponse({ status: 200, description: 'Подписка отменена' })
  async cancel(@Request() req) {
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
  async checkLimits(@Request() req) {
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
  async getRecommendations(@Request() req) {
    // TODO: Implement personalized recommendations using AnalyticsService
    return { recommendations: [] };
  }

  /**
   * Получить историю платежей
   */
  @Get('payments')
  @ApiOperation({ summary: 'Получить историю платежей' })
  @ApiResponse({ status: 200, description: 'История платежей' })
  async getPaymentHistory(@Request() req) {
    const { data, error } = await this.subscriptionService['supabaseService']
      .from('payments')
      .select('*')
      .eq('user_id', this.getUserId(req))
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];

    return (
      data?.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        provider: payment.provider,
        createdAt: payment.created_at,
      })) || []
    );
  }
}
