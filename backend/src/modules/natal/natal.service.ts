import { getLocationFromBirthData } from '@/utils/location.utils';
import { SensitiveProfileEncryptionService } from '../../common/services/sensitive-profile-encryption.service';
import { historicalTimezoneOffset } from '@/common/utils/timezone.util';
import { ASTRO_CALCULATION_VERSION } from '@/shared/astro-version';
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
    private readonly encryption: SensitiveProfileEncryptionService,
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
      calculationVersion === ASTRO_CALCULATION_VERSION,
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
    const stored = await this.prisma.chart.findUnique({
      where: { id: chartId },
      select: { data: true },
    });
    const storedData = this.encryption.hydrateBirthDocument(stored?.data) as
      | { metadata?: { birthTimeKnown?: boolean } }
      | undefined;
    const birthTimeKnown =
      typeof userProfile?.birth_time_known === 'boolean'
        ? userProfile.birth_time_known
        : storedData?.metadata?.birthTimeKnown !== false;
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
      birthTimeKnown,
      locale,
    );
    const interpretation = !birthTimeKnown
      ? null
      : await this.interpretationService.generateNatalChartInterpretation(
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
      calculationVersion: ASTRO_CALCULATION_VERSION,
    };

    const updated = await this.prisma.chart.update({
      where: { id: chartId },
      data: {
        data: this.encryption.prepareBirthDocumentForStorage(localizedData),
      },
    });
    return { ...updated, data: localizedData };
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
    if (existing) {
      if (
        this.needsBirthDataUpgrade(
          this.encryption.hydrateBirthDocument(existing.data),
        )
      ) {
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

    const { data: profile } =
      await this.supabaseService.getUserProfileAdmin(userId);
    const birthTimeKnown = profile?.birth_time_known !== false;

    // Рассчитываем натальную карту через Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
      birthTimeKnown,
      locale,
    );

    // Генерируем полную интерпретацию (только один раз при регистрации)
    const interpretation = !birthTimeKnown
      ? null
      : await this.interpretationService.generateNatalChartInterpretation(
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
      calculationVersion: ASTRO_CALCULATION_VERSION,
    };

    const created = await this.prisma.chart.upsert({
      where: { userId },
      update: {
        data: this.encryption.prepareBirthDocumentForStorage(
          chartWithInterpretation,
        ),
      },
      create: {
        userId,
        data: this.encryption.prepareBirthDocumentForStorage(
          chartWithInterpretation,
        ),
      },
    });
    return { ...created, data: chartWithInterpretation };
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

    const chartData = this.encryption.hydrateBirthDocument(chart.data) as any;

    if (this.needsBirthDataUpgrade(chartData)) {
      return this.recalculatePersistedChart(userId, chart.id, locale);
    }

    if (chartData.metadata?.birthTimeKnown === false)
      return {
        ...chart,
        data: {
          ...chartData,
          houses: {},
          ascendant: null,
          midheaven: null,
          partOfFortune: null,
          interpretation: undefined,
          interpretations: undefined,
          aiInterpretations: undefined,
        },
      };

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
        calculationVersion: ASTRO_CALCULATION_VERSION,
      };

      await this.prisma.chart.update({
        where: { id: chart.id },
        data: {
          data: this.encryption.prepareBirthDocumentForStorage(updatedData),
        },
      });

      return {
        ...chart,
        data: updatedData,
      };
    }

    return { ...chart, data: chartData };
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
        calculationVersion: ASTRO_CALCULATION_VERSION,
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

    const location = locations[birthPlace];
    if (!location || birthPlace === 'default')
      throw new BadRequestException(
        'Could not resolve birth location; select a city with coordinates',
      );
    return location;
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

    return getLocationFromBirthData(
      birthPlace,
      undefined,
      undefined,
      undefined,
      birthDateISO,
      birthTime,
    );
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
        const sign = match[1].startsWith('-') ? -1 : 1;
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

    throw new BadRequestException(
      'Invalid timezone or nonexistent local birth time',
    );
  }

  private resolveHistoricalTimezoneOffset(
    timezone: string,
    birthDateISO?: string,
    birthTime?: string,
  ): number | null {
    return historicalTimezoneOffset(timezone, birthDateISO, birthTime);
  }
}
