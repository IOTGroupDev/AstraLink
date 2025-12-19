/**
 * Natal Chart Service
 * Microservice for managing natal charts and interpretations
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { EphemerisService } from '../../services/ephemeris.service';
import { InterpretationService } from '../../services/interpretation.service';
import { RedisService } from '../../redis/redis.service';
import { ChartRepository } from '../../repositories/chart.repository';
import { createHash } from 'crypto';
import {
  getSignColors,
  getExtendedPlanetInSign,
  getExtendedAscendant,
  getExtendedHouseSign,
} from '../../modules/shared/astro-text';
import type { PlanetKey, Sign } from '../../modules/shared/astro-text/types';
import { GeoService } from '../../modules/geo/geo.service';

@Injectable()
export class NatalChartService {
  private readonly logger = new Logger(NatalChartService.name);

  constructor(
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private interpretationService: InterpretationService,
    private redis: RedisService,
    private chartRepository: ChartRepository,
    private geoService: GeoService,
  ) {}

  /**
   * Compute fingerprint of birth inputs to detect changes.
   * Uses normalized ISO date (YYYY-MM-DD), HH:MM time, and raw place string.
   */
  private computeFingerprint(
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
  ): string {
    const date = birthDateISO?.trim() || '';
    const time = birthTime?.trim() || '';
    const place = (birthPlace ?? '').trim();
    const payload = `${date}|${time}|${place}`.toLowerCase();
    return createHash('sha1').update(payload).digest('hex');
  }

  /**
   * Create natal chart with interpretation at registration
   */
  async createNatalChartWithInterpretation(
    userId: string,
    birthDateISO: string,
    birthTime: string,
    birthPlace: string,
  ) {
    // Check existing chart via repository
    const existing = await this.chartRepository.findByUserId(userId);

    // If chart already exists with interpretation, return it
    if (existing && existing.data?.interpretation) {
      return existing;
    }

    // Validate data
    if (!userId || !birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('All birth data is required');
    }

    const birthDate = new Date(birthDateISO);
    if (isNaN(birthDate.getTime())) {
      throw new BadRequestException('Invalid birth date');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException('Invalid birth time (expected HH:MM)');
    }

    const dateStr = birthDate.toISOString().split('T')[0];
    const location = await this.resolveBirthLocation(birthPlace);

    // Fingerprint for birth data
    const fingerprint = this.computeFingerprint(dateStr, birthTime, birthPlace);

    // Calculate natal chart via Swiss Ephemeris
    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );

    // Generate full interpretation (only once at registration)
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        natalChartData,
      );

    // Save chart with interpretation (including version) + metadata (fingerprint)
    const chartWithInterpretation = {
      ...natalChartData,
      interpretation,
      interpretationVersion: 'v3',
      metadata: {
        ...natalChartData?.metadata,
        fingerprint,
      },
    };

    const created = await this.chartRepository.create({
      user_id: userId,
      data: chartWithInterpretation,
    });

    // Invalidate cached horoscopes and user-specific transits after new chart
    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      // Ignore Redis errors during chart creation
      void 0;
    }

    return created;
  }

  /**
   * Get natal chart with interpretation
   */
  async getNatalChartWithInterpretation(userId: string) {
    const chart = await this.chartRepository.findByUserId(userId);

    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    const chartData = chart.data;

    // 1) Check fingerprint vs current user profile (if profile filled)
    let currentFingerprint: string | null = null;
    try {
      const { data: userProfile } =
        await this.supabaseService.getUserProfileAdmin(chart.user_id);
      const bd = userProfile?.birth_date as string | undefined;
      const bt = userProfile?.birth_time as string | undefined;
      const bp = userProfile?.birth_place as string | undefined;

      if (bd && bt && bp) {
        const dateStr = new Date(bd).toISOString().split('T')[0];
        currentFingerprint = this.computeFingerprint(dateStr, bt, bp);
      }
    } catch (_e) {
      // ignore profile read issues
    }

    const existingFingerprint: string | undefined =
      chartData?.metadata?.fingerprint;

    if (
      currentFingerprint &&
      existingFingerprint &&
      currentFingerprint !== existingFingerprint
    ) {
      // Birth inputs changed -> fully recompute natal chart + interpretation and persist
      try {
        const { data: userProfile } =
          await this.supabaseService.getUserProfileAdmin(chart.user_id);
        const bd = userProfile?.birth_date as string;
        const bt = userProfile?.birth_time as string;
        const bp = userProfile?.birth_place as string;

        const dateStr = new Date(bd).toISOString().split('T')[0];
        const location = await this.resolveBirthLocation(bp);

        const newNatal = await this.ephemerisService.calculateNatalChart(
          dateStr,
          bt,
          location,
        );

        const newInterp =
          await this.interpretationService.generateNatalChartInterpretation(
            userId,
            newNatal,
          );

        const updatedData = {
          ...newNatal,
          interpretation: newInterp,
          interpretationVersion: 'v3',
          metadata: {
            ...newNatal?.metadata,
            fingerprint: currentFingerprint,
          },
        };

        await this.chartRepository.update(chart.id, { data: updatedData });

        try {
          await this.redis.deleteByPattern(`horoscope:${userId}:*`);
          await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
        } catch (_e) {
          void 0;
        }

        return {
          id: chart.id,
          userId: chart.user_id,
          data: updatedData,
          createdAt: chart.created_at,
          updatedAt: chart.updated_at,
        };
      } catch (e) {
        this.logger.warn(
          `Failed to recompute natal chart for fingerprint change user ${userId}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    // 2) If interpretation is missing or version is outdated — regenerate for v3
    if (!chartData.interpretation || chartData.interpretationVersion !== 'v3') {
      this.logger.log(
        `Regenerating interpretation for user ${userId} (version: ${chartData.interpretationVersion || 'none'})`,
      );

      const interpretation =
        await this.interpretationService.generateNatalChartInterpretation(
          userId,
          chartData,
        );

      // If no fingerprint stored yet but we can derive from chartData, try to set from chartData
      const derivedFingerprint = existingFingerprint;
      try {
        if (
          !derivedFingerprint &&
          chartData?.birthDate &&
          chartData?.location
        ) {
          const d = new Date(chartData.birthDate as string)
            .toISOString()
            .split('T')[0];
          // chartData.location likely { latitude, longitude, timezone } but not place string; skip place in that case
          // leave fingerprint undefined if not derivable
        }
      } catch {
        // ignore
      }

      // Update chart with interpretation and version (preserve metadata)
      const updatedData = {
        ...chartData,
        interpretation,
        interpretationVersion: 'v3',
        metadata: {
          ...(chartData?.metadata || {}),
          fingerprint: existingFingerprint ?? derivedFingerprint,
        },
      };

      await this.chartRepository.update(chart.id, { data: updatedData });

      // Invalidate cached horoscopes and user-specific transits after interpretation regeneration
      try {
        await this.redis.deleteByPattern(`horoscope:${userId}:*`);
        await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
      } catch (_e) {
        // Ignore Redis errors during interpretation regeneration
        void 0;
      }

      return {
        id: chart.id,
        userId: chart.user_id,
        data: updatedData,
        createdAt: chart.created_at,
        updatedAt: chart.updated_at,
      };
    }

    return {
      id: chart.id,
      userId: chart.user_id,
      data: chartData,
      createdAt: chart.created_at,
      updatedAt: chart.updated_at,
    };
  }

  /**
   * Get only natal chart interpretation
   */
  async getChartInterpretation(userId: string) {
    return await this.interpretationService.getStoredInterpretation(userId);
  }

  /**
   * Get natal chart (uses centralized fallback logic from repository)
   */
  async getNatalChart(userId: string) {
    const chart = await this.chartRepository.findByUserId(userId);

    if (!chart) {
      throw new NotFoundException(
        'Natal chart not found. Please create a chart by providing birth date, time and place.',
      );
    }

    return {
      id: chart.id,
      userId: chart.user_id,
      data: chart.data,
      createdAt: chart.created_at,
      updatedAt: chart.updated_at,
    };
  }

  /**
   * Create natal chart (basic method for backward compatibility)
   */
  async createNatalChart(userId: string, _data: any) {
    // Check existing chart via repository
    const existingChart = await this.chartRepository.findByUserId(userId);
    if (existingChart) {
      return {
        id: existingChart.id,
        userId: existingChart.user_id,
        data: existingChart.data,
        createdAt: existingChart.created_at,
        updatedAt: existingChart.updated_at,
      };
    }

    // Get user data
    const { data: user } = await this.supabaseService
      .from('users')
      .select('id, birth_date, birth_time, birth_place')
      .eq('id', userId)
      .single();

    if (!user || !user.birth_date || !user.birth_time || !user.birth_place) {
      throw new NotFoundException('User birth data not found');
    }

    const birthDate = new Date(user.birth_date as string);
    const birthTime = user.birth_time as string;

    const location = await this.resolveBirthLocation(
      user.birth_place as string,
    );

    const dateStr = birthDate.toISOString().split('T')[0];

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTime,
      location,
    );

    // Generate interpretation immediately on creation
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        natalChartData,
      );

    // Fingerprint for birth data
    const fingerprint = this.computeFingerprint(
      dateStr,
      birthTime,
      user.birth_place as string,
    );

    const chartWithInterpretation = {
      ...natalChartData,
      interpretation,
      interpretationVersion: 'v3',
      metadata: {
        ...natalChartData?.metadata,
        fingerprint,
      },
    };

    // Save chart via repository
    const newChart = await this.chartRepository.create({
      user_id: userId,
      data: chartWithInterpretation,
    });

    // Invalidate cached horoscopes and user-specific transits
    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      // Ignore Redis errors
      void 0;
    }

    return {
      id: newChart.id,
      userId: newChart.user_id,
      data: newChart.data,
      createdAt: newChart.created_at,
      updatedAt: newChart.updated_at,
    };
  }

  /**
   * Get lazy interpretation details ("Read more")
   * Returns array of up to 15 lines for UI display.
   */
  async getInterpretationDetails(
    _userId: string,
    query: {
      type: 'planet' | 'ascendant' | 'house' | 'aspect';
      planet?: string;
      sign?: string;
      houseNum?: number | string;
      aspect?: string;
    },
  ): Promise<string[]> {
    const { type, planet, sign, houseNum, aspect } = query;

    if (type === 'planet' && planet && sign) {
      const extended = getExtendedPlanetInSign(
        planet as PlanetKey,
        sign as Sign,
      );
      return extended || [];
    }

    if (type === 'ascendant' && sign) {
      const extended = getExtendedAscendant(sign as Sign);
      return extended || [];
    }

    if (type === 'house' && houseNum && sign) {
      const num =
        typeof houseNum === 'string' ? parseInt(houseNum, 10) : houseNum;
      const extended = getExtendedHouseSign(num, sign as Sign);
      return extended || [];
    }

    if (type === 'aspect' && aspect) {
      return [
        `Аспект ${aspect} показывает особое взаимодействие планет.`,
        'Подробнее об аспектах доступно в расширенном анализе.',
      ];
    }

    return [];
  }

  /**
   * Get location coordinates from city name
   */
  getLocationCoordinates(birthPlace: string): {
    latitude: number;
    longitude: number;
    timezone: number;
  } {
    const locations: Record<
      string,
      { latitude: number; longitude: number; timezone: number }
    > = {
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
  ): Promise<{ latitude: number; longitude: number; timezone: number }> {
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

  /**
   * Regenerate chart interpretation with AI
   * Used for manual regeneration by users (with rate limiting)
   */
  async regenerateInterpretation(userId: string): Promise<void> {
    const chart = await this.chartRepository.findByUserId(userId);

    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    const chartData = chart.data;

    // Generate new interpretation
    const interpretation =
      await this.interpretationService.generateNatalChartInterpretation(
        userId,
        chartData,
      );

    // Update chart with interpretation and version
    const updatedData = {
      ...chartData,
      interpretation,
      interpretationVersion: 'v3',
    };

    await this.chartRepository.update(chart.id, { data: updatedData });

    // Invalidate cached horoscopes and user-specific transits
    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      // Ignore Redis errors during interpretation regeneration
      void 0;
    }

    this.logger.log(`Interpretation regenerated for user ${userId}`);
  }
}
