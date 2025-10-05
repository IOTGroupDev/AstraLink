import {
  Controller,
  Get,
  Post,
  Body,
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

@ApiTags('natal')
@Controller('natal')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NatalController {
  constructor(private readonly natalService: NatalService) {}

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
    );

    return {
      id: result.id,
      userId: result.userId,
      data: result.data as any,
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
  ): Promise<NatalChartResponseDto> {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
      throw new Error('Пользователь не аутентифицирован');
    }

    const result =
      await this.natalService.getNatalChartWithInterpretation(userId);

    return {
      id: result.id,
      userId: result.userId,
      data: result.data,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }
}
