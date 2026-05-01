import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { RequiresSubscription } from '@/common/decorators/requires-subscription.decorator';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { SubscriptionTier } from '@/types';
import type { AuthenticatedRequest } from '@/types/auth';
import { CompatibilityService } from './compatibility.service';
import { CreateCompatibilityReportDto } from './dto/create-compatibility-report.dto';

@ApiTags('Compatibility')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, SubscriptionGuard)
@Controller('compatibility')
export class CompatibilityController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @Post('reports')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiOperation({
    summary:
      'Создать приватный отчет совместимости по данным рождения партнера',
  })
  @ApiResponse({ status: 201, description: 'Отчет рассчитан и сохранен' })
  async createReport(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCompatibilityReportDto,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.compatibilityService.createReport(userId, dto);
  }

  @Get('quota')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiOperation({
    summary: 'Получить недельный лимит запросов совместимости',
  })
  async getQuota(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.compatibilityService.getQuotaStatus(userId);
  }

  @Get('reports')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiOperation({ summary: 'Получить историю отчетов совместимости' })
  async getReports(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.compatibilityService.getReports(userId);
  }

  @Get('reports/:id')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiOperation({ summary: 'Получить один отчет совместимости' })
  @ApiParam({ name: 'id', description: 'ID отчета' })
  async getReport(
    @Request() req: AuthenticatedRequest,
    @Param('id') reportId: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.compatibilityService.getReport(userId, reportId);
  }

  @Delete('reports/:id')
  @RequiresSubscription(SubscriptionTier.PREMIUM, SubscriptionTier.MAX)
  @ApiOperation({ summary: 'Удалить отчет совместимости' })
  @ApiParam({ name: 'id', description: 'ID отчета' })
  async deleteReport(
    @Request() req: AuthenticatedRequest,
    @Param('id') reportId: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.compatibilityService.deleteReport(userId, reportId);
  }
}
