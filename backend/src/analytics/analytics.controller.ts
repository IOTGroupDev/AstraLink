import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AdminGuard } from '../common/guards/admin.guard';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(SupabaseAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'Получить аналитику по подпискам' })
  async getSubscriptionAnalytics() {
    return this.analyticsService.getSubscriptionAnalytics();
  }

  @Get('features')
  @ApiOperation({ summary: 'Получить статистику использования функций' })
  async getFeatureUsageStats() {
    return this.analyticsService.getFeatureUsageStats();
  }
}
