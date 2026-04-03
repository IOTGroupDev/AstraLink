import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Body,
  UseGuards,
  UnauthorizedException,
  Logger,
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
import { Public } from '@/common/decorators/public.decorator';
import { SupabaseAuthGuard } from '@/auth/guards/supabase-auth.guard';
import { ArchetypeService } from '@/chart/services/archetype.service';
import { LunarService } from '@/services/lunar.service';
import { getHeaderValue } from '@/common/utils/request-headers.util';
import type { AuthenticatedRequest } from '@/types/auth';

@ApiTags('Chart')
@Controller('chart')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ChartController {
  private readonly logger = new Logger(ChartController.name);
  constructor(
    private readonly chartService: ChartService,
    private readonly archetypeService: ArchetypeService,
    private readonly lunarService: LunarService,
  ) {}

  private resolveLocale(
    req: AuthenticatedRequest,
    localeQuery?: 'ru' | 'en' | 'es',
  ): 'ru' | 'en' | 'es' {
    if (localeQuery === 'ru' || localeQuery === 'en' || localeQuery === 'es') {
      return localeQuery;
    }

    const localeHeader =
      getHeaderValue(req, 'x-locale') || getHeaderValue(req, 'accept-language');

    return localeHeader?.toLowerCase().startsWith('es')
      ? 'es'
      : localeHeader?.toLowerCase().startsWith('en')
        ? 'en'
        : 'ru';
  }

  private parseUserLocalDate(
    dateStr?: string,
    tzOffsetMinutesStr?: string,
  ): Date {
    const tzOffsetMinutes = Number.parseInt(tzOffsetMinutesStr ?? '0', 10);
    const hasValidOffset = Number.isFinite(tzOffsetMinutes);

    if (!dateStr) {
      if (!hasValidOffset) {
        return new Date();
      }

      const now = new Date();
      const userNow = new Date(now.getTime() + tzOffsetMinutes * 60_000);

      return new Date(
        Date.UTC(
          userNow.getUTCFullYear(),
          userNow.getUTCMonth(),
          userNow.getUTCDate(),
          12,
          0,
          0,
        ) -
          tzOffsetMinutes * 60_000,
      );
    }

    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return new Date(dateStr);
    }

    const [year, month, day] = parts;
    const offsetMinutes = hasValidOffset ? tzOffsetMinutes : 0;

    return new Date(
      Date.UTC(year, month - 1, day, 12, 0, 0) - offsetMinutes * 60_000,
    );
  }

  private formatDateParam(date: Date): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

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
  async getChartInterpretation(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getChartInterpretation(
      userId,
      this.resolveLocale(req, localeQuery),
    );
  }

  @Get('natal/full')
  @ApiOperation({ summary: 'Получить натальную карту с полной интерпретацией' })
  @ApiResponse({
    status: 200,
    description: 'Полная натальная карта с интерпретацией',
  })
  async getNatalChartWithInterpretation(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.getNatalChartWithInterpretation(
      userId,
      this.resolveLocale(req, localeQuery),
    );
  }

  @Get('archetype')
  @ApiOperation({
    summary:
      'Получить архетип пользователя по натальной карте или дате рождения',
  })
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Архетип пользователя' })
  async getArchetype(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.archetypeService.getUserArchetype(
      userId,
      this.resolveLocale(req, localeQuery),
    );
  }

  @Post('natal/recalculate')
  @ApiOperation({
    summary:
      'Принудительно пересчитать натальную карту по текущим данным профиля',
  })
  @ApiResponse({
    status: 200,
    description: 'Натальная карта пересчитана',
  })
  @ApiResponse({
    status: 400,
    description: 'Неполные или некорректные birth data',
  })
  @ApiResponse({ status: 404, description: 'Натальная карта не найдена' })
  async forceRecalculateNatalChart(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.chartService.forceRecalculateNatalChart(
      userId,
      this.resolveLocale(req, localeQuery),
    );
  }

  @Post('natal')
  @ApiOperation({ summary: 'Создать натальную карту' })
  @ApiResponse({ status: 201, description: 'Карта создана' })
  async createNatalChart(
    @Request() req: AuthenticatedRequest,
    @Body() chartData: CreateNatalChartRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }
    return this.chartService.createNatalChart(
      userId,
      chartData.data,
      this.resolveLocale(req, localeQuery),
    );
  }

  @Post('regenerate-ai')
  @ApiOperation({
    summary:
      'Регенерировать интерпретацию натальной карты с помощью AI (макс. 1 раз в 24 часа)',
  })
  @ApiResponse({
    status: 200,
    description: 'Интерпретация успешно регенерирована',
  })
  @ApiResponse({
    status: 429,
    description: 'Превышен лимит генераций (доступна 1 раз в 24 часа)',
  })
  @ApiResponse({ status: 404, description: 'Натальная карта не найдена' })
  async regenerateChartWithAI(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    return this.chartService.regenerateChartWithAI(
      userId,
      this.resolveLocale(req, localeQuery),
    );
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
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Гороскоп на выбранный период' })
  async getHoroscope(
    @Request() req: AuthenticatedRequest,
    @Query('period') period: 'day' | 'tomorrow' | 'week' | 'month' = 'day',
    @Query('locale') localeQuery?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const tzOffsetMinutes = Number.parseInt(tzOffsetMinutesStr ?? '0', 10);

    return this.chartService.getHoroscope(
      userId,
      period,
      this.resolveLocale(req, localeQuery as 'ru' | 'en' | 'es' | undefined),
      Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0,
    );
  }

  @Get('horoscope/all')
  @ApiOperation({
    summary: 'Получить все гороскопы (день, завтра, неделя, месяц)',
  })
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Все гороскопы' })
  async getAllHoroscopes(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const tzOffsetMinutes = Number.parseInt(tzOffsetMinutesStr ?? '0', 10);

    return this.chartService.getAllHoroscopes(
      userId,
      this.resolveLocale(req, localeQuery as 'ru' | 'en' | 'es' | undefined),
      Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0,
    );
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
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Биоритмы' })
  async getBiorhythms(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const resolvedDate = this.formatDateParam(
      this.parseUserLocalDate(date, tzOffsetMinutesStr),
    );

    return this.chartService.getBiorhythms(userId, resolvedDate);
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
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Фаза луны' })
  async getMoonPhase(
    @Request() req: AuthenticatedRequest,
    @Query('date') dateStr?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
    @Query('locale') locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    const date = this.parseUserLocalDate(dateStr, tzOffsetMinutesStr);

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

    return this.lunarService.getMoonPhase(date, natalChart, locale);
  }

  @Get('lunar-day')
  @ApiOperation({ summary: 'Получить текущий лунный день' })
  @ApiQuery({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD (опционально)',
    required: false,
  })
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Лунный день' })
  async getLunarDay(
    @Query('date') dateStr?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
    @Query('locale') locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const date = this.parseUserLocalDate(dateStr, tzOffsetMinutesStr);
    return this.lunarService.getLunarDay(date, locale);
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
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiQuery({
    name: 'tzOffsetMinutes',
    description: 'Смещение пользователя от UTC в минутах',
    required: false,
  })
  @ApiResponse({ status: 200, description: 'Лунный календарь на месяц' })
  async getLunarCalendar(
    @Request() req: AuthenticatedRequest,
    @Query('year') yearStr?: string,
    @Query('month') monthStr?: string,
    @Query('tzOffsetMinutes') tzOffsetMinutesStr?: string,
    @Query('locale') locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;

    const now = new Date();
    const year = yearStr ? parseInt(yearStr) : now.getFullYear();
    const month = monthStr ? parseInt(monthStr) : now.getMonth();
    const tzOffsetMinutes = Number.parseInt(tzOffsetMinutesStr ?? '0', 10);

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

    return this.lunarService.getMonthlyCalendar(
      year,
      month,
      natalChart,
      locale,
      Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0,
    );
  }

  @Get('interpretation/details')
  @ApiOperation({
    summary: 'Получить расширенные детали интерпретации ("Подробнее")',
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
    description: 'Массив строк для показа в "Подробнее"',
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
    return this.chartService.getInterpretationDetails(
      userId,
      query,
      query.locale ?? 'ru',
    );
  }

  @Get('transits/interpretation')
  @ApiOperation({
    summary:
      'Получить детальную интерпретацию транзитов (FREE: базовая, PREMIUM/MAX: AI)',
  })
  @ApiQuery({
    name: 'date',
    description: 'Дата для анализа транзитов (YYYY-MM-DD)',
    required: false,
  })
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Интерпретация транзитов с учётом подписки',
  })
  async getTransitInterpretation(
    @Request() req: AuthenticatedRequest,
    @Query('date') dateStr?: string,
    @Query('locale') locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    return this.chartService.getTransitInterpretation(userId, date, locale);
  }

  @Get('transits/main-interpretation')
  @ApiOperation({
    summary: 'Получить AI-интерпретацию главного транзита (PREMIUM/MAX)',
  })
  @ApiQuery({
    name: 'date',
    description: 'Дата для анализа транзитов (YYYY-MM-DD)',
    required: false,
  })
  @ApiQuery({
    name: 'locale',
    description: 'ru | en | es',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'AI-интерпретация главного транзита',
  })
  @ApiResponse({
    status: 403,
    description: 'Требуется платная подписка',
  })
  async getMainTransitInterpretation(
    @Request() req: AuthenticatedRequest,
    @Query('date') dateStr?: string,
    @Query('locale') locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      this.logger.warn('Main transit interpretation: missing userId');
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    this.logger.log(
      `Main transit interpretation request user=${userId} date=${date.toISOString()} locale=${locale}`,
    );
    return this.chartService.getMainTransitInterpretation(userId, date, locale);
  }

  @Post('admin/fix-nested-data')
  @ApiOperation({
    summary: 'Fix deeply nested chart data (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Migration results',
  })
  async fixNestedChartData(@Request() req: AuthenticatedRequest) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Пользователь не аутентифицирован');
    }

    // TODO: Add admin role check
    // For now, any authenticated user can run this
    // In production, restrict to admin role only

    return this.chartService.fixNestedChartData();
  }
}
