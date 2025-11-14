import {
  Controller,
  Get,
  Put,
  Post,
  Request,
  Body,
  UseGuards,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { UserService } from './user.service';
import { BlockUserDto, ReportUserDto } from './dto/moderation.dto';
import type {
  SubscriptionStatusResponse,
  UpdateProfileRequest,
} from '../types';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SubscriptionService } from '@/subscription/subscription.service';
import { SupabaseService } from '@/supabase/supabase.service';

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
  constructor(
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
    private readonly supabaseService: SupabaseService,
  ) {}

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

  private getUserId(req: Request): string {
    // подстрой под то, как ты прокидываешь user в req (JWT/Passport/Supabase)
    // Часто: req.user?.id или req['user']?.id
    const userId =
      (req as any).user?.id ||
      (req as any).user?.sub || // JWT sub
      (req as any).authUserId; // если где-то так положил
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return userId;
  }

  // Нужен для Supabase RLS-контекста (auth.uid()) — используем Bearer токен пользователя
  private getAccessToken(req: any): string {
    const auth = req?.headers?.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Missing bearer token');
    }
    return token;
  }

  @Get('subscription')
  async getMySubscription(
    @Req() req: Request,
  ): Promise<SubscriptionStatusResponse> {
    const userId = this.getUserId(req);
    return this.subscriptionService.getStatus(userId);
  }

  // POST /api/user/block — заблокировать пользователя
  @Post('block')
  @ApiOperation({ summary: 'Заблокировать пользователя' })
  @ApiResponse({ status: 200, description: 'Пользователь заблокирован' })
  async blockUser(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BlockUserDto,
  ) {
    if (!dto?.blockedUserId) {
      throw new UnauthorizedException('blockedUserId is required');
    }
    const token = this.getAccessToken(req as any);
    return this.userService.blockUserWithToken(token, dto.blockedUserId);
  }

  // GET /api/user/blocks — список заблокированных
  @Get('blocks')
  @ApiOperation({
    summary: 'Список заблокированных пользователей текущего пользователя',
  })
  @ApiResponse({ status: 200, description: 'Список блокировок' })
  async listBlocks(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const token = this.getAccessToken(req as any);
    const safeLimit = limit
      ? Math.max(1, Math.min(100, parseInt(limit, 10)))
      : 50;
    const safeOffset = offset ? Math.max(0, parseInt(offset, 10)) : 0;

    return this.userService.listBlocksWithToken(token, safeLimit, safeOffset);
  }

  // POST /api/user/report — пожаловаться на пользователя
  @Post('report')
  @ApiOperation({ summary: 'Пожаловаться на пользователя' })
  @ApiResponse({ status: 200, description: 'Жалоба отправлена' })
  async reportUser(
    @Request() req: AuthenticatedRequest,
    @Body() dto: ReportUserDto,
  ) {
    if (!dto?.reportedUserId || !dto?.reason) {
      throw new UnauthorizedException('reportedUserId and reason are required');
    }
    const token = this.getAccessToken(req as any);
    return this.userService.reportUserWithToken(
      token,
      dto.reportedUserId,
      dto.reason,
    );
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

  @Get('profile-extended')
  async getExtendedProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id;
    const token = this.getAccessToken(req as any);

    // Создаем клиент с токеном пользователя для RLS
    const client = this.supabaseService.createClientWithToken(token);

    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // PGRST116 = no rows found - это нормально для нового пользователя
    if (error && error.code !== 'PGRST116') {
      console.error('Error getting extended profile:', error);
      throw error;
    }

    // Возвращаем дефолтный профиль если не найден
    return (
      data || {
        user_id: userId,
        bio: null,
        preferences: {},
        is_onboarded: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );
  }

  @Put('profile-extended')
  async updateExtendedProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const token = this.getAccessToken(req as any);

    // Создаем клиент с токеном пользователя для RLS
    const client = this.supabaseService.createClientWithToken(token);

    // Формируем payload, чтобы передавать только указанные поля
    const payload: any = {
      user_id: userId,
      bio: updateData?.bio ?? null,
      preferences: updateData?.preferences ?? {},
      updated_at: new Date().toISOString(),
    };
    if (typeof updateData?.gender === 'string') {
      payload.gender = updateData.gender;
    }
    if (typeof updateData?.is_onboarded === 'boolean') {
      payload.is_onboarded = updateData.is_onboarded;
    }

    const { data, error } = await client
      .from('user_profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error updating extended profile:', error);
      throw error;
    }

    return data;
  }
}
