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
import {
  getSignColors,
  getExtendedPlanetInSign,
  getExtendedAscendant,
  getExtendedHouseSign,
} from '../../modules/shared/astro-text';

@Injectable()
export class NatalChartService {
  private readonly logger = new Logger(NatalChartService.name);

  constructor(
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private interpretationService: InterpretationService,
    private redis: RedisService,
    private chartRepository: ChartRepository,
  ) {}

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
    const location = this.getLocationCoordinates(birthPlace);

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

    // Save chart with interpretation (including version)
    const chartWithInterpretation = {
      ...natalChartData,
      interpretation,
      interpretationVersion: 'v3',
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

    // If interpretation is missing or version is outdated — regenerate for v3
    if (!chartData.interpretation || chartData.interpretationVersion !== 'v3') {
      this.logger.log(
        `Regenerating interpretation for user ${userId} (version: ${chartData.interpretationVersion || 'none'})`,
      );

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

    const location = this.getLocationCoordinates(user.birth_place as string);

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      birthDate.toISOString().split('T')[0],
      birthTime,
      location,
    );

    // Save chart via repository
    const newChart = await this.chartRepository.create({
      user_id: userId,
      data: natalChartData,
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
      const extended = getExtendedPlanetInSign(planet as any, sign as any);
      return extended || [];
    }

    if (type === 'ascendant' && sign) {
      const extended = getExtendedAscendant(sign as any);
      return extended || [];
    }

    if (type === 'house' && houseNum && sign) {
      const num =
        typeof houseNum === 'string' ? parseInt(houseNum, 10) : houseNum;
      const extended = getExtendedHouseSign(num, sign as any);
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

  /**
   * Regenerate chart interpretation with AI
   * Used for manual regeneration by users (with rate limiting)
   */
  async regenerateInterpretation(userId: string): Promise<void> {
    const chart = await this.chartRepository.findByUserId(userId);

    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    const chartData = chart.data as any;

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
