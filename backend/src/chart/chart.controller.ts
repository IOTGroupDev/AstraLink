import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChartService } from './chart.service';
import type { CreateNatalChartRequest, TransitRequest } from '../types';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Chart')
@Controller('chart')
@UseGuards() // Отключаем глобальный guard
@Public() // Временно делаем все эндпоинты публичными для тестирования
@ApiBearerAuth()
export class ChartController {
  constructor(private readonly chartService: ChartService) {}

  @Get('natal')
  @ApiOperation({ summary: 'Получить натальную карту пользователя' })
  @ApiResponse({ status: 200, description: 'Натальная карта' })
  @ApiResponse({ status: 404, description: 'Карта не найдена' })
  async getNatalChart(@Request() req) {
    // Для тестирования используем фиксированный userId
    const userId = req.user?.userId || '06e2f1f4-1106-415a-807d-ef9aff393127';
    return this.chartService.getNatalChart(userId);
  }

  @Get('test')
  @ApiOperation({ summary: 'Тестовый эндпоинт для проверки расчетов' })
  @ApiResponse({ status: 200, description: 'Тестовые данные' })
  async testChart() {
    // Тестовый расчет без аутентификации
    const mockUser = {
      birthDate: new Date('1990-01-01'),
      birthTime: '12:00',
      birthPlace: 'Москва',
    };

    const birthDate = mockUser.birthDate.toISOString().split('T')[0];
    const birthTime = mockUser.birthTime;
    const location = this.chartService.getLocationCoordinates(
      mockUser.birthPlace,
    );

    const natalChartData = await this.chartService[
      'ephemerisService'
    ].calculateNatalChart(birthDate, birthTime, location);

    return {
      message: 'Тестовый расчет завершен',
      data: natalChartData,
    };
  }

  @Post('natal')
  @ApiOperation({ summary: 'Сохранить натальную карту' })
  @ApiResponse({ status: 201, description: 'Карта сохранена' })
  async createNatalChart(
    @Request() req,
    @Body() chartData: CreateNatalChartRequest,
  ) {
    return this.chartService.createNatalChart(req.user.userId, chartData.data);
  }

  @Get('current')
  @ApiOperation({ summary: 'Получить текущие позиции планет' })
  @ApiResponse({ status: 200, description: 'Текущие позиции планет' })
  async getCurrentPlanets(@Request() req) {
    return this.chartService.getCurrentPlanets(req.user.userId);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Получить астрологические предсказания' })
  @ApiQuery({
    name: 'period',
    description: 'Период: day, week, month',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Предсказания' })
  async getPredictions(
    @Request() req,
    @Query('period') period: string = 'day',
  ) {
    return this.chartService.getPredictions(req.user.userId, period);
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
