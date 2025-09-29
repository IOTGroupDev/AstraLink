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
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { Public } from '../auth/decorators/public.decorator';
import type {
  UpgradeSubscriptionRequest,
  SubscriptionStatusResponse,
} from '../types';

@ApiTags('Subscription')
@Controller('subscription')
@UseGuards() // Отключаем глобальный guard
@Public() // Временно делаем все эндпоинты публичными для тестирования
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('status')
  @ApiOperation({ summary: 'Получить статус подписки пользователя' })
  @ApiResponse({ status: 200, description: 'Статус подписки' })
  async getStatus(@Request() req): Promise<SubscriptionStatusResponse> {
    // Для тестирования используем фиксированный userId
    const userId = req.user?.userId || 'c875b4bc-302f-4e37-b123-359bee558163'; // ID созданного пользователя
    return this.subscriptionService.getStatus(userId);
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Обновить подписку пользователя' })
  @ApiResponse({ status: 200, description: 'Подписка обновлена' })
  @ApiResponse({ status: 400, description: 'Неверный уровень подписки' })
  async upgrade(
    @Request() req,
    @Body() upgradeData: UpgradeSubscriptionRequest,
  ) {
    const userId = req.user?.userId || 'c875b4bc-302f-4e37-b123-359bee558163';
    return this.subscriptionService.upgrade(userId, upgradeData.level);
  }
}
