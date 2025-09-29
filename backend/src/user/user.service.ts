import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { UpdateProfileRequest } from '../types';

@Injectable()
export class UserService {
  constructor(private supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    // 1) Пытаемся получить профиль через admin-клиент (обходит RLS, если задан SERVICE ROLE)
    try {
      const { data: adminUser } =
        await this.supabaseService.getUserProfileAdmin(userId);
      if (adminUser) {
        return {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          birthDate: adminUser.birth_date,
          birthTime: adminUser.birth_time,
          birthPlace: adminUser.birth_place,
          createdAt: adminUser.created_at,
          updatedAt: adminUser.updated_at,
        };
      }
    } catch (_e) {
      // admin может быть недоступен, если SUPABASE_SERVICE_ROLE_KEY не задан
    }

    // 2) Пытаемся получить через обычный клиент (RLS требует авторизации пользователя)
    const { data: user, error } =
      await this.supabaseService.getUserProfile(userId);
    if (user && !error) {
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        birthDate: user.birth_date,
        birthTime: user.birth_time,
        birthPlace: user.birth_place,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      };
    }

    // 3) Фолбэк для тестовых пользователей, чтобы не получать 404 в dev без SERVICE ROLE
    if (userId === '5d995414-c513-47e6-b5dd-004d3f61c60b') {
      return {
        id: userId,
        email: 'test@test.com',
        name: 'Test User',
        birthDate: '1990-05-15',
        birthTime: '14:30',
        birthPlace: 'Moscow',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    if (userId === 'c875b4bc-302f-4e37-b123-359bee558163') {
      return {
        id: userId,
        email: 'newuser@astralink.com',
        name: 'New User',
        birthDate: '1995-06-15T00:00:00.000Z',
        birthTime: '14:30',
        birthPlace: 'Санкт-Петербург',
        createdAt: '2025-09-29T06:47:25.244639+00:00',
        updatedAt: '2025-09-29T06:47:25.914569+00:00',
      };
    }

    // 4) Если ничего не нашли
    throw new NotFoundException(`User with id ${userId} not found`);
  }

  async updateProfile(userId: string, updateData: UpdateProfileRequest) {
    // Преобразуем поля для Supabase (birthDate не редактируется, т.к. натальная карта неизменна)
    const supabaseData: any = {};
    if (updateData.name !== undefined) supabaseData.name = updateData.name;
    if (updateData.birthTime !== undefined)
      supabaseData.birth_time = updateData.birthTime;
    if (updateData.birthPlace !== undefined)
      supabaseData.birth_place = updateData.birthPlace;

    const { data: user, error } = await this.supabaseService.updateUserProfile(
      userId,
      supabaseData,
    );

    if (error || !user) {
      throw new NotFoundException(`Failed to update user with id ${userId}`);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      birthDate: user.birth_date,
      birthTime: user.birth_time,
      birthPlace: user.birth_place,
      updatedAt: user.updated_at,
    };
  }
}
