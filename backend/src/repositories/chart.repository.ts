/**
 * Chart Repository Implementation
 * Централизованная логика доступа к натальным картам
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  IChartRepository,
  NatalChart,
  CreateChartDto,
  NotFoundError,
  DataAccessError,
} from './interfaces';

@Injectable()
export class ChartRepository implements IChartRepository {
  private readonly logger = new Logger(ChartRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  /**
   * Find chart by user ID with fallback strategy
   * Tries: Prisma → Admin Client → Regular Client
   */
  async findByUserId(userId: string): Promise<NatalChart | null> {
    try {
      // Strategy 1: Prisma (fastest, direct DB access)
      const prismaResult = await this.findByUserIdPrisma(userId);
      if (prismaResult) {
        this.logger.debug(`Chart for user ${userId} found via Prisma`);
        return prismaResult;
      }

      // Strategy 2: Admin Client (bypasses RLS)
      const adminResult = await this.findByUserIdAdmin(userId);
      if (adminResult) {
        this.logger.debug(`Chart for user ${userId} found via Admin Client`);
        return adminResult;
      }

      // Strategy 3: Regular Client (respects RLS)
      const regularResult = await this.findByUserIdRegular(userId);
      if (regularResult) {
        this.logger.debug(`Chart for user ${userId} found via Regular Client`);
        return regularResult;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error finding chart for user ${userId}`, error);
      throw new DataAccessError('Failed to find chart', error);
    }
  }

  /**
   * Find all charts for user
   */
  async findAllByUserId(userId: string): Promise<NatalChart[]> {
    try {
      // Try Prisma first
      const prismaCharts = await this.findAllByUserIdPrisma(userId);
      if (prismaCharts.length > 0) {
        return prismaCharts;
      }

      // Fallback to Supabase Admin
      const adminCharts = await this.findAllByUserIdAdmin(userId);
      return adminCharts;
    } catch (error) {
      this.logger.error(`Error finding all charts for user ${userId}`, error);
      throw new DataAccessError('Failed to find charts', error);
    }
  }

  /**
   * Create new natal chart
   */
  async create(data: CreateChartDto): Promise<NatalChart> {
    try {
      // Use Prisma for creation (fastest)
      const created = await this.prisma.chart.create({
        data: {
          userId: data.user_id,
          data: data.data,
        },
      });

      return this.normalizeChartData(created);
    } catch (error) {
      this.logger.error(
        `Failed to create chart for user ${data.user_id}`,
        error,
      );
      throw new DataAccessError('Failed to create chart', error);
    }
  }

  /**
   * Update existing chart
   */
  async update(chartId: string, data: any): Promise<NatalChart> {
    try {
      const updated = await this.prisma.chart.update({
        where: { id: chartId },
        data: { data },
      });

      return this.normalizeChartData(updated);
    } catch (error) {
      this.logger.error(`Failed to update chart ${chartId}`, error);
      throw new DataAccessError('Failed to update chart', error);
    }
  }

  /**
   * Delete chart
   */
  async delete(chartId: string): Promise<void> {
    try {
      await this.prisma.chart.delete({
        where: { id: chartId },
      });
    } catch (error) {
      this.logger.error(`Failed to delete chart ${chartId}`, error);
      throw new DataAccessError('Failed to delete chart', error);
    }
  }

  /**
   * Delete all charts for user
   */
  async deleteByUserId(userId: string): Promise<void> {
    try {
      // Use Admin Client for bulk delete (bypasses RLS)
      const admin = this.supabase.getAdminClient();
      const { error } = await admin
        .from('charts')
        .delete()
        .eq('user_id', userId);

      if (error) {
        throw new DataAccessError('Failed to delete charts', error);
      }
    } catch (error) {
      this.logger.error(`Failed to delete charts for user ${userId}`, error);
      throw error instanceof DataAccessError
        ? error
        : new DataAccessError('Failed to delete charts', error);
    }
  }

  /**
   * Check if user has a chart
   */
  async hasChart(userId: string): Promise<boolean> {
    const chart = await this.findByUserId(userId);
    return chart !== null;
  }

  /**
   * Find chart via Prisma
   */
  private async findByUserIdPrisma(userId: string): Promise<NatalChart | null> {
    try {
      const chart = await this.prisma.chart.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return chart ? this.normalizeChartData(chart) : null;
    } catch (error) {
      this.logger.warn(`Prisma failed for chart ${userId}`, error);
      return null;
    }
  }

  /**
   * Find all charts via Prisma
   */
  private async findAllByUserIdPrisma(userId: string): Promise<NatalChart[]> {
    try {
      const charts = await this.prisma.chart.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return charts.map((c: any) => this.normalizeChartData(c));
    } catch (error) {
      this.logger.warn(`Prisma findMany failed for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Find chart via Admin Client
   */
  private async findByUserIdAdmin(userId: string): Promise<NatalChart | null> {
    try {
      const { data, error } = await this.supabase.getUserChartsAdmin(userId);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Return most recent chart
      const sorted = data.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return this.normalizeChartData(sorted[0]);
    } catch (error) {
      this.logger.warn(`Admin client failed for chart ${userId}`, error);
      return null;
    }
  }

  /**
   * Find all charts via Admin Client
   */
  private async findAllByUserIdAdmin(userId: string): Promise<NatalChart[]> {
    try {
      const { data, error } = await this.supabase.getUserChartsAdmin(userId);

      if (error || !data) {
        return [];
      }

      return data.map((c: any) => this.normalizeChartData(c));
    } catch (error) {
      this.logger.warn(`Admin client findAll failed for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Find chart via Regular Client
   */
  private async findByUserIdRegular(
    userId: string,
  ): Promise<NatalChart | null> {
    try {
      const { data, error } = await this.supabase.getUserCharts(userId);

      if (error || !data || data.length === 0) {
        return null;
      }

      // Return most recent chart
      const sorted = data.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      return this.normalizeChartData(sorted[0]);
    } catch (error) {
      this.logger.warn(`Regular client failed for chart ${userId}`, error);
      return null;
    }
  }

  /**
   * Normalize chart data from different sources
   */
  private normalizeChartData(raw: any): NatalChart {
    return {
      id: raw.id,
      user_id: raw.userId || raw.user_id,
      data: raw.data,
      created_at: raw.createdAt || raw.created_at,
      updated_at: raw.updatedAt || raw.updated_at,
    };
  }
}
