import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';
import { UserService } from './user.service';
import { UpdateProfileDto } from '@/common/dto/request-validation.dto';

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

@Controller('api/user/supabase')
@UseGuards(SupabaseAuthGuard)
export class SupabaseUserController {
  constructor(
    private supabaseService: SupabaseService,
    private readonly userService: UserService,
  ) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || '';
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileDto,
  ) {
    const userId = req.user?.userId || req.user?.id || '';
    return this.userService.updateProfile(userId, updateData);
  }

  @Get('charts')
  async getUserCharts(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || '';

    const { data, error } =
      await this.supabaseService.getUserChartsAdmin(userId);

    if (error) {
      throw new Error('Ошибка получения натальных карт');
    }

    return data;
  }
}
