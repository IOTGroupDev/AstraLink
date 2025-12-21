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
  Logger,
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
import { UpdateExtendedProfileDto } from './dto/update-extended-profile.dto';
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
  private readonly logger = new Logger(UserController.name);

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

  private getUserId(req: AuthenticatedRequest): string {
    // Extract user ID from authenticated request
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return userId;
  }

  // Нужен для Supabase RLS-контекста (auth.uid()) — используем Bearer токен пользователя
  private getAccessToken(req: AuthenticatedRequest): string {
    const auth = req.headers?.authorization || '';
    const [scheme, token] = auth.split(' ');
    if (!token || String(scheme).toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Missing bearer token');
    }
    return token;
  }

  @Get('subscription')
  async getMySubscription(
    @Request() req: AuthenticatedRequest,
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
    const token = this.getAccessToken(req);
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
    const token = this.getAccessToken(req);
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
    const token = this.getAccessToken(req);
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
    this.logger.log(`Delete account request for user: ${userId}`);

    await this.userService.deleteAccount(userId);

    return {
      success: true,
      message: 'Аккаунт и все связанные данные успешно удалены',
    };
  }

  @Get('profile-extended')
  async getExtendedProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id;
    const token = this.getAccessToken(req);

    // Создаем клиент с токеном пользователя для RLS
    const client = this.supabaseService.createClientWithToken(token);

    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // PGRST116 = no rows found - это нормально для нового пользователя
    if (error && error.code !== 'PGRST116') {
      this.logger.error('Error getting extended profile:', error);
      throw error;
    }

    // Возвращаем дефолтный профиль если не найден
    const nowIso = new Date().toISOString();
    return (
      data || {
        user_id: userId,
        bio: null,
        gender: null,
        city: null,
        latitude: null,
        longitude: null,
        zodiac_sign: null,
        looking_for: null,
        looking_for_gender: null,
        preferences: {},
        last_active: nowIso,
        is_onboarded: false,
        created_at: nowIso,
        updated_at: nowIso,
      }
    );
  }

  @Put('profile-extended')
  @ApiOperation({ summary: 'Update extended user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateExtendedProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: UpdateExtendedProfileDto,
  ) {
    const userId = req.user?.userId || req.user?.id;
    const token = this.getAccessToken(req);

    // Create client with user token for RLS
    const client = this.supabaseService.createClientWithToken(token);

    // Build payload with validated data
    // IMPORTANT: include only provided fields to avoid wiping existing data on partial updates
    const payload: any = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (updateData.bio !== undefined) {
      // bio может быть null (см. Transform в DTO) — это валидный кейс "очистить био"
      payload.bio = updateData.bio ?? null;
    }

    if (updateData.preferences !== undefined) {
      payload.preferences = updateData.preferences ?? {};
    }

    if (updateData.gender) {
      payload.gender = updateData.gender;
    }

    if (updateData.city) {
      payload.city = updateData.city;
    }

    if (updateData.looking_for !== undefined) {
      payload.looking_for = updateData.looking_for ?? null;
    }

    if (updateData.looking_for_gender !== undefined) {
      payload.looking_for_gender = updateData.looking_for_gender ?? null;
    }

    if (typeof updateData.is_onboarded === 'boolean') {
      payload.is_onboarded = updateData.is_onboarded;
    }

    const { data, error } = await client
      .from('user_profiles')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
}
