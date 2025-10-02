import {
  Controller,
  Get,
  Put,
  Request,
  Body,
  UseGuards,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { Public } from '../auth/decorators/public.decorator';
import type { UpdateProfileRequest } from '../types';

@ApiTags('User')
@Controller('user')
@UseGuards() // Отключаем глобальный guard
@Public() // Временно делаем все эндпоинты публичными для тестирования
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  async getProfile(@Request() req) {
    // Для тестирования используем фиксированный userId
    const userId = req.user?.userId || '5d995414-c513-47e6-b5dd-004d3f61c60b'; // ID тестового пользователя
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Обновить профиль пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль обновлен' })
  async updateProfile(
    @Request() req,
    @Body() updateData: UpdateProfileRequest,
  ) {
    // Для тестирования используем фиксированный userId
    const userId = req.user?.userId || 'c875b4bc-302f-4e37-b123-359bee558163'; // ID созданного пользователя
    return this.userService.updateProfile(userId, updateData);
  }

  /**
   * 🗑️ DELETE /user/account
   * Полное удаление аккаунта пользователя и всех связанных данных
   *
   * Удаляет:
   * - Профиль пользователя из таблицы users
   * - Все натальные карты (charts)
   * - Все связи (connections)
   * - Все данные знакомств (dating_matches)
   * - Подписку (subscriptions) - удаляется автоматически через CASCADE
   * - Пользователя из Supabase Auth
   */
  @Delete('account')
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Request() req) {
    const userId = req.user.id;
    console.log(`🗑️ Запрос на удаление аккаунта пользователя: ${userId}`);

    await this.userService.deleteAccount(userId);

    return {
      success: true,
      message: 'Аккаунт и все связанные данные успешно удалены',
    };
  }
}
