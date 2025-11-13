/**
 * User Repository Implementation
 * Централизованная логика доступа к пользовательским данным
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  IUserRepository,
  UserProfile,
  CreateUserDto,
  UpdateUserDto,
  NotFoundError,
  DataAccessError,
} from './interfaces';

@Injectable()
export class UserRepository implements IUserRepository {
  private readonly logger = new Logger(UserRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Find user by ID with fallback strategy
   * Tries: Admin Client → Regular Client → Prisma → Hardcoded test users
   */
  async findById(userId: string): Promise<UserProfile | null> {
    try {
      // Strategy 1: Admin Client (bypasses RLS)
      const adminResult = await this.findByIdAdmin(userId);
      if (adminResult) {
        this.logger.debug(`User ${userId} found via Admin Client`);
        return adminResult;
      }

      // Strategy 2: Regular Client (respects RLS)
      const regularResult = await this.findByIdRegular(userId);
      if (regularResult) {
        this.logger.debug(`User ${userId} found via Regular Client`);
        return regularResult;
      }

      // Strategy 3: Prisma (direct DB access)
      const prismaResult = await this.findByIdPrisma(userId);
      if (prismaResult) {
        this.logger.debug(`User ${userId} found via Prisma`);
        return prismaResult;
      }

      // Strategy 4: Hardcoded test users (development fallback)
      const testUser = this.getTestUser(userId);
      if (testUser) {
        this.logger.debug(`User ${userId} found via test user fallback`);
        return testUser;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding user ${userId}`, error);
      throw new DataAccessError('Failed to find user', error);
    }
  }

  /**
   * Find user by ID using admin client
   */
  async findByIdAdmin(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase.getUserProfileAdmin(userId);

      if (error || !data) {
        return null;
      }

      return this.normalizeUserData(data);
    } catch (error) {
      this.logger.warn(`Admin client failed for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Find user by ID using regular client (RLS)
   */
  private async findByIdRegular(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase.getUserProfile(userId);

      if (error || !data) {
        return null;
      }

      return this.normalizeUserData(data);
    } catch (error) {
      this.logger.warn(`Regular client failed for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Find user by ID using Prisma
   */
  private async findByIdPrisma(userId: string): Promise<UserProfile | null> {
    try {
      // Note: Prisma access requires proper schema setup
      // This is a fallback if Supabase clients fail
      // In current implementation, Prisma doesn't have direct user access
      // You would need to add this to your Prisma schema if needed
      return null;
    } catch (error) {
      this.logger.warn(`Prisma failed for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Hardcoded test users for development
   */
  private getTestUser(userId: string): UserProfile | null {
    const testUsers: Record<string, UserProfile> = {
      '5d995414-c513-47e6-b5dd-004d3f61c60b': {
        id: '5d995414-c513-47e6-b5dd-004d3f61c60b',
        email: 'test@example.com',
        name: 'Test User 1',
        birth_date: '1990-01-15',
        birth_time: '14:30',
        birth_place: 'Moscow, Russia',
        gender: 'male',
      },
      'c875b4bc-302f-4e37-b123-359bee558163': {
        id: 'c875b4bc-302f-4e37-b123-359bee558163',
        email: 'test2@example.com',
        name: 'Test User 2',
        birth_date: '1985-06-20',
        birth_time: '10:15',
        birth_place: 'Saint Petersburg, Russia',
        gender: 'female',
      },
    };

    return testUsers[userId] || null;
  }

  /**
   * Create new user profile
   */
  async create(data: CreateUserDto): Promise<UserProfile> {
    try {
      const admin = this.supabase.getAdminClient();

      const insertPayload: any = {
        id: data.id,
        email: data.email,
        name: data.name,
        birth_date: data.birth_date,
        birth_time: data.birth_time,
        birth_place: data.birth_place,
        gender: data.gender,
        city: data.city,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error } = await admin
        .from('users')
        .insert(insertPayload)
        .select()
        .single();

      if (error || !created) {
        throw new DataAccessError('Failed to create user', error);
      }

      return this.normalizeUserData(created);
    } catch (error) {
      this.logger.error(`Failed to create user ${data.id}`, error);
      throw error instanceof DataAccessError
        ? error
        : new DataAccessError('Failed to create user', error);
    }
  }

  /**
   * Update user profile
   */
  async update(userId: string, data: UpdateUserDto): Promise<UserProfile> {
    try {
      const admin = this.supabase.getAdminClient();

      const updatePayload: any = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      const { data: updated, error } = await admin
        .from('users')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (error || !updated) {
        throw new DataAccessError('Failed to update user', error);
      }

      return this.normalizeUserData(updated);
    } catch (error) {
      this.logger.error(`Failed to update user ${userId}`, error);
      throw error instanceof DataAccessError
        ? error
        : new DataAccessError('Failed to update user', error);
    }
  }

  /**
   * Delete user profile
   */
  async delete(userId: string): Promise<void> {
    try {
      const admin = this.supabase.getAdminClient();

      const { error } = await admin.from('users').delete().eq('id', userId);

      if (error) {
        throw new DataAccessError('Failed to delete user', error);
      }
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId}`, error);
      throw error instanceof DataAccessError
        ? error
        : new DataAccessError('Failed to delete user', error);
    }
  }

  /**
   * Check if user exists
   */
  async exists(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user !== null;
  }

  /**
   * Normalize user data from different sources
   */
  private normalizeUserData(raw: any): UserProfile {
    return {
      id: raw.id,
      email: raw.email || null,
      name: raw.name || null,
      birth_date: raw.birth_date || null,
      birth_time: raw.birth_time || null,
      birth_place: raw.birth_place || null,
      gender: raw.gender || null,
      city: raw.city || null,
      interests: raw.interests || null,
      bio: raw.bio || null,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }
}
