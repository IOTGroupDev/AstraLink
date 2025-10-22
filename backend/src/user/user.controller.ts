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
import { Request as ExpressRequest } from 'express';
import { UserService } from './user.service';
import type { UpdateProfileRequest } from '../types';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';

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

@ApiTags('User')
@Controller('user')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Получить профиль пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль пользователя' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id;
    return this.userService.getProfile(userId as string);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Обновить профиль пользователя' })
  @ApiResponse({ status: 200, description: 'Профиль обновлен' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileRequest,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.userService.updateProfile(userId as string, updateData);
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
  async deleteAccount(@Request() req: AuthenticatedRequest) {
    const userId = (req.user?.userId || req.user?.id) as string;
    console.log(`🗑️ Запрос на удаление аккаунта пользователя: ${userId}`);

    await this.userService.deleteAccount(userId);

    return {
      success: true,
      message: 'Аккаунт и все связанные данные успешно удалены',
    };
  }
}
