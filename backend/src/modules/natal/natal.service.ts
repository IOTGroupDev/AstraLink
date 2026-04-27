import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SupabaseService } from '@/supabase/supabase.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { InterpretationService } from '@/services/interpretation.service';
import { GeoService } from '@/modules/geo/geo.service';
import {
  normalizeBirthDateValue,
  normalizeBirthTimeValue,
} from '@/common/utils/birth-data.util';

@Injectable()
export class NatalService {
  private readonly logger = new Logger(NatalService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private interpretationService: InterpretationService,
    private geoService: GeoService,
  ) {}

  private normalizeBirthDateInput(input?: string | null): string | null {
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;

    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const day = String(parsed.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private hasCanonicalBirthMetadata(chartData: any): boolean {
    const birthDate = normalizeBirthDateValue(chartData?.birthDate);
    const birthTime = normalizeBirthTimeValue(chartData?.birthTime);
    const birthDateTimeUtc = chartData?.birthDateTimeUtc;
    const calculationVersion = chartData?.metadata?.calculationVersion;

    return Boolean(
      birthDate &&
        birthDate === chartData?.birthDate &&
        birthTime &&
        birthTime === chartData?.birthTime &&
        typeof birthDateTimeUtc === 'string' &&
        !Number.isNaN(new Date(birthDateTimeUtc).getTime()) &&
        calculationVersion === 'utc-fixed-v2',
    );
  }

  private needsBirthDataUpgrade(chartData: any): boolean {
    return !this.hasCanonicalBirthMetadata(chartData);
  }

  private resolveStoredInterpretationLocale(
    chartData: any,
  ): 'ru' | 'en' | 'es' | null {
    const locale =
      chartData?.interpretationLocale ??
      chartData?.metadata?.interpretationLocale ??
      chartData?.interpretation?.locale;

    if (locale === 'ru' || locale === 'en' || locale === 'es') {
      return locale;
    }

    return chartData?.interpretation ? 'ru' : null;
  }

  private withInterpretationLocale<T extends Record<string, any>>(
    chartData: T,
    locale: 'ru' | 'en' | 'es',
  ): T & {
    interpretationLocale: 'ru' | 'en' | 'es';
    metadata: Record<string, any>;
  } {
    return {
      ...chartData,
      interpretationLocale: locale,
      metadata: {
        ...(chartData?.metadata || {}),
        interpretationLocale: locale,
      },
    };
  }

  private async recalculatePersistedChart(
    userId: string,
    chartId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const { data: userProfile } =
      await this.supabaseService.getUserProfileAdmin(userId);
    const birthDateISO = userProfile?.birth_date as string | undefined;
    const birthTime = userProfile?.birth_time as string | undefined;
    const birthPlace = userProfile?.birth_place as string | undefined;

    if (!birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('Все данные рождения обязательны');
    }

    const dateStr = this.normalizeBirthDateInput(birthDateISO);
    if (!dateStr) {
      throw new BadRequestException('Некорректная дата рождения');
    }

    const location = await this.resolveBirthLocation(
      birthPlace,
      undefined,
      dateStr,
      birthTime,
    );
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        natalChartData,
        locale,
      );

    const localizedData = this.withInterpretationLocale(
      {
        ...natalChartData,
        interpretation,
      },
      locale,
    );
    localizedData.metadata = {
      ...localizedData.metadata,
      recalculatedAt: new Date().toISOString(),
      calculationVersion: 'utc-fixed-v2',
    };

    return this.prisma.chart.update({
      where: { id: chartId },
      data: {
        data: localizedData,
      },
    });
  }

  /**
   * Создать натальную карту с интерпретацией при регистрации
   */
  async createNatalChartWithInterpretation(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
    birthLocation?: { latitude: number; longitude: number; timezone?: string },
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    // Проверяем существующую карту
    const existing = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Если карта уже существует с интерпретацией, возвращаем её
    if (existing && (existing.data as any)?.interpretation) {
      if (this.needsBirthDataUpgrade(existing.data)) {
        this.logger.warn(
          `Upgrading legacy natal chart metadata for user ${userId} via /natal create path`,
        );
        return this.recalculatePersistedChart(userId, existing.id, locale);
      }
      return this.getNatalChartWithInterpretation(userId, locale);
    }

    // Валидация данных
    if (!userId || !birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('Все данные рождения обязательны');
    }

    const dateStr = this.normalizeBirthDateInput(birthDateISO);
    if (!dateStr) {
      throw new BadRequestException('Некорректная дата рождения');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException(
        'Некорректное время рождения (ожидается HH:MM)',
      );
    }

    const location = await this.resolveBirthLocation(
      birthPlace,
      birthLocation,
      dateStr,
      birthTime,
    );

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
        locale,
      );

    // Сохраняем карту с интерпретацией
    const chartWithInterpretation = this.withInterpretationLocale(
      {
        ...natalChartData,
        interpretation,
      },
      locale,
    );
    chartWithInterpretation.metadata = {
      ...chartWithInterpretation.metadata,
      calculationVersion: 'utc-fixed-v2',
    };

    return await this.prisma.chart.upsert({
      where: { userId },
      update: {
        data: chartWithInterpretation,
      },
      create: {
        userId,
        data: chartWithInterpretation,
      },
    });
  }

  /**
   * Получить натальную карту с интерпретацией
   */
  async getNatalChartWithInterpretation(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const chart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!chart) {
      throw new NotFoundException('Натальная карта не найдена');
    }

    const chartData = chart.data as any;

    if (this.needsBirthDataUpgrade(chartData)) {
      return this.recalculatePersistedChart(userId, chart.id, locale);
    }

    // Если интерпретация отсутствует или сохранена на другом языке, генерируем её заново
    if (
      !chartData.interpretation ||
      this.resolveStoredInterpretationLocale(chartData) !== locale
    ) {
      const interpretation =
        await this.interpretationService.generateNatalChartInterpretation(
          userId,
          chartData,
          locale,
        );

      // Обновляем карту с интерпретацией
      const updatedData = this.withInterpretationLocale(
        {
          ...chartData,
          interpretation,
        },
        locale,
      );
      updatedData.metadata = {
        ...updatedData.metadata,
        calculationVersion: 'utc-fixed-v2',
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
        if (this.needsBirthDataUpgrade(chart.data)) {
          const updated = await this.recalculatePersistedChart(
            userId,
            chart.id,
          );
          return {
            id: updated.id,
            userId: updated.userId,
            data: updated.data,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        }
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
        if (this.needsBirthDataUpgrade(chart.data)) {
          const updated = await this.recalculatePersistedChart(
            userId,
            chart.id,
          );
          return {
            id: updated.id,
            userId: updated.userId,
            data: updated.data,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        }
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
        if (this.needsBirthDataUpgrade(chart.data)) {
          const updated = await this.recalculatePersistedChart(
            userId,
            chart.id,
          );
          return {
            id: updated.id,
            userId: updated.userId,
            data: updated.data,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        }
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
        if (this.needsBirthDataUpgrade(chart.data)) {
          const updated = await this.recalculatePersistedChart(
            userId,
            chart.id,
          );
          return {
            id: updated.id,
            userId: updated.userId,
            data: updated.data,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        }
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
    const { data: user } =
      await this.supabaseService.getUserProfileAdmin(userId);

    if (!user || !user.birth_date || !user.birth_time || !user.birth_place) {
      // Fallback данные для демонстрации
      const fallbackLocation = await this.resolveBirthLocation(
        'Москва',
        undefined,
        '1990-05-15',
        '14:30',
      );
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
    const birthDate = this.normalizeBirthDateInput(user.birth_date);
    if (!birthDate) {
      throw new BadRequestException('Некорректная дата рождения');
    }
    const birthTime = user.birth_time;
    const location = await this.resolveBirthLocation(
      user.birth_place,
      undefined,
      birthDate,
      birthTime,
    );

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate,
      birthTime,
      location,
    );

    const chartPayload = {
      ...natalChartData,
      metadata: {
        ...natalChartData?.metadata,
        calculationVersion: 'utc-fixed-v2',
      },
    };

    // Сохраняем карту
    const { data: newChart } = await this.supabaseService.createUserChart(
      userId,
      chartPayload,
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
      data: chartPayload,
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
    birthDateISO?: string,
    birthTime?: string,
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
        timezone: this.parseTimezoneOffset(
          birthLocation.timezone,
          birthPlace,
          birthDateISO,
          birthTime,
        ),
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
          timezone: this.parseTimezoneOffset(
            suggestion.tzid,
            birthPlace,
            birthDateISO,
            birthTime,
          ),
        };
      }
    } catch (_e) {
      // fallback to local lookup
    }

    return this.getLocationCoordinates(birthPlace);
  }

  private parseTimezoneOffset(
    timezone?: string,
    birthPlace?: string,
    birthDateISO?: string,
    birthTime?: string,
  ): number {
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

    const historicalOffset = this.resolveHistoricalTimezoneOffset(
      timezone,
      birthDateISO,
      birthTime,
    );
    if (historicalOffset !== null) {
      return historicalOffset;
    }

    return this.getLocationCoordinates(birthPlace || 'default').timezone;
  }

  private resolveHistoricalTimezoneOffset(
    timezone: string,
    birthDateISO?: string,
    birthTime?: string,
  ): number | null {
    if (!birthDateISO || !birthTime || !timezone.includes('/')) {
      return null;
    }

    const dateMatch = birthDateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const timeMatch = birthTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!dateMatch || !timeMatch) {
      return null;
    }

    try {
      const year = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const day = Number(dateMatch[3]);
      const hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2]);

      const probe = new Date(
        Date.UTC(year, month - 1, day, hour, minute, 0, 0),
      );
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      }).formatToParts(probe);
      const tzName = parts.find((part) => part.type === 'timeZoneName')?.value;
      if (!tzName) {
        return null;
      }

      const match = tzName.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?$/i);
      if (!match) {
        return null;
      }

      const hours = Number(match[1]);
      const minutes = match[2] ? Number(match[2]) : 0;
      if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
      }

      const sign = hours >= 0 ? 1 : -1;
      return hours + sign * (minutes / 60);
    } catch {
      return null;
    }
  }
}
