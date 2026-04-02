import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { NatalService } from './natal.service';
import { CreateNatalChartDto } from './dto/create-natal-chart.dto';
import { NatalChartResponseDto } from './dto/natal-chart-response.dto';
import type { AuthenticatedRequest } from '@/types/auth';
import { getHeaderValue } from '@/common/utils/request-headers.util';

@ApiTags('natal')
@Controller('natal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NatalController {
  constructor(private readonly natalService: NatalService) {}

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

  @Post()
  @ApiOperation({ summary: 'Создать натальную карту' })
  @ApiResponse({
    status: 201,
    description: 'Натальная карта создана',
    type: NatalChartResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async createNatalChart(
    @Request() req: AuthenticatedRequest,
    @Body() createNatalChartDto: CreateNatalChartDto,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ): Promise<NatalChartResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('Пользователь не аутентифицирован');
    }

    // Преобразуем DTO в параметры для сервиса
    const result = await this.natalService.createNatalChartWithInterpretation(
      userId,
      createNatalChartDto.birthDate,
      createNatalChartDto.birthTime,
      createNatalChartDto.birthPlace,
      createNatalChartDto.latitude !== undefined &&
        createNatalChartDto.longitude !== undefined
        ? {
            latitude: createNatalChartDto.latitude,
            longitude: createNatalChartDto.longitude,
            timezone: createNatalChartDto.timezone,
          }
        : undefined,
      this.resolveLocale(req, localeQuery),
    );

    return {
      id: result.id,
      userId: result.userId,
      data: result.data,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Получить натальную карту пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Натальная карта',
    type: NatalChartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Натальная карта не найдена' })
  async getNatalChart(
    @Request() req: AuthenticatedRequest,
  ): Promise<NatalChartResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('Пользователь не аутентифицирован');
    }

    const result = await this.natalService.getNatalChart(userId);

    return {
      id: result.id,
      userId: result.userId,
      data: result.data,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Get('full')
  @ApiOperation({ summary: 'Получить натальную карту с полной интерпретацией' })
  @ApiResponse({
    status: 200,
    description: 'Натальная карта с интерпретацией',
    type: NatalChartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Натальная карта не найдена' })
  async getNatalChartWithInterpretation(
    @Request() req: AuthenticatedRequest,
    @Query('locale') localeQuery?: 'ru' | 'en' | 'es',
  ): Promise<NatalChartResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('Пользователь не аутентифицирован');
    }

    const result = await this.natalService.getNatalChartWithInterpretation(
      userId,
      this.resolveLocale(req, localeQuery),
    );

    return {
      id: result.id,
      userId: result.userId,
      data: result.data,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
