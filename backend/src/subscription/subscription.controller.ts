import { Controller, Get, Post, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import type { UpgradeSubscriptionRequest, SubscriptionStatusResponse } from '../types';

@ApiTags('Subscription')
@Controller('subscription')
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Получить статус подписки пользователя' })
  @ApiResponse({ status: 200, description: 'Статус подписки' })
  async getStatus(@Request() req): Promise<SubscriptionStatusResponse> {
    return this.subscriptionService.getStatus(req.user.userId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Обновить подписку пользователя' })
  @ApiResponse({ status: 200, description: 'Подписка обновлена' })
  @ApiResponse({ status: 400, description: 'Неверный уровень подписки' })
  async upgrade(@Request() req, @Body() upgradeData: UpgradeSubscriptionRequest) {
    return this.subscriptionService.upgrade(req.user.userId, upgradeData.level);
  }
}
