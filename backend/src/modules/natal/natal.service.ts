import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { InterpretationService } from '@/services/interpretation.service';
import { GeoService } from '@/modules/geo/geo.service';

@Injectable()
export class NatalService {
  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private interpretationService: InterpretationService,
    private geoService: GeoService,
  ) {}

  /**
   * Создать натальную карту с интерпретацией при регистрации
   */
  async createNatalChartWithInterpretation(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
    birthLocation?: { latitude: number; longitude: number; timezone?: string },
  ) {
    // Проверяем существующую карту
    const existing = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Если карта уже существует с интерпретацией, возвращаем её
    if (existing && (existing.data as any)?.interpretation) {
      return existing;
    }

    // Валидация данных
    if (!userId || !birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('Все данные рождения обязательны');
    }

    const birthDate = new Date(birthDateISO);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Некорректная дата рождения');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException(
        'Некорректное время рождения (ожидается HH:MM)',
      );
    }

    const dateStr = birthDate.toISOString().split('T')[0];
    const location = await this.resolveBirthLocation(birthPlace, birthLocation);

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );

    // Генерируем полную интерпретацию (только один раз при регистрации)
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        natalChartData,
      );

    // Сохраняем карту с интерпретацией
    const chartWithInterpretation = {
      ...natalChartData,
      interpretation,
    };

    return await this.prisma.chart.create({
      data: {
        userId,
        data: chartWithInterpretation,
      },
    });
  }

  /**
   * Получить натальную карту с интерпретацией
   */
  async getNatalChartWithInterpretation(userId: string) {
    const chart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!chart) {
      throw new NotFoundException('Натальная карта не найдена');
    }

    const chartData = chart.data as any;

    // Если интерпретация отсутствует, генерируем её
    if (!chartData.interpretation) {
      const interpretation =
        await this.interpretationService.generateNatalChartInterpretation(
          userId,
          chartData,
        );

      // Обновляем карту с интерпретацией
      const updatedData = {
        ...chartData,
        interpretation,
      };

      await this.prisma.chart.update({
        where: { id: chart.id },
        data: { data: updatedData },
      });

      return {
        ...chart,
        data: updatedData,
      };
    }

    return chart;
  }

  /**
   * Получить натальную карту (базовый метод)
   */
  async getNatalChart(userId: string) {
    try {
      const res = await this.supabaseService.getUserChartsAdmin(userId);
      if (res.data && res.data.length > 0) {
        const chart = res.data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    } catch (_e) {
      const { data } = await this.supabaseService.getUserCharts(userId);
      if (data && data.length > 0) {
        const chart = data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    }

    // Если карты нет, создаём её
    return this.createNatalChart(userId);
  }

  /**
   * Создать натальную карту (базовый метод)
   */
  async createNatalChart(userId: string) {
    // Проверяем существующую карту
    try {
      const { data } = await this.supabaseService.getUserChartsAdmin(userId);
      if (data && data.length > 0) {
        const chart = data[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    } catch (_e) {
      const { data: charts } = await this.supabaseService.getUserCharts(userId);
      if (charts && charts.length > 0) {
        const chart = charts[0];
        return {
          id: chart.id,
          userId: chart.user_id,
          data: chart.data,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      }
    }

    // Получаем данные пользователя
    const { data: user } = await this.supabaseService
      .from('users')
      .select('id, birth_date, birth_time, birth_place')
      .eq('id', userId)
      .single();

    if (!user || !user.birth_date || !user.birth_time || !user.birth_place) {
      // Fallback данные для демонстрации
      const fallbackLocation = await this.resolveBirthLocation('Москва');
      const fallbackChartData = await this.ephemerisService.calculateNatalChart(
        '1990-05-15',
        '14:30',
        fallbackLocation,
      );

      return {
        id: 'temporary',
        userId,
        data: fallbackChartData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Рассчитываем натальную карту
    const birthDate = new Date(user.birth_date).toISOString().split('T')[0];
    const birthTime = user.birth_time;
    const location = await this.resolveBirthLocation(user.birth_place);

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location,
    );

    // Сохраняем карту
    const { data: newChart } = await this.supabaseService.createUserChart(
      userId,
      natalChartData,
    );

    if (newChart) {
      return {
        id: newChart.id,
        userId: newChart.user_id,
        data: newChart.data,
        createdAt: newChart.created_at,
        updatedAt: newChart.updated_at,
      };
    }

    // Если не удалось сохранить
    return {
      id: 'temporary',
      userId,
      data: natalChartData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Получить координаты места рождения
   */
  private getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    const locations: {
      [key: string]: { latitude: number; longitude: number; timezone: number };
    } = {
      Москва: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
      'Санкт-Петербург': { latitude: 59.9311, longitude: 30.3609, timezone: 3 },
      Екатеринбург: { latitude: 56.8431, longitude: 60.6454, timezone: 5 },
      Новосибирск: { latitude: 55.0084, longitude: 82.9357, timezone: 7 },
      default: { latitude: 55.7558, longitude: 37.6176, timezone: 3 },
    };

    return locations[birthPlace] || locations['default'];
  }

  private async resolveBirthLocation(
    birthPlace: string,
    birthLocation?: { latitude: number; longitude: number; timezone?: string },
  ): Promise<{ latitude: number; longitude: number; timezone: number }> {
    if (birthLocation) {
      if (
        birthLocation.latitude < -90 ||
        birthLocation.latitude > 90 ||
        birthLocation.longitude < -180 ||
        birthLocation.longitude > 180
      ) {
        throw new BadRequestException('Некорректные координаты места рождения');
      }

      return {
        latitude: birthLocation.latitude,
        longitude: birthLocation.longitude,
        timezone: this.parseTimezoneOffset(birthLocation.timezone, birthPlace),
      };
    }

    try {
      const [suggestion] = await this.geoService.suggestCities(
        birthPlace,
        'ru',
      );
      if (suggestion) {
        return {
          latitude: suggestion.lat,
          longitude: suggestion.lon,
          timezone: this.parseTimezoneOffset(suggestion.tzid, birthPlace),
        };
      }
    } catch (_e) {
      // fallback to local lookup
    }

    return this.getLocationCoordinates(birthPlace);
  }

  private parseTimezoneOffset(timezone?: string, birthPlace?: string): number {
    if (!timezone) {
      return this.getLocationCoordinates(birthPlace || 'default').timezone;
    }

    if (/^[+-]?\d+(\.\d+)?$/.test(timezone)) {
      const value = Number(timezone);
      if (!Number.isNaN(value) && Math.abs(value) <= 14) {
        return value;
      }
    }

    const match = timezone.match(/UTC\s*([+-]\d{1,2})(?::(\d{2}))?/i);
    if (match) {
      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
        const sign = hours >= 0 ? 1 : -1;
        return hours + sign * (minutes / 60);
      }
    }

    return this.getLocationCoordinates(birthPlace || 'default').timezone;
  }
}
