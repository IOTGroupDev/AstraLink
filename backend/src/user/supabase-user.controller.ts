import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { SupabaseService } from '../supabase/supabase.service';

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
  constructor(private supabaseService: SupabaseService) {}

  @Get('profile')
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || '';

    const { data, error } = await this.supabaseService.getUserProfile(userId);

    if (error) {
      throw new Error('Ошибка получения профиля');
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      birthDate: data.birth_date,
      birthTime: data.birth_time,
      birthPlace: data.birth_place,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  @Put('profile')
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateData: any,
  ) {
    const userId = req.user?.userId || req.user?.id || '';

    // Подготавливаем данные для обновления
    const profileData: Record<string, any> = {
      name: updateData.name,
      birth_date: updateData.birthDate
        ? new Date(updateData.birthDate)
        : undefined,
      birth_time: updateData.birthTime,
      birth_place: updateData.birthPlace,
      updated_at: new Date().toISOString(),
    };

    // Удаляем undefined значения
    Object.keys(profileData).forEach((key) => {
      if (profileData[key] === undefined) {
        delete profileData[key];
      }
    });

    const { data, error } = await this.supabaseService.updateUserProfile(
      userId,
      profileData,
    );

    if (error) {
      throw new Error('Ошибка обновления профиля');
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      birthDate: data.birth_date,
      birthTime: data.birth_time,
      birthPlace: data.birth_place,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  @Get('charts')
  async getUserCharts(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || '';

    const { data, error } = await this.supabaseService.getUserCharts(userId);

    if (error) {
      throw new Error('Ошибка получения натальных карт');
    }

    return data;
  }
}
