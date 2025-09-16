import { Controller, Get, Post, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionService } from './subscription.service';
import type { UpgradeSubscriptionRequest, SubscriptionStatusResponse } from '../types';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Получить статус подписки пользователя' })
  @ApiResponse({ status: 200, description: 'Статус подписки' })
  async getStatus(@Request() req): Promise<SubscriptionStatusResponse> {
    return this.subscriptionService.getStatus(req.user.id);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Обновить подписку пользователя' })
  @ApiResponse({ status: 200, description: 'Подписка обновлена' })
  @ApiResponse({ status: 400, description: 'Неверный уровень подписки' })
  async upgrade(@Request() req, @Body() upgradeData: UpgradeSubscriptionRequest) {
    return this.subscriptionService.upgrade(req.user.id, upgradeData.level);
  }
}
