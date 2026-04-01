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
import { AIService } from '../../services/ai.service';
import { RedisService } from '../../redis/redis.service';
import { ChartRepository } from '../../repositories/chart.repository';
import { createHash } from 'crypto';
import {
  getSignColors,
  getExtendedPlanetInSign,
  getExtendedAscendant,
  getExtendedHouseSign,
  getExtendedAspect,
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
    private aiService: AIService,
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

    const dateStr = this.normalizeBirthDateInput(birthDateISO);
    if (!dateStr) {
      throw new BadRequestException('Invalid birth date');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException('Invalid birth time (expected HH:MM)');
    }

    const location = await this.resolveBirthLocation(
      birthPlace,
      dateStr,
      birthTime,
    );

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
        const dateStr = this.normalizeBirthDateInput(bd);
        if (dateStr) {
          currentFingerprint = this.computeFingerprint(dateStr, bt, bp);
        }
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

        const dateStr = this.normalizeBirthDateInput(bd);
        if (!dateStr) {
          throw new Error('Invalid birth date in user profile');
        }
        const location = await this.resolveBirthLocation(bp, dateStr, bt);

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
    if (
      !chartData.interpretation ||
      (chartData.interpretationVersion !== 'v3' &&
        chartData.interpretationVersion !== 'ai-v1')
    ) {
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
  async createNatalChart(userId: string, data: any) {
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

    let birthDateInput =
      typeof data?.birthDate === 'string' ? data.birthDate : null;
    let birthTimeInput =
      typeof data?.birthTime === 'string' ? data.birthTime : null;
    let birthPlaceInput =
      typeof data?.birthPlace === 'string' ? data.birthPlace : null;

    const payloadLocation =
      typeof data?.latitude === 'number' &&
      typeof data?.longitude === 'number' &&
      typeof data?.timezone === 'number'
        ? {
            latitude: data.latitude,
            longitude: data.longitude,
            timezone: data.timezone,
          }
        : null;

    if (!birthDateInput || !birthTimeInput || !birthPlaceInput) {
      const { data: user } =
        await this.supabaseService.getUserProfileAdmin(userId);

      if (!user || !user.birth_date || !user.birth_time || !user.birth_place) {
        throw new NotFoundException('User birth data not found');
      }

      birthDateInput =
        birthDateInput || (user.birth_date as string | null) || null;
      birthTimeInput =
        birthTimeInput || (user.birth_time as string | null) || null;
      birthPlaceInput =
        birthPlaceInput || (user.birth_place as string | null) || null;
    } else {
      this.logger.debug(`Using provided birth data payload for user ${userId}`);
    }

    if (!birthDateInput || !birthTimeInput || !birthPlaceInput) {
      throw new NotFoundException('User birth data not found');
    }

    const dateStr = this.normalizeBirthDateInput(birthDateInput);
    if (!dateStr) {
      throw new BadRequestException('Invalid birth date');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTimeInput)) {
      throw new BadRequestException('Invalid birth time (expected HH:MM)');
    }

    const location =
      payloadLocation ??
      (await this.resolveBirthLocation(
        birthPlaceInput,
        dateStr,
        birthTimeInput,
      ));

    const natalChartData = await this.ephemerisService.calculateNatalChart(
      dateStr,
      birthTimeInput,
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
      birthTimeInput,
      birthPlaceInput,
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
      planetA?: string;
      planetB?: string;
    },
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<string[]> {
    const { type, planet, sign, houseNum, aspect, planetA, planetB } = query;

    if (type === 'planet' && planet && sign) {
      const extended = getExtendedPlanetInSign(
        planet as PlanetKey,
        sign as Sign,
        locale,
      );
      return extended || [];
    }

    if (type === 'ascendant' && sign) {
      const extended = getExtendedAscendant(sign as Sign, locale);
      if (extended?.length) return extended;
      return this.buildAscendantDetails(sign as Sign, locale);
    }

    if (type === 'house' && houseNum && sign) {
      const num =
        typeof houseNum === 'string' ? parseInt(houseNum, 10) : houseNum;
      const extended = getExtendedHouseSign(num, sign as Sign, locale);
      if (extended?.length) return extended;

      if ([4, 7, 10].includes(num)) {
        return this.buildAngularHouseDetails(num, sign as Sign, locale);
      }

      return [];
    }

    if (type === 'aspect' && aspect && planetA && planetB) {
      const extended = getExtendedAspect(
        aspect as import('../../modules/shared/astro-text/types').AspectType,
        planetA as PlanetKey,
        planetB as PlanetKey,
        locale,
      );
      if (extended?.length) return extended;
    }

    if (type === 'aspect' && aspect) {
      if (locale === 'en') {
        return [
          `Aspect ${aspect} shows a meaningful interaction between planetary themes.`,
          'This contact becomes clearer when read together with the planets involved, their houses, and the exact orb.',
        ];
      }
      if (locale === 'es') {
        return [
          `El aspecto ${aspect} muestra una interacción significativa entre temas planetarios.`,
          'Se entiende mejor cuando se lee junto con los planetas implicados, sus casas y el orbe exacto.',
        ];
      }
      return [
        `Аспект ${aspect} показывает значимое взаимодействие планетарных тем.`,
        'Его лучше читать вместе с тем, какие именно планеты участвуют, в каких домах они стоят и насколько точный орбис у аспекта.',
      ];
    }

    return [];
  }

  private buildAscendantDetails(
    sign: Sign,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    if (locale === 'en') {
      return [
        `Ascendant in ${sign} shapes your first impression and default response style.`,
        'It shows how you enter new situations, how you act spontaneously, and how other people read your energy.',
        'This angle is especially visible in first meetings, public presentation, and moments of change.',
        'It works as the outer interface of personality before people get to know your Sun and Moon in depth.',
        'The more consciously you use this energy, the more coherent and persuasive your image becomes.',
      ];
    }

    if (locale === 'es') {
      return [
        `El Ascendente en ${sign} moldea tu primera impresión y tu forma espontánea de reaccionar.`,
        'Muestra cómo entras en situaciones nuevas, cómo actúas de manera natural y cómo otras personas perciben tu energía.',
        'Este ángulo se nota con fuerza en comienzos, encuentros, exposición pública y cambios de rumbo.',
        'Funciona como la interfaz visible de la personalidad antes de que se conozcan a fondo tu Sol y tu Luna.',
        'Cuanto más conscientemente uses esta energía, más coherente y convincente será tu presencia.',
      ];
    }

    return [
      `Асцендент в ${sign} формирует первое впечатление, стиль включения в новые ситуации и естественную манеру реагировать на мир.`,
      'Этот угол показывает, как вы ведете себя спонтанно, как заявляете о себе и каким вас считывают люди при знакомстве.',
      'Асцендент особенно заметен в начале отношений, при публичной подаче, в моменты перемен и когда нужно быстро принять роль.',
      'Если Солнце говорит о внутреннем векторе, а Луна о чувствах, то Асцендент переводит это в поведение, жест, ритм и язык тела.',
      'Чем осознаннее проживается энергия Асцендента, тем цельнее выглядит ваш образ и тем легче вам вызывать доверие.',
    ];
  }

  private buildAngularHouseDetails(
    houseNum: number,
    sign: Sign,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    if (locale === 'en') {
      const messages: Record<number, string[]> = {
        4: [
          `IC in ${sign} describes your emotional foundation, roots, and private sense of safety.`,
          'It shows what restores you, what feels like home, and which family patterns live underneath visible behavior.',
          'This angle often explains why external success only works when inner stability is protected.',
          'A strong IC points to the importance of belonging, grounding, and deep personal support.',
          'Working with this angle helps you build life from inner security rather than pure reaction.',
        ],
        7: [
          `Descendant in ${sign} shows what you seek in close partnership and what qualities you often meet through other people.`,
          'This angle acts like a mirror: it reveals the style of cooperation, reciprocity, and projection in important relationships.',
          'It can describe both the partners you attract and the traits you need to develop in yourself.',
          'In mature relationships, the Descendant helps define balance, fairness, and shared expectations.',
          'Conscious work with this angle reduces projection and creates healthier bonds.',
        ],
        10: [
          `Midheaven in ${sign} describes your public path, visible ambitions, and professional image.`,
          'It speaks about vocation, reputation, authority, and the kind of contribution you want to make in the world.',
          'This angle becomes especially important in career choices, leadership, and long-term goals.',
          'The Midheaven shows not only how you seek success, but also how you want to be recognized.',
          'Working with this angle helps align outer achievement with inner meaning.',
        ],
      };
      return messages[houseNum] || [];
    }

    if (locale === 'es') {
      const messages: Record<number, string[]> = {
        4: [
          `El IC en ${sign} describe tu base emocional, tus raíces y tu necesidad privada de seguridad.`,
          'Muestra qué te devuelve al equilibrio, qué significa para ti sentirte en casa y qué patrones familiares sostienen tu conducta.',
          'Este ángulo recuerda que el éxito externo necesita un fundamento interno estable.',
          'Un IC fuerte habla de pertenencia, intimidad y apoyo profundo.',
          'Trabajarlo con conciencia ayuda a construir la vida desde la seguridad interior.',
        ],
        7: [
          `El Descendente en ${sign} muestra qué buscas en la pareja y qué cualidades encuentras a través de otras personas.`,
          'Este ángulo funciona como un espejo de cooperación, proyección y reciprocidad en vínculos importantes.',
          'Puede describir tanto el tipo de pareja que atraes como rasgos que necesitas integrar en ti.',
          'En relaciones maduras ayuda a definir equilibrio, acuerdos y expectativas compartidas.',
          'Trabajar conscientemente este ángulo reduce proyecciones y mejora la calidad del vínculo.',
        ],
        10: [
          `El Medio Cielo en ${sign} describe tu trayectoria pública, tus ambiciones visibles y tu imagen profesional.`,
          'Habla de vocación, reputación, autoridad y del tipo de contribución que deseas dejar en el mundo.',
          'Se activa con fuerza en decisiones de carrera, liderazgo y metas de largo plazo.',
          'Este ángulo no solo muestra cómo alcanzar éxito, sino también cómo quieres ser reconocido.',
          'Vivirlo con conciencia ayuda a unir logro externo y sentido interior.',
        ],
      };
      return messages[houseNum] || [];
    }

    const messages: Record<number, string[]> = {
      4: [
        `IC в ${sign} показывает ваш внутренний фундамент: корни, семейные сценарии, чувство дома и базовую эмоциональную опору.`,
        'По этому углу видно, что помогает вам восстанавливаться, где вы чувствуете безопасность и какие глубинные темы несете из прошлого.',
        'IC объясняет, почему внешние достижения не дают устойчивости, если изнутри нет ощущения опоры и принадлежности.',
        'Это угол приватной жизни, памяти, внутренней тишины и той среды, где вы снова собираете себя.',
        'Осознанная работа с IC помогает строить жизнь не из напряжения, а из внутренней устойчивости.',
      ],
      7: [
        `Десцендент в ${sign} раскрывает сценарий партнерства: каких людей вы притягиваете, что ищете в близких союзах и как учитесь взаимодействовать на равных.`,
        'Этот угол работает как зеркало: через партнера вы встречаетесь с качествами, которые важно замечать, принимать или развивать в себе.',
        'По Десценденту видно, как вы понимаете компромисс, взаимность, справедливость и личные ожидания в отношениях.',
        'Он описывает не только романтические связи, но и все формы зрелого сотрудничества, переговоров и союзов.',
        'Чем осознаннее проживается этот угол, тем меньше проекций на других и тем больше реальной близости и партнерской зрелости.',
      ],
      10: [
        `MC в ${sign} описывает ваш общественный вектор: карьерные амбиции, публичную роль, репутацию и способ двигаться к признанию.`,
        'По этому углу видно, в чем вы хотите состояться, какой след хотите оставить и какую форму авторитета готовы выстроить.',
        'MC особенно важен в теме призвания, долгосрочной стратегии, ответственности и социального статуса.',
        'Если Асцендент показывает старт и личную подачу, то MC говорит о вершине, к которой вы стремитесь, и о том, как вас читает общество.',
        'Осознанная работа с этим углом помогает соединить внешнюю реализацию с внутренним смыслом, а не строить успех только ради оценки со стороны.',
      ],
    };

    return messages[houseNum] || [];
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
    birthDateISO?: string,
    birthTime?: string,
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

  /**
   * Regenerate chart interpretation with AI
   * Used for manual regeneration by users (with rate limiting)
   */
  async regenerateInterpretation(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<void> {
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
        locale,
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

  async regenerateAiInterpretation(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<void> {
    const chart = await this.chartRepository.findByUserId(userId);

    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    await this.attachAiNarrativeToChart(chart.id, chart.data, userId, locale);

    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      void 0;
    }

    this.logger.log(`AI interpretation regenerated for user ${userId}`);
  }

  async refreshPremiumChartAssets(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<void> {
    await this.forceRecalculateNatalChart(userId, locale);

    const chart = await this.chartRepository.findByUserId(userId);
    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    await this.attachAiNarrativeToChart(chart.id, chart.data, userId, locale);

    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      void 0;
    }

    this.logger.log(`Premium chart assets refreshed for user ${userId}`);
  }

  private async attachAiNarrativeToChart(
    chartId: string,
    chartData: any,
    userId: string,
    locale: 'ru' | 'en' | 'es',
  ): Promise<void> {
    if (!this.aiService.isAvailable()) {
      this.logger.warn(`AI not available for chart enhancement user=${userId}`);
      return;
    }

    let baseInterpretation = chartData?.interpretation;
    if (!baseInterpretation || typeof baseInterpretation !== 'object') {
      baseInterpretation =
        await this.interpretationService.generateNatalChartInterpretation(
          userId,
          chartData,
          locale,
        );
    }

    let userProfile: any;
    try {
      const profileResponse =
        await this.supabaseService.getUserProfileAdmin(userId);
      userProfile = profileResponse?.data;
    } catch (error) {
      this.logger.warn(
        `Failed to load user profile for AI chart enhancement ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const aiNarrative = await this.aiService.generateChartInterpretation({
      planets: chartData?.planets,
      houses: chartData?.houses,
      aspects: chartData?.aspects || [],
      ascendant: chartData?.ascendant,
      userProfile,
      locale,
    });

    const aiGeneratedAt = new Date().toISOString();
    const interpretation = {
      ...baseInterpretation,
      aiNarrative,
      premiumNarrative: aiNarrative,
      aiGeneratedAt,
      generatedBy: 'ai',
    };

    const updatedData = {
      ...chartData,
      interpretation,
      interpretationVersion: 'v3-ai',
      generatedBy: 'ai',
    };

    await this.chartRepository.update(chartId, { data: updatedData });
  }

  /**
   * Force full natal chart recalculation using current user birth data.
   * Intended for repairing charts after calculation logic fixes.
   */
  async forceRecalculateNatalChart(
    userId: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ) {
    const chart = await this.chartRepository.findByUserId(userId);
    if (!chart) {
      throw new NotFoundException('Natal chart not found');
    }

    const { data: userProfile } =
      await this.supabaseService.getUserProfileAdmin(userId);
    const birthDateISO = userProfile?.birth_date as string | undefined;
    const birthTime = userProfile?.birth_time as string | undefined;
    const birthPlace = userProfile?.birth_place as string | undefined;

    if (!birthDateISO || !birthTime || !birthPlace) {
      throw new BadRequestException('User birth data is incomplete');
    }

    const dateStr = this.normalizeBirthDateInput(birthDateISO);
    if (!dateStr) {
      throw new BadRequestException('Invalid birth date');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(birthTime)) {
      throw new BadRequestException('Invalid birth time (expected HH:MM)');
    }

    const location = await this.resolveBirthLocation(
      birthPlace,
      birthDateISO,
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

    const fingerprint = this.computeFingerprint(dateStr, birthTime, birthPlace);
    const updatedData = {
      ...natalChartData,
      interpretation,
      interpretationVersion: 'v3',
      metadata: {
        ...natalChartData?.metadata,
        fingerprint,
        recalculatedAt: new Date().toISOString(),
        calculationVersion: 'utc-fixed-v1',
      },
    };

    const updated = await this.chartRepository.update(chart.id, {
      data: updatedData,
    });

    try {
      await this.redis.deleteByPattern(`horoscope:${userId}:*`);
      await this.redis.deleteByPattern(`ephe:transits:${userId}:*`);
    } catch (_e) {
      void 0;
    }

    this.logger.log(`Natal chart fully recalculated for user ${userId}`);

    return {
      id: updated.id,
      userId: updated.user_id,
      data: updated.data,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}
