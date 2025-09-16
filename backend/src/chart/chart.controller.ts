import { Controller, Get, Post, Query, UseGuards, Request, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChartService } from './chart.service';
import type { CreateNatalChartRequest, TransitRequest } from '../types';

@ApiTags('Chart')
@Controller('chart')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChartController {
  constructor(private readonly chartService: ChartService) {}

  @Get('natal')
  @ApiOperation({ summary: 'Получить натальную карту пользователя' })
  @ApiResponse({ status: 200, description: 'Натальная карта' })
  @ApiResponse({ status: 404, description: 'Карта не найдена' })
  async getNatalChart(@Request() req) {
    return this.chartService.getNatalChart(req.user.userId);
  }

  @Post('natal')
  @ApiOperation({ summary: 'Сохранить натальную карту' })
  @ApiResponse({ status: 201, description: 'Карта сохранена' })
  async createNatalChart(@Request() req, @Body() chartData: CreateNatalChartRequest) {
    return this.chartService.createNatalChart(req.user.userId, chartData.data);
  }

  @Get('transits')
  @ApiOperation({ summary: 'Получить транзиты' })
  @ApiQuery({ name: 'from', description: 'Дата начала (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', description: 'Дата окончания (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Данные транзитов' })
  async getTransits(@Request() req, @Query() query: TransitRequest) {
    return this.chartService.getTransits(req.user.userId, query.from, query.to);
  }
}
