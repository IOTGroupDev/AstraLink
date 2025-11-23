import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SwissService } from './swiss.service';
import { SwissResultDto } from './dto/swiss-result.dto';

@ApiTags('swiss')
@Controller('swiss')
export class SwissController {
  constructor(private readonly swissService: SwissService) {}

  @Get('planets')
  @ApiOperation({ summary: 'Рассчитать позиции планет на заданную дату' })
  @ApiResponse({
    status: 200,
    description: 'Позиции планет рассчитаны',
    type: SwissResultDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры' })
  @ApiQuery({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD',
    example: '2025-01-15',
  })
  @ApiQuery({
    name: 'time',
    description: 'Время в формате HH:mm',
    example: '14:30',
  })
  async getPlanetPositions(
    @Query('date') dateStr?: string,
    @Query('time') timeStr?: string,
  ): Promise<SwissResultDto> {
    if (!dateStr || !timeStr) {
      throw new BadRequestException('Дата и время обязательны');
    }

    // Валидация формата даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException(
        'Некорректный формат даты (ожидается YYYY-MM-DD)',
      );
    }

    // Валидация формата времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      throw new BadRequestException(
        'Некорректный формат времени (ожидается HH:MM)',
      );
    }

    // Создаем дату
    const dateTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(dateTime.getTime())) {
      throw new BadRequestException('Некорректная дата или время');
    }

    const julianDay = this.swissService.dateToJulianDay(dateTime);
    const planets = await this.swissService.calculatePlanetPositions(julianDay);
    const aspects = this.swissService.calculateAspects(planets);

    return {
      date: dateTime.toISOString(),
      planets,
      houses: {}, // Для позиций планет дома не нужны
      aspects,
      julianDay,
      location: { latitude: 0, longitude: 0 }, // Для позиций планет координаты не нужны
    };
  }

  @Get('houses')
  @ApiOperation({ summary: 'Рассчитать позиции домов для заданных координат' })
  @ApiResponse({
    status: 200,
    description: 'Позиции домов рассчитаны',
    type: SwissResultDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные параметры' })
  @ApiQuery({
    name: 'date',
    description: 'Дата в формате YYYY-MM-DD',
    example: '2025-01-15',
  })
  @ApiQuery({
    name: 'time',
    description: 'Время в формате HH:mm',
    example: '14:30',
  })
  @ApiQuery({ name: 'lat', description: 'Широта', example: 55.7558 })
  @ApiQuery({ name: 'lng', description: 'Долгота', example: 37.6176 })
  async getHouses(
    @Query('date') dateStr?: string,
    @Query('time') timeStr?: string,
    @Query('lat') latStr?: string,
    @Query('lng') lngStr?: string,
  ): Promise<SwissResultDto> {
    if (!dateStr || !timeStr || !latStr || !lngStr) {
      throw new BadRequestException(
        'Дата, время, широта и долгота обязательны',
      );
    }

    // Валидация формата даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateStr)) {
      throw new BadRequestException(
        'Некорректный формат даты (ожидается YYYY-MM-DD)',
      );
    }

    // Валидация формата времени
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeStr)) {
      throw new BadRequestException(
        'Некорректный формат времени (ожидается HH:MM)',
      );
    }

    // Валидация координат
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new BadRequestException('Некорректные координаты');
    }

    // Создаем дату
    const dateTime = new Date(`${dateStr}T${timeStr}`);
    if (isNaN(dateTime.getTime())) {
      throw new BadRequestException('Некорректная дата или время');
    }

    const julianDay = this.swissService.dateToJulianDay(dateTime);
    const houses = await this.swissService.calculateHouses(julianDay, lat, lng);

    return {
      date: dateTime.toISOString(),
      planets: {}, // Для домов планеты не нужны
      houses,
      aspects: [], // Для домов аспекты не нужны
      julianDay,
      location: { latitude: lat, longitude: lng },
    };
  }
}
