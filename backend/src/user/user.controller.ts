import { Controller, Get, Put, Request, Body, UseGuards } from '@nestjs/common';
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
}
