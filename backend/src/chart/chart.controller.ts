import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Body,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChartService } from './chart.service';
import type { CreateNatalChartRequest, TransitRequest } from '@/types';
import { Public } from '@/auth/decorators/public.decorator';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { LunarService } from '@/services/lunar.service';
import type { AuthenticatedRequest } from '@/types/auth';

@ApiTags('Chart')
@Controller('chart')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ChartController {
  constructor(
    private readonly chartService: ChartService,
    private readonly lunarService: LunarService,
  ) {}

  @Get('natal')
  @ApiOperation({ summary: 'Получить натальную карту пользователя' })
  @ApiResponse({ status: 200, description: 'Натальная карта' })
  @ApiResponse({ status: 404, description: 'Карта не найдена' })
  async getNatalChart(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getNatalChart(userId);
  }

  @Get('natal/interpretation')
  @ApiOperation({ summary: 'Получить детальную интерпретацию натальной карты' })
  @ApiResponse({ status: 200, description: 'Интерпретация натальной карты' })
  @ApiResponse({ status: 404, description: 'Интерпретация не найдена' })
  async getChartInterpretation(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getChartInterpretation(userId);
  }

  @Get('natal/full')
  @ApiOperation({ summary: 'Получить натальную карту с полной интерпретацией' })
  @ApiResponse({
    status: 200,
    description: 'Полная натальная карта с интерпретацией',
  })
  async getNatalChartWithInterpretation(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getNatalChartWithInterpretation(userId);
  }

  @Post('natal')
  @ApiOperation({ summary: 'Создать натальную карту' })
  @ApiResponse({ status: 201, description: 'Карта создана' })
  async createNatalChart(
    @Request() req: AuthenticatedRequest,
    @Body() chartData: CreateNatalChartRequest,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.createNatalChart(userId, chartData.data);
  }

  @Get('horoscope')
  @ApiOperation({
    summary: 'Получить гороскоп на период (FREE: базовый, PREMIUM: AI)',
  })
  @ApiQuery({
    name: 'period',
    description: 'Период: day, tomorrow, week, month',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Гороскоп на выбранный период' })
  async getHoroscope(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getHoroscope(userId, period);
  }

  @Get('horoscope/all')
  @ApiOperation({
    summary: 'Получить все гороскопы (день, завтра, неделя, месяц)',
  })
  @ApiResponse({ status: 200, description: 'Все гороскопы' })
  async getAllHoroscopes(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getAllHoroscopes(userId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Получить текущие позиции планет' })
  @ApiResponse({ status: 200, description: 'Текущие позиции планет' })
  async getCurrentPlanets(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getCurrentPlanets(userId);
  }

  @Get('biorhythms')
  @ApiOperation({ summary: 'Получить биоритмы на дату' })
  @ApiQuery({
    name: 'date',
    description:
      'Дата в формате YYYY-MM-DD (опционально, по умолчанию сегодня)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Биоритмы' })
  async getBiorhythms(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getBiorhythms(userId, date);
  }

  @Get('transits')
  @ApiOperation({ summary: 'Получить транзиты' })
  @ApiQuery({ name: 'from', description: 'Дата начала (YYYY-MM-DD)' })
  @ApiQuery({ name: 'to', description: 'Дата окончания (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Данные транзитов' })
  async getTransits(
    @Request() req: AuthenticatedRequest,
    @Query() query: TransitRequest,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getTransits(userId, query.from, query.to);
  }

  @Get('test')
  @Public()
  @ApiOperation({ summary: 'Тестовый эндпоинт для проверки расчетов' })
  @ApiResponse({ status: 200, description: 'Тестовые данные' })
  async testChart() {
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

  @Get('moon-phase')
  @Get('moon-moon-phase') // legacy alias for backward compatibility
  @ApiOperation({ summary: 'Получить фазу луны на указанную дату' })
  @ApiQuery({
    name: 'date',
    description:
      'Дата в формате YYYY-MM-DD (опционально, по умолчанию сегодня)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Фаза луны' })
  async getMoonPhase(
    @Request() req: AuthenticatedRequest,
    @Query('date') dateStr?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    // Парсим дату
    const date = dateStr ? new Date(dateStr) : new Date();

    // Получаем натальную карту для определения дома Луны
    let natalChart: any = null;
    try {
      if (userId) {
        const chart = await this.chartService.getNatalChart(userId);
        natalChart = chart?.data;
      }
    } catch (_error) {
      throw new UnauthorizedException(
        'Не удалось загрузить натальную карту для moon-phase',
      );
    }

    return this.lunarService.getMoonPhase(date, natalChart);
  }

  @Get('lunar-day')
  @ApiOperation({ summary: 'Получить текущий лунный день' })
  @ApiQuery({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD (опционально)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Лунный день' })
  async getLunarDay(@Query('date') dateStr?: string) {
    const date = dateStr ? new Date(dateStr) : new Date();
    return this.lunarService.getLunarDay(date);
  }

  @Get('lunar-calendar')
  @ApiOperation({ summary: 'Получить лунный календарь на месяц' })
  @ApiQuery({
    name: 'year',
    description: 'Год',
    required: false,
  })
  @ApiQuery({
    name: 'month',
    description: 'Месяц (0-11)',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Лунный календарь на месяц' })
  async getLunarCalendar(
    @Request() req: AuthenticatedRequest,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    const now = new Date();
    const year = yearStr ? parseInt(yearStr) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr) : now.getMonth();

    // Получаем натальную карту
    let natalChart: any = null;
    try {
      if (userId) {
        const chart = await this.chartService.getNatalChart(userId);
        natalChart = chart?.data;
      }
    } catch (_error) {
      throw new UnauthorizedException(
        'Не удалось загрузить натальную карту для lunar-calendar',
      );
    }

    return this.lunarService.getMonthlyCalendar(year, month, natalChart);
  }

  @Get('interpretation/details')
  @ApiOperation({
    summary: 'Получить расширенные детали интерпретации (“Подробнее”)',
  })
  @ApiQuery({
    name: 'type',
    description: 'Тип блока: planet | ascendant | house | aspect',
    required: true,
  })
  @ApiQuery({ name: 'planet', required: false })
  @ApiQuery({ name: 'sign', required: false })
  @ApiQuery({ name: 'houseNum', required: false })
  @ApiQuery({ name: 'aspect', required: false })
  @ApiQuery({ name: 'planetA', required: false })
  @ApiQuery({ name: 'planetB', required: false })
  @ApiQuery({ name: 'locale', description: 'ru | en | es', required: false })
  @ApiResponse({
    status: 200,
    description: 'Массив строк для показа в “Подробнее”',
  })
  async getInterpretationDetails(
    @Request() req: AuthenticatedRequest,
    @Query()
    query: {
      type: 'planet' | 'ascendant' | 'house' | 'aspect';
      planet?: string;
      sign?: string;
      houseNum?: number | string;
      aspect?: string;
      planetA?: string;
      planetB?: string;
      locale?: 'ru' | 'en' | 'es';
    },
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getInterpretationDetails(userId, query);
  }
}
