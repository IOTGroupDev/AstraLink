// backend/src/services/horoscope-generator.service.ts
// СТРОГОЕ РАЗДЕЛЕНИЕ: FREE = Интерпретатор, PREMIUM = AI
import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EphemerisService } from './ephemeris.service';
import { ChartRepository } from '../repositories';
import { AIService } from './ai.service';
import { RedisService } from '../redis/redis.service';
import { LIMITS } from '../config/limits.config';
import {
  PlanetKey,
  PLANET_WEIGHTS,
  getEssentialDignity,
  DignityLevel,
} from '../modules/shared/types';
import {
  getTransitOrb,
  getHouseForLongitude,
  hashSignature,
} from '../modules/shared/utils';
import {
  calculateAspect,
  AspectType,
  calculateLunarPhase,
  getLunarPhaseInterpretation,
} from '../shared/astro-calculations';
import {
  getGeneralTemplates,
  getLovePhrases,
  getCareerActions,
  getAdvicePool,
  getSignColors,
  getPlanetHouseFocus,
} from '../modules/shared/astro-text';
import type {
  ChartData,
  TransitAspect,
  ChartLookupResult,
  TransitData,
  AspectCalculationResult,
  RuleBasedPredictions,
  TransitPlanet,
} from './horoscope.types';
import type { Planet, House } from '../dating/dating.types';
import {
  buildUserLocalPeriodContext,
  type UserLocalPeriod,
} from '@/common/utils/user-local-date.util';
import { normalizeBirthDateValue } from '@/common/utils/birth-data.util';

export interface HoroscopePrediction {
  period: 'day' | 'tomorrow' | 'week' | 'month';
  date: string;
  general: string;
  love: string;
  career: string;
  health: string;
  finance: string;
  advice: string;
  luckyNumbers: number[];
  luckyColors: string[];
  energy: number;
  mood: string;
  challenges: string[];
  opportunities: string[];
  generatedBy: 'ai' | 'interpreter' | 'mixed';
  lunarPhase?: {
    phase: string;
    emoji: string;
    description: string;
    illumination: number;
    interpretation: string;
  };
}

@Injectable()
export class HoroscopeGeneratorService {
  private readonly logger = new Logger(HoroscopeGeneratorService.name);
  private readonly aiSoftTimeoutMs = 12000;
  private readonly horoscopeFormatVersion = 'fmt-v2';
  private readonly inflightPremium = new Map<
    string,
    Promise<HoroscopePrediction>
  >();

  constructor(
    private ephemerisService: EphemerisService,
    private aiService: AIService,
    private redis: RedisService,
    private chartRepository: ChartRepository,
  ) {}

  /**
   * Find user chart using centralized ChartRepository
   */
  private async findUserChart(userId: string): Promise<ChartLookupResult> {
    this.logger.log(
      `Looking for natal chart for user ${userId} via ChartRepository`,
    );

    try {
      const chart = await this.chartRepository.findByUserId(userId);

      if (chart) {
        this.logger.log(
          `Found chart via ChartRepository, created: ${chart.created_at?.toString() || 'unknown'}`,
        );
        return {
          chartData: chart.data as ChartData,
          foundVia: 'repository',
        };
      }

      this.logger.warn(`No chart found for user ${userId}`);
      return { chartData: null, foundVia: 'none' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ChartRepository lookup failed:', errorMessage);
      return { chartData: null, foundVia: 'none' };
    }
  }

  /**
   * Генерация гороскопа с четким разделением:
   * FREE = Интерпретатор (правила)
   * PREMIUM = AI (Claude или OpenAI)
   */
  async generateHoroscope(
    userId: string,
    period: 'day' | 'tomorrow' | 'week' | 'month',
    isPremium: boolean = false,
    locale: 'ru' | 'en' | 'es' = 'ru',
    userTzOffsetMinutes = 0,
  ): Promise<HoroscopePrediction> {
    const shouldUseAi = isPremium;
    this.logger.log(
      `Генерация гороскопа для ${userId}, период: ${period}, premium: ${isPremium}, ai: ${shouldUseAi}`,
    );

    // Ищем натальную карту через Supabase
    const { chartData, foundVia } = await this.findUserChart(userId);

    if (!chartData) {
      this.logger.warn(
        `No natal chart found for user ${userId} via any method - generating generic horoscope`,
      );
      throw new NotFoundException(
        'Натальная карта не найдена — невозможно сгенерировать гороскоп без реальных данных рождения.',
      );
    }

    this.logger.log(
      `Successfully found natal chart for user ${userId} via ${foundVia}`,
    );

    try {
      const periodContext = buildUserLocalPeriodContext(
        period as UserLocalPeriod,
        userTzOffsetMinutes,
      );
      const targetDate = periodContext.targetDate;
      this.logger.log(`Target date for ${period}: ${targetDate.toISOString()}`);

      // Redis caching: key per userId + period + date bucket
      const dateKey = periodContext.dateKey;
      const cacheKey = `horoscope:${userId}:${period}:${dateKey}:${locale}:${isPremium ? 'premium' : 'free'}:${this.horoscopeFormatVersion}`;
      const ttlSec = periodContext.ttlSec;

      const cached = await this.redis.get<HoroscopePrediction>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit: ${cacheKey}`);
        return cached;
      }

      let transits: TransitData;
      let transitAspects: TransitAspect[] = [];

      try {
        transits = await this.getCurrentTransits(targetDate);
        this.logger.log(
          `Calculated transits for ${transits.planets ? Object.keys(transits.planets).length : 0} planets`,
        );

        transitAspects = this.analyzeTransitAspects(
          chartData.planets,
          transits.planets,
          chartData.houses,
        );
        this.logger.log(`Found ${transitAspects.length} transit aspects`);
      } catch (ephemerisError) {
        const errorMessage =
          ephemerisError instanceof Error
            ? ephemerisError.message
            : 'Unknown error';
        this.logger.error(`Ephemeris calculation failed: ${errorMessage}`);
        throw new InternalServerErrorException('Ошибка расчета эфемерид');
      }

      let result: HoroscopePrediction;
      let shouldCache = true;

      if (shouldUseAi) {
        const pendingKey = `${cacheKey}:pending`;
        const pending = await this.redis.get<string>(pendingKey);
        if (pending) {
          this.logger.warn(
            `AI generation pending for ${cacheKey}, returning interpreter fallback`,
          );
          return this.buildInterpreterFallback(
            chartData,
            transits,
            transitAspects,
            period,
            targetDate,
            locale,
          );
        }

        let aiPromise = this.inflightPremium.get(cacheKey);
        if (!aiPromise) {
          aiPromise = this.generatePremiumHoroscope(
            chartData,
            transits,
            transitAspects,
            period,
            targetDate,
            periodContext.quotaDayKey,
            periodContext.quotaTtlSec,
            cacheKey,
            ttlSec,
            userId,
            locale,
          );
          this.inflightPremium.set(cacheKey, aiPromise);
          await this.redis.set(pendingKey, '1', 60);
        }

        const awaited = await this.awaitWithTimeout(
          aiPromise,
          this.aiSoftTimeoutMs,
        );
        if (awaited.timedOut) {
          shouldCache = false;
          this.logger.warn(
            `AI generation timeout (${this.aiSoftTimeoutMs}ms) for ${cacheKey}`,
          );
          aiPromise
            .then((aiResult) => this.redis.set(cacheKey, aiResult, ttlSec))
            .finally(() => {
              this.inflightPremium.delete(cacheKey);
              this.redis.del(pendingKey).catch(() => undefined);
            });

          return this.buildInterpreterFallback(
            chartData,
            transits,
            transitAspects,
            period,
            targetDate,
            locale,
          );
        }

        result = awaited.value as HoroscopePrediction;
        this.inflightPremium.delete(cacheKey);
        await this.redis.del(pendingKey);
      } else {
        result = this.generateFreeHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
          cacheKey,
          ttlSec,
          locale,
        );
      }

      if (shouldCache) {
        await this.redis.set(cacheKey, result, ttlSec);
      }
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error during horoscope generation for user ${userId}:`,
        error,
      );
      this.logger.log(
        `Aborting horoscope generation due to error: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        `Ошибка генерации гороскопа: ${errorMessage}`,
      );
    }
  }

  /**
   * PREMIUM: Генерация через AI (Claude или OpenAI)
   */
  private async generatePremiumHoroscope(
    chartData: ChartData,
    transits: TransitData,
    transitAspects: TransitAspect[],
    period: string,
    targetDate: Date,
    quotaDayKey: string,
    quotaTtlSec: number,
    _cacheKey: string,
    _ttlSec: number,
    userId: string,
    locale: 'ru' | 'en' | 'es',
  ): Promise<HoroscopePrediction> {
    this.logger.log('💎 PREMIUM: Генерация через AI');

    // Ежесуточный лимит одного AI-запроса для гороскопов (на пользователя)
    try {
      const quotaKey = `ai:horoscope:quota:${userId}:${quotaDayKey}:${period}`;
      const used = await this.redis.incr(quotaKey);
      if (used != null) {
        if (used === 1) {
          await this.redis.expire(quotaKey, quotaTtlSec);
        }
        if (used > LIMITS.HOROSCOPE.AI_DAILY_PER_USER) {
          this.logger.warn(
            `AI daily limit reached for horoscope user=${userId} used=${used}/${LIMITS.HOROSCOPE.AI_DAILY_PER_USER}`,
          );
          // Фолбэк на интерпретатор (без AI)
          const dominantTransit = this.getDominantTransit(
            transitAspects,
            'general',
          );
          const energy = this.calculateEnergy(transitAspects);
          const mood = this.determineMood(energy, transitAspects, locale);
          const predictions = this.generateRuleBasedPredictions(
            chartData.planets?.sun?.sign || 'Aries',
            chartData.planets?.moon?.sign || 'Cancer',
            dominantTransit,
            transitAspects,
            period,
            targetDate,
            chartData,
            locale,
          );
          const lunarPhase = this.calculateLunarPhaseForDate(transits, locale);

          return {
            period: period as 'day' | 'tomorrow' | 'week' | 'month',
            date: targetDate.toISOString(),
            general: predictions.general,
            love: predictions.love,
            career: predictions.career,
            health: predictions.health,
            finance: predictions.finance,
            advice: predictions.advice,
            luckyNumbers: this.generateLuckyNumbers(chartData, targetDate),
            luckyColors: this.generateLuckyColors(
              chartData.planets?.sun?.sign || 'Aries',
              dominantTransit,
              locale,
            ),
            energy,
            mood,
            challenges: [],
            opportunities: [],
            generatedBy: 'interpreter',
            lunarPhase,
          };
        }
      }
    } catch (e) {
      this.logger.warn(
        `AI daily limiter failed (fallback to best-effort): ${(e as Error)?.message || String(e)}`,
      );
      // Продолжаем без лимитера, чтобы не ломать UX при проблемах Redis
    }

    if (!this.aiService.isAvailable()) {
      this.logger.error('❌ AI недоступен для PREMIUM пользователя!');
      throw new Error(
        'AI сервис недоступен. Пожалуйста, настройте ANTHROPIC_API_KEY или OPENAI_API_KEY',
      );
    }

    const sunSign = chartData.planets?.sun?.sign || 'Aries';
    const moonSign = chartData.planets?.moon?.sign || 'Cancer';
    const ascendant = chartData.houses?.[1]?.sign || 'Aries';

    try {
      const aiContext = {
        sunSign,
        moonSign,
        ascendant,
        planets: chartData.planets,
        houses: chartData.houses,
        aspects: chartData.aspects || [],
        transits: transitAspects,
        period,
        locale,
      };

      const aiPredictions = await this.aiService.generateHoroscope(aiContext);

      const fallbackPredictions = this.generateRuleBasedPredictions(
        sunSign,
        moonSign,
        this.getDominantTransit(transitAspects, 'general'),
        transitAspects,
        period,
        targetDate,
        chartData,
        locale,
      );

      const isValidText = (
        value: unknown,
        field: 'general' | 'love' | 'career' | 'health' | 'finance' | 'advice',
      ) => this.isRenderableHoroscopeText(value, field);

      const mergedPredictions = {
        general: isValidText(aiPredictions.general, 'general')
          ? aiPredictions.general
          : fallbackPredictions.general,
        love: isValidText(aiPredictions.love, 'love')
          ? aiPredictions.love
          : fallbackPredictions.love,
        career: isValidText(aiPredictions.career, 'career')
          ? aiPredictions.career
          : fallbackPredictions.career,
        health: isValidText(aiPredictions.health, 'health')
          ? aiPredictions.health
          : fallbackPredictions.health,
        finance: isValidText(aiPredictions.finance, 'finance')
          ? aiPredictions.finance
          : fallbackPredictions.finance,
        advice: isValidText(aiPredictions.advice, 'advice')
          ? aiPredictions.advice
          : fallbackPredictions.advice,
        challenges: Array.isArray(aiPredictions.challenges)
          ? aiPredictions.challenges
          : [],
        opportunities: Array.isArray(aiPredictions.opportunities)
          ? aiPredictions.opportunities
          : [],
      };

      const aiComplete =
        isValidText(aiPredictions.general, 'general') &&
        isValidText(aiPredictions.love, 'love') &&
        isValidText(aiPredictions.career, 'career') &&
        isValidText(aiPredictions.health, 'health') &&
        isValidText(aiPredictions.finance, 'finance') &&
        isValidText(aiPredictions.advice, 'advice') &&
        Array.isArray(aiPredictions.challenges) &&
        aiPredictions.challenges.length > 0 &&
        Array.isArray(aiPredictions.opportunities) &&
        aiPredictions.opportunities.length > 0;

      const energy = this.calculateEnergy(transitAspects);
      const mood = this.determineMood(energy, transitAspects, locale);
      const luckyNumbers = this.generateLuckyNumbers(chartData, targetDate);
      const luckyColors = this.generateLuckyColors(
        sunSign,
        transitAspects[0],
        locale,
      );

      // Calculate lunar phase for the target date
      const lunarPhase = this.calculateLunarPhaseForDate(transits, locale);

      const result: HoroscopePrediction = {
        period: period as 'day' | 'tomorrow' | 'week' | 'month',
        date: targetDate.toISOString(),
        general: mergedPredictions.general,
        love: mergedPredictions.love,
        career: mergedPredictions.career,
        health: mergedPredictions.health,
        finance: mergedPredictions.finance,
        advice: mergedPredictions.advice,
        luckyNumbers,
        luckyColors,
        energy,
        mood,
        challenges: mergedPredictions.challenges,
        opportunities: mergedPredictions.opportunities,
        generatedBy: aiComplete ? 'ai' : 'mixed',
        lunarPhase,
      };
      return result;
    } catch (error) {
      this.logger.error('❌ Ошибка AI-генерации для PREMIUM:', error);
      this.logger.log('Fallback to interpreter (FREE rules) with real data');
      // Fallback на интерпретатор с реальными расчетами (без generic-моков)
      return this.buildInterpreterFallback(
        chartData,
        transits,
        transitAspects,
        period,
        targetDate,
        locale,
      );
    }
  }

  private buildInterpreterFallback(
    chartData: ChartData,
    transits: TransitData,
    transitAspects: TransitAspect[],
    period: string,
    targetDate: Date,
    locale: 'ru' | 'en' | 'es',
  ): HoroscopePrediction {
    const dominantTransit = this.getDominantTransit(transitAspects, 'general');
    const energy = this.calculateEnergy(transitAspects);
    const mood = this.determineMood(energy, transitAspects, locale);
    const predictions = this.generateRuleBasedPredictions(
      chartData.planets?.sun?.sign || 'Aries',
      chartData.planets?.moon?.sign || 'Cancer',
      dominantTransit,
      transitAspects,
      period,
      targetDate,
      chartData,
      locale,
    );
    const lunarPhase = this.calculateLunarPhaseForDate(transits, locale);

    return {
      period: period as 'day' | 'tomorrow' | 'week' | 'month',
      date: targetDate.toISOString(),
      general: predictions.general,
      love: predictions.love,
      career: predictions.career,
      health: predictions.health,
      finance: predictions.finance,
      advice: predictions.advice,
      luckyNumbers: this.generateLuckyNumbers(chartData, targetDate),
      luckyColors: this.generateLuckyColors(
        chartData.planets?.sun?.sign || 'Aries',
        dominantTransit,
        locale,
      ),
      energy,
      mood,
      challenges: [],
      opportunities: [],
      generatedBy: 'interpreter',
      lunarPhase,
    };
  }

  private isRenderableHoroscopeText(
    value: unknown,
    field: 'general' | 'love' | 'career' | 'health' | 'finance' | 'advice',
  ): value is string {
    if (typeof value !== 'string') {
      return false;
    }

    const text = value.trim();
    if (text.length < 20) {
      return false;
    }

    if (this.looksMachineFormatted(text)) {
      return false;
    }

    if (field === 'general' && this.looksLikeSectionEnumeration(text)) {
      return false;
    }

    return true;
  }

  private looksMachineFormatted(value: string): boolean {
    const text = value.trim();

    if (
      (text.startsWith('{') && text.endsWith('}')) ||
      (text.startsWith('[') && text.endsWith(']'))
    ) {
      return true;
    }

    if (
      /"(general|love|career|health|finance|advice|challenges|opportunities)"\s*:/i.test(
        text,
      )
    ) {
      return true;
    }

    const lines = text.split(/\n+/).filter((line) => line.trim().length > 0);
    const labeledLines = lines.filter((line) =>
      /^(general|love|career|health|finance|advice|challenges|opportunities|amor|carrera|salud|finanzas|consejo|desaf[ií]os?|oportunidades|общий|общее|любовь|карьер|здоровье|финансы|совет|вызов|возможност)/i.test(
        line.trim(),
      ),
    );

    return labeledLines.length >= 2;
  }

  private looksLikeSectionEnumeration(value: string): boolean {
    const matches = value.match(
      /\b(?:love|career|health|finance|advice|amor|carrera|salud|finanzas|consejo|любовь|карьер[аы]|здоровье|финансы|совет)\b\s*:/gi,
    );

    return matches != null && matches.length >= 2;
  }

  private async awaitWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
  ): Promise<{ timedOut: boolean; value?: T }> {
    let timer: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<{ timedOut: boolean }>((resolve) => {
      timer = setTimeout(() => resolve({ timedOut: true }), timeoutMs);
    });
    const result = (await Promise.race([
      promise.then((value) => ({ timedOut: false, value })),
      timeoutPromise,
    ])) as { timedOut: boolean; value?: T };

    if (timer) clearTimeout(timer);
    return result;
  }

  /**
   * FREE: Генерация через интерпретатор (правила)
   */
  private generateFreeHoroscope(
    chartData: ChartData,
    transits: TransitData,
    transitAspects: TransitAspect[],
    period: string,
    targetDate: Date,
    _cacheKey: string,
    _ttlSec: number,
    locale: 'ru' | 'en' | 'es',
  ): HoroscopePrediction {
    this.logger.log('🆓 FREE: Генерация через интерпретатор (правила)');

    const sunSign = chartData.planets?.sun?.sign || 'Aries';
    const moonSign = chartData.planets?.moon?.sign || 'Cancer';

    const dominantTransit = this.getDominantTransit(transitAspects, 'general');
    const energy = this.calculateEnergy(transitAspects);
    const mood = this.determineMood(energy, transitAspects, locale);

    const predictions = this.generateRuleBasedPredictions(
      sunSign,
      moonSign,
      dominantTransit,
      transitAspects,
      period,
      targetDate,
      chartData,
      locale,
    );

    // Calculate lunar phase for the target date
    const lunarPhase = this.calculateLunarPhaseForDate(transits, locale);

    const result: HoroscopePrediction = {
      period: period as 'day' | 'tomorrow' | 'week' | 'month',
      date: targetDate.toISOString(),
      general: predictions.general,
      love: predictions.love,
      career: predictions.career,
      health: predictions.health,
      finance: predictions.finance,
      advice: predictions.advice,
      luckyNumbers: this.generateLuckyNumbers(chartData, targetDate),
      luckyColors: this.generateLuckyColors(sunSign, dominantTransit, locale),
      energy,
      mood,
      challenges: [],
      opportunities: [],
      generatedBy: 'interpreter',
      lunarPhase,
    };
    return result;
  }

  /**
   * Генерация предсказаний на основе правил
   */
  private generateRuleBasedPredictions(
    sunSign: string,
    moonSign: string,
    dominantTransit: TransitAspect | null,
    transitAspects: TransitAspect[],
    period: string,
    targetDate: Date,
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): RuleBasedPredictions {
    const timeFrame = this.getTimeFrame(period, locale);

    // Доминирующие транзиты по доменам
    const domLove = this.getDominantTransit(transitAspects, 'love');
    const domCareer = this.getDominantTransit(transitAspects, 'career');
    const domHealth = this.getDominantTransit(transitAspects, 'health');
    const domFinance = this.getDominantTransit(transitAspects, 'finance');

    return {
      general: this.generateGeneralPrediction(
        sunSign,
        dominantTransit,
        transitAspects,
        timeFrame,
        targetDate,
        locale,
      ),
      love: this.generateLovePrediction(
        sunSign,
        moonSign,
        transitAspects,
        timeFrame,
        domLove,
        locale,
      ),
      career: this.generateCareerPrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domCareer,
        locale,
      ),
      health: this.generateHealthPrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domHealth,
        locale,
      ),
      finance: this.generateFinancePrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domFinance,
        locale,
      ),
      advice: this.generateAdvice(
        sunSign,
        dominantTransit,
        timeFrame,
        targetDate,
        chartData,
        locale,
      ),
    };
  }

  /**
   * УЛУЧШЕННАЯ генерация общего прогноза с учетом периода
   */
  private generateGeneralPrediction(
    sunSign: string,
    dominantTransit: TransitAspect | null,
    transitAspects: TransitAspect[],
    timeFrame: string,
    _targetDate: Date,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const tone = this.determinePredictionTone(transitAspects);
    const templates = getGeneralTemplates(
      timeFrame as import('../modules/shared/types').PeriodFrame,
      locale,
    ) as Record<string, string[]>;
    const pool = templates[tone] || templates['neutral'] || [];
    if (!pool.length) {
      if (locale === 'en') {
        return `${timeFrame} is a stable period. Act consistently.`;
      }
      if (locale === 'es') {
        return `${timeFrame} es un período estable. Actúa con constancia.`;
      }
      return `${timeFrame} стабильный период. Действуйте последовательно.`;
    }

    // Детерминированный выбор по сигнатуре транзита (без привязки к дате)
    const sig = [
      timeFrame,
      dominantTransit?.transitPlanet || '-',
      dominantTransit?.aspect || '-',
      dominantTransit?.natalPlanet || '-',
      dominantTransit?.house || 0,
      dominantTransit?.isRetrograde ? 1 : 0,
    ];
    const index = Math.abs(hashSignature(sig)) % pool.length;
    let txt = pool[index];
    if (dominantTransit) {
      txt = this.appendTransitWindow(txt, dominantTransit, timeFrame, locale);
    }
    return this.appendFreeDetail(txt, 'general', locale, [
      timeFrame,
      sunSign,
      dominantTransit?.transitPlanet || '-',
      dominantTransit?.aspect || '-',
      dominantTransit?.natalPlanet || '-',
      dominantTransit?.house || 0,
    ]);
  }

  /**
   * УЛУЧШЕННАЯ генерация прогноза для любви
   */
  private generateLovePrediction(
    sunSign: string,
    moonSign: string,
    transitAspects: TransitAspect[],
    timeFrame: string,
    dominantTransit?: TransitAspect | null,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const venusAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'venus' || a.natalPlanet === 'venus',
    );

    try {
      const phraseSeed = [
        timeFrame,
        sunSign,
        dominantTransit?.transitPlanet || '-',
        dominantTransit?.aspect || '-',
        dominantTransit?.natalPlanet || '-',
        dominantTransit?.house || 0,
        dominantTransit?.isRetrograde ? 1 : 0,
      ].join('|');
      const phrases = getLovePhrases(
        timeFrame as import('../modules/shared/types').PeriodFrame,
        locale,
        phraseSeed,
      ) as Record<string, string>;

      if (venusAspects.length > 0) {
        const aspect = venusAspects[0];
        const base = ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
          ? locale === 'en'
            ? `${timeFrame} Venus ${phrases.positive}. Good time for romance and connection.`
            : locale === 'es'
              ? `${timeFrame} Venus ${phrases.positive}. Buen momento para el romance y la conexión.`
              : `${timeFrame} Венера ${phrases.positive}. Хорошее время для романтики и общения с близкими.`
          : locale === 'en'
            ? `${timeFrame} Venus ${phrases.negative}. Practice patience in relationships.`
            : locale === 'es'
              ? `${timeFrame} Venus ${phrases.negative}. Practica la paciencia en las relaciones.`
              : `${timeFrame} Венера ${phrases.negative}. Проявите терпение в отношениях.`;

        let text = base;
        if (dominantTransit?.house) {
          try {
            const focus = getPlanetHouseFocus(
              (dominantTransit?.transitPlanet || 'venus') as PlanetKey,
              dominantTransit.house,
              locale,
            );
            text = `${base} ${focus}`;
          } catch {
            // ignore
          }
        }

        return this.appendFreeDetail(text, 'love', locale, [
          timeFrame,
          sunSign,
          moonSign,
          dominantTransit?.transitPlanet || 'venus',
          dominantTransit?.aspect || '-',
          dominantTransit?.house || 0,
        ]);
      }

      const neutralText =
        locale === 'en'
          ? `${timeFrame} energy ${phrases.neutral}. Value existing relationships.`
          : locale === 'es'
            ? `${timeFrame} la energía ${phrases.neutral}. Valora las relaciones existentes.`
            : `${timeFrame} энергии ${phrases.neutral}. Цените существующие отношения.`;

      let text = neutralText;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'venus') as PlanetKey,
            dominantTransit.house,
            locale,
          );
          text = `${neutralText} ${focus}`;
        } catch {
          // ignore
        }
      }

      return this.appendFreeDetail(text, 'love', locale, [
        timeFrame,
        sunSign,
        moonSign,
        dominantTransit?.transitPlanet || 'venus',
        dominantTransit?.aspect || '-',
        dominantTransit?.house || 0,
      ]);
    } catch {
      if (venusAspects.length > 0) {
        const aspect = venusAspects[0];
        if (['trine', 'sextile', 'conjunction'].includes(aspect.aspect)) {
          const base =
            locale === 'en'
              ? `${timeFrame} Venus creates a romantic atmosphere. Good time for romance and connection.`
              : locale === 'es'
                ? `${timeFrame} Venus crea un ambiente romántico. Buen momento para el romance y la conexión.`
                : `${timeFrame} Венера создает романтическую атмосферу. Хорошее время для романтики и общения с близкими.`;
          return this.appendFreeDetail(base, 'love', locale, [
            timeFrame,
            sunSign,
            moonSign,
            'venus',
            aspect.aspect,
          ]);
        }
        const base =
          locale === 'en'
            ? `${timeFrame} Venus creates tension. Practice patience in relationships.`
            : locale === 'es'
              ? `${timeFrame} Venus crea tensión. Practica la paciencia en las relaciones.`
              : `${timeFrame} Венера создает напряжение. Проявите терпение в отношениях.`;
        return this.appendFreeDetail(base, 'love', locale, [
          timeFrame,
          sunSign,
          moonSign,
          'venus',
          aspect.aspect,
        ]);
      }

      const base =
        locale === 'en'
          ? `${timeFrame} energy influences your emotions. Value existing relationships.`
          : locale === 'es'
            ? `${timeFrame} la energía influye en tus emociones. Valora las relaciones existentes.`
            : `${timeFrame} энергии влияет на ваши эмоции. Цените существующие отношения.`;
      return this.appendFreeDetail(base, 'love', locale, [
        timeFrame,
        sunSign,
        moonSign,
        'venus',
        '-',
      ]);
    }
  }

  /**
   * УЛУЧШЕННАЯ генерация прогноза для карьеры
   */
  private generateCareerPrediction(
    sunSign: string,
    transitAspects: TransitAspect[],
    timeFrame: string,
    dominantTransit?: TransitAspect | null,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const jupiterAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'jupiter',
    );
    const saturnAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'saturn',
    );
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );

    try {
      const actionSeed = [
        timeFrame,
        sunSign,
        dominantTransit?.transitPlanet || '-',
        dominantTransit?.aspect || '-',
        dominantTransit?.natalPlanet || '-',
        dominantTransit?.house || 0,
        dominantTransit?.isRetrograde ? 1 : 0,
      ].join('|');
      const actions = getCareerActions(
        timeFrame as import('../modules/shared/types').PeriodFrame,
        locale,
        actionSeed,
      ) as Record<string, string>;

      if (jupiterAspects.length > 0) {
        if (locale === 'en') {
          return this.appendFreeDetail(
            `${timeFrame} Jupiter ${actions.jupiter} career initiatives. Time for bold decisions.`,
            'career',
            locale,
            [timeFrame, sunSign, 'jupiter'],
          );
        }
        if (locale === 'es') {
          return this.appendFreeDetail(
            `${timeFrame} Júpiter ${actions.jupiter} iniciativas profesionales. Tiempo de decisiones audaces.`,
            'career',
            locale,
            [timeFrame, sunSign, 'jupiter'],
          );
        }
        return this.appendFreeDetail(
          `${timeFrame} Юпитер ${actions.jupiter} карьерных инициатив. Время для смелых решений.`,
          'career',
          locale,
          [timeFrame, sunSign, 'jupiter'],
        );
      }

      if (marsAspects.length > 0) {
        if (['trine', 'sextile'].includes(marsAspects[0].aspect)) {
          if (locale === 'en') {
            return this.appendFreeDetail(
              `${timeFrame} Mars ${actions.mars} active work moves. Use your energy constructively.`,
              'career',
              locale,
              [timeFrame, sunSign, 'mars'],
            );
          }
          if (locale === 'es') {
            return this.appendFreeDetail(
              `${timeFrame} Marte ${actions.mars} acciones activas en el trabajo. Usa tu energía de forma constructiva.`,
              'career',
              locale,
              [timeFrame, sunSign, 'mars'],
            );
          }
          return this.appendFreeDetail(
            `${timeFrame} Марс ${actions.mars} активных действий в работе. Используйте свою энергию конструктивно.`,
            'career',
            locale,
            [timeFrame, sunSign, 'mars'],
          );
        }
      }

      if (saturnAspects.length > 0) {
        const base =
          locale === 'en'
            ? `${timeFrame} Saturn ${actions.saturn} discipline and responsibility. Focus on long-term goals.`
            : locale === 'es'
              ? `${timeFrame} Saturno ${actions.saturn} disciplina y responsabilidad. Enfócate en objetivos a largo plazo.`
              : `${timeFrame} Сатурн ${actions.saturn} дисциплина и ответственность. Сосредоточьтесь на долгосрочных целях.`;
        if (dominantTransit?.house) {
          try {
            const focus = getPlanetHouseFocus(
              (dominantTransit?.transitPlanet || 'saturn') as PlanetKey,
              dominantTransit.house,
              locale,
            );
            return this.appendFreeDetail(`${base} ${focus}`, 'career', locale, [
              timeFrame,
              sunSign,
              'saturn',
              dominantTransit?.house || 0,
            ]);
          } catch {
            return this.appendFreeDetail(`${base}`, 'career', locale, [
              timeFrame,
              sunSign,
              'saturn',
            ]);
          }
        }
        return this.appendFreeDetail(base, 'career', locale, [
          timeFrame,
          sunSign,
          'saturn',
        ]);
      }

      const neutralText =
        locale === 'en'
          ? `${timeFrame} ${actions.neutral} current projects. Consistency matters.`
          : locale === 'es'
            ? `${timeFrame} ${actions.neutral} proyectos actuales. La constancia importa.`
            : `${timeFrame} ${actions.neutral} текущими проектами. Последовательность важна.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'saturn') as PlanetKey,
            dominantTransit.house,
            locale,
          );
          return this.appendFreeDetail(
            `${neutralText} ${focus}`,
            'career',
            locale,
            [timeFrame, sunSign, 'neutral', dominantTransit?.house || 0],
          );
        } catch {
          return this.appendFreeDetail(neutralText, 'career', locale, [
            timeFrame,
            sunSign,
            'neutral',
          ]);
        }
      }
      return this.appendFreeDetail(neutralText, 'career', locale, [
        timeFrame,
        sunSign,
        'neutral',
      ]);
    } catch {
      if (jupiterAspects.length > 0) {
        if (locale === 'en') {
          return this.appendFreeDetail(
            `${timeFrame} Jupiter is favorable for career initiatives. Time for bold decisions.`,
            'career',
            locale,
            [timeFrame, sunSign, 'jupiter'],
          );
        }
        if (locale === 'es') {
          return this.appendFreeDetail(
            `${timeFrame} Júpiter favorece iniciativas profesionales. Tiempo de decisiones audaces.`,
            'career',
            locale,
            [timeFrame, sunSign, 'jupiter'],
          );
        }
        return this.appendFreeDetail(
          `${timeFrame} Юпитер благоприятен для карьерных инициатив. Время для смелых решений.`,
          'career',
          locale,
          [timeFrame, sunSign, 'jupiter'],
        );
      }
      if (
        marsAspects.length > 0 &&
        ['trine', 'sextile'].includes(marsAspects[0].aspect)
      ) {
        if (locale === 'en') {
          return this.appendFreeDetail(
            `${timeFrame} Mars adds energy for active work actions. Use it constructively.`,
            'career',
            locale,
            [timeFrame, sunSign, 'mars'],
          );
        }
        if (locale === 'es') {
          return this.appendFreeDetail(
            `${timeFrame} Marte aporta energía para acciones activas en el trabajo. Úsala de forma constructiva.`,
            'career',
            locale,
            [timeFrame, sunSign, 'mars'],
          );
        }
        return this.appendFreeDetail(
          `${timeFrame} Марс добавляет энергии для активных действий в работе. Используйте её конструктивно.`,
          'career',
          locale,
          [timeFrame, sunSign, 'mars'],
        );
      }
      if (saturnAspects.length > 0) {
        if (locale === 'en') {
          return this.appendFreeDetail(
            `${timeFrame} Saturn requires discipline and responsibility. Focus on long-term goals.`,
            'career',
            locale,
            [timeFrame, sunSign, 'saturn'],
          );
        }
        if (locale === 'es') {
          return this.appendFreeDetail(
            `${timeFrame} Saturno requiere disciplina y responsabilidad. Enfócate en objetivos a largo plazo.`,
            'career',
            locale,
            [timeFrame, sunSign, 'saturn'],
          );
        }
        return this.appendFreeDetail(
          `${timeFrame} Сатурн требует дисциплины и ответственности. Сосредоточьтесь на долгосрочных целях.`,
          'career',
          locale,
          [timeFrame, sunSign, 'saturn'],
        );
      }
      if (locale === 'en') {
        return this.appendFreeDetail(
          `${timeFrame} continue working on current projects. Consistency matters.`,
          'career',
          locale,
          [timeFrame, sunSign, 'neutral'],
        );
      }
      if (locale === 'es') {
        return this.appendFreeDetail(
          `${timeFrame} continúa trabajando en los proyectos actuales. La constancia importa.`,
          'career',
          locale,
          [timeFrame, sunSign, 'neutral'],
        );
      }
      return this.appendFreeDetail(
        `${timeFrame} продолжайте работу над текущими проектами. Последовательность важна.`,
        'career',
        locale,
        [timeFrame, sunSign, 'neutral'],
      );
    }
  }

  /**
   * Генерация прогноза для здоровья
   */
  private generateHealthPrediction(
    sunSign: string,
    transitAspects: TransitAspect[],
    timeFrame: string,
    dominantTransit?: TransitAspect | null,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );
    const pickFrom = (pool: string[]) => {
      if (!pool.length) return '';
      const idx =
        Math.abs(
          hashSignature([
            timeFrame,
            sunSign,
            dominantTransit?.transitPlanet || '-',
            dominantTransit?.aspect || '-',
            dominantTransit?.natalPlanet || '-',
            dominantTransit?.house || 0,
            dominantTransit?.isRetrograde ? 1 : 0,
            'health',
          ]),
        ) % pool.length;
      return pool[idx];
    };

    if (marsAspects.length > 0 && marsAspects[0].aspect === 'square') {
      const base =
        locale === 'en'
          ? pickFrom([
              `${timeFrame} be mindful of your health. Avoid overexertion and rest.`,
              `${timeFrame} keep a gentle pace. Recovery and sleep are important.`,
              `${timeFrame} protect your energy. Slow down and avoid overload.`,
            ])
          : locale === 'es'
            ? pickFrom([
                `${timeFrame} cuida tu salud. Evita el sobreesfuerzo y descansa.`,
                `${timeFrame} baja el ritmo. El descanso será clave.`,
                `${timeFrame} protege tu energía y evita cargas excesivas.`,
              ])
            : pickFrom([
                `${timeFrame} будьте внимательны к здоровью. Избегайте перегрузок и отдыхайте.`,
                `${timeFrame} снизьте темп — восстановление и сон важны.`,
                `${timeFrame} берегите энергию и не берите лишнего.`,
              ]);
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'mars') as PlanetKey,
            dominantTransit.house,
            locale,
          );
          return this.appendFreeDetail(`${base} ${focus}`, 'health', locale, [
            timeFrame,
            sunSign,
            'mars',
            dominantTransit?.house || 0,
          ]);
        } catch {
          return this.appendFreeDetail(base, 'health', locale, [
            timeFrame,
            sunSign,
            'mars',
          ]);
        }
      }
      return this.appendFreeDetail(base, 'health', locale, [
        timeFrame,
        sunSign,
        'mars',
      ]);
    }

    const ok =
      locale === 'en'
        ? pickFrom([
            `${timeFrame} your energy is in a good place. Maintain an active lifestyle.`,
            `${timeFrame} stamina is stable. Light activity will boost balance.`,
            `${timeFrame} your body responds well to consistent routines.`,
          ])
        : locale === 'es'
          ? pickFrom([
              `${timeFrame} tu energía está en buen nivel. Mantén un estilo de vida activo.`,
              `${timeFrame} tu vitalidad es estable. La actividad ligera ayuda.`,
              `${timeFrame} el cuerpo responde bien a la constancia.`,
            ])
          : pickFrom([
              `${timeFrame} ваша энергия на хорошем уровне. Поддерживайте активный образ жизни.`,
              `${timeFrame} тонус стабильный — легкая активность будет полезна.`,
              `${timeFrame} организм хорошо отвечает на рутинные практики.`,
            ]);
    if (dominantTransit?.house) {
      try {
        const focus = getPlanetHouseFocus(
          (dominantTransit?.transitPlanet || 'mars') as PlanetKey,
          dominantTransit.house,
          locale,
        );
        return this.appendFreeDetail(`${ok} ${focus}`, 'health', locale, [
          timeFrame,
          sunSign,
          'mars',
          dominantTransit?.house || 0,
        ]);
      } catch {
        return this.appendFreeDetail(ok, 'health', locale, [
          timeFrame,
          sunSign,
          'mars',
        ]);
      }
    }
    return this.appendFreeDetail(ok, 'health', locale, [
      timeFrame,
      sunSign,
      'mars',
    ]);
  }

  /**
   * Генерация финансового прогноза
   */
  private generateFinancePrediction(
    sunSign: string,
    transitAspects: TransitAspect[],
    timeFrame: string,
    dominantTransit?: TransitAspect | null,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const jupiterAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'jupiter',
    );
    const pickFrom = (pool: string[]) => {
      if (!pool.length) return '';
      const idx =
        Math.abs(
          hashSignature([
            timeFrame,
            sunSign,
            dominantTransit?.transitPlanet || '-',
            dominantTransit?.aspect || '-',
            dominantTransit?.natalPlanet || '-',
            dominantTransit?.house || 0,
            dominantTransit?.isRetrograde ? 1 : 0,
            'finance',
          ]),
        ) % pool.length;
      return pool[idx];
    };

    if (
      jupiterAspects.length > 0 &&
      ['trine', 'sextile'].includes(jupiterAspects[0].aspect)
    ) {
      const base =
        locale === 'en'
          ? pickFrom([
              `${timeFrame} Jupiter favors finances. Consider new opportunities.`,
              `${timeFrame} financial doors open—evaluate options carefully.`,
              `${timeFrame} a positive money flow is possible. Act wisely.`,
            ])
          : locale === 'es'
            ? pickFrom([
                `${timeFrame} Júpiter favorece las finanzas. Considera nuevas oportunidades.`,
                `${timeFrame} se abren opciones financieras; evalúa con calma.`,
                `${timeFrame} puede haber buen flujo de dinero. Actúa con prudencia.`,
              ])
            : pickFrom([
                `${timeFrame} Юпитер благоприятствует финансам. Рассмотрите новые возможности.`,
                `${timeFrame} открываются финансовые варианты — оценивайте аккуратно.`,
                `${timeFrame} возможен хороший денежный поток. Действуйте осмотрительно.`,
              ]);
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'jupiter') as PlanetKey,
            dominantTransit.house,
            locale,
          );
          return this.appendFreeDetail(`${base} ${focus}`, 'finance', locale, [
            timeFrame,
            sunSign,
            'jupiter',
            dominantTransit?.house || 0,
          ]);
        } catch {
          return this.appendFreeDetail(base, 'finance', locale, [
            timeFrame,
            sunSign,
            'jupiter',
          ]);
        }
      }
      return this.appendFreeDetail(base, 'finance', locale, [
        timeFrame,
        sunSign,
        'jupiter',
      ]);
    }

    const neutralText =
      locale === 'en'
        ? pickFrom([
            `${timeFrame} financial situation is stable. Stick to a budget.`,
            `${timeFrame} keep expenses in check and plan ahead.`,
            `${timeFrame} steady finances—prioritize essentials.`,
          ])
        : locale === 'es'
          ? pickFrom([
              `${timeFrame} la situación financiera es estable. Mantén el presupuesto.`,
              `${timeFrame} controla gastos y planifica con antelación.`,
              `${timeFrame} finanzas estables—prioriza lo esencial.`,
            ])
          : pickFrom([
              `${timeFrame} финансовая ситуация стабильна. Придерживайтесь бюджета.`,
              `${timeFrame} держите расходы под контролем и планируйте заранее.`,
              `${timeFrame} финансы ровные — приоритет базовым вещам.`,
            ]);
    if (dominantTransit?.house) {
      try {
        const focus = getPlanetHouseFocus(
          (dominantTransit?.transitPlanet || 'jupiter') as PlanetKey,
          dominantTransit.house,
          locale,
        );
        return this.appendFreeDetail(
          `${neutralText} ${focus}`,
          'finance',
          locale,
          [timeFrame, sunSign, 'neutral', dominantTransit?.house || 0],
        );
      } catch {
        return this.appendFreeDetail(neutralText, 'finance', locale, [
          timeFrame,
          sunSign,
          'neutral',
        ]);
      }
    }
    return this.appendFreeDetail(neutralText, 'finance', locale, [
      timeFrame,
      sunSign,
      'neutral',
    ]);
  }

  /**
   * УЛУЧШЕННАЯ генерация совета с учетом периода
   */
  private generateAdvice(
    sunSign: string,
    dominantTransit: TransitAspect | null,
    timeFrame: string,
    targetDate: Date,
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const advices = getAdvicePool(
      timeFrame as import('../modules/shared/types').PeriodFrame,
      locale,
    ) as string[] | undefined;
    const basePick =
      advices && advices.length
        ? advices[
            Math.abs(
              hashSignature([
                timeFrame,
                sunSign,
                dominantTransit?.transitPlanet || '-',
                dominantTransit?.aspect || '-',
                dominantTransit?.natalPlanet || '-',
                dominantTransit?.house || 0,
                dominantTransit?.isRetrograde ? 1 : 0,
              ]),
            ) % advices.length
          ]
        : locale === 'en'
          ? 'Keep balance and act consistently.'
          : locale === 'es'
            ? 'Mantén el equilibrio y actúa con constancia.'
            : 'Сохраняйте баланс и действуйте последовательно.';

    // Жизненные циклы (Сатурн, Юпитер, Узлы, Хирон)
    const cycles = this.getLifeCycles(chartData, targetDate, locale);
    let text = basePick;
    if (cycles.length) {
      const label =
        locale === 'en' ? 'Cycles' : locale === 'es' ? 'Ciclos' : 'Циклы';
      text = `${text} ${label}: ${cycles.join(', ')}.`;
    }

    // Окно влияния доминирующего транзита
    text = this.appendTransitWindow(text, dominantTransit, timeFrame, locale);

    return text;
  }

  /**
   * Определение тональности прогноза
   */
  private determinePredictionTone(
    transitAspects: TransitAspect[],
  ): 'positive' | 'neutral' | 'challenging' {
    let score = 0;

    transitAspects.forEach((aspect) => {
      if (['trine', 'sextile'].includes(aspect.aspect)) {
        score += aspect.strength;
      } else if (['square', 'opposition'].includes(aspect.aspect)) {
        score -= aspect.strength;
      }
    });

    if (score > 0.5) return 'positive';
    if (score < -0.5) return 'challenging';
    return 'neutral';
  }

  private appendFreeDetail(
    base: string,
    category: 'general' | 'love' | 'career' | 'health' | 'finance',
    locale: 'ru' | 'en' | 'es',
    seed: Array<string | number>,
  ): string {
    const pools: Record<typeof locale, Record<typeof category, string[]>> = {
      ru: {
        general: [
          'Сохраняйте ясный фокус и выбирайте приоритеты.',
          'Небольшие шаги дадут устойчивый результат.',
          'Действуйте последовательно и опирайтесь на интуицию.',
          'Избегайте суеты — качество важнее скорости.',
        ],
        love: [
          'Теплый диалог укрепит связь и снизит напряжение.',
          'Мягкость в словах поможет избежать лишних конфликтов.',
          'Сейчас важны внимательность и бережность к чувствам.',
          'Не спешите с выводами — ясность придет постепенно.',
        ],
        career: [
          'Ставьте реалистичные цели и фиксируйте прогресс.',
          'Опирайтесь на структуру — это ускорит движение.',
          'Сосредоточьтесь на одном ключевом шаге.',
          'Планомерная работа даст наилучший эффект.',
        ],
        health: [
          'Сон, вода и режим — ваша опора сегодня.',
          'Легкая активность поможет держать баланс.',
          'Слушайте тело и не перегружайте себя.',
          'Восстановление сейчас важнее интенсивности.',
        ],
        finance: [
          'Проверьте расходы и держите бюджет под контролем.',
          'Лучше избегать импульсивных покупок.',
          'Небольшая экономия даст ощущение стабильности.',
          'Планируйте траты заранее — это снизит тревожность.',
        ],
      },
      en: {
        general: [
          'Keep your focus and choose clear priorities.',
          'Small steps will bring steady results.',
          'Act consistently and trust your intuition.',
          'Avoid rushing—quality beats speed.',
        ],
        love: [
          'Warm dialogue will strengthen the connection.',
          'Gentle words help prevent unnecessary friction.',
          'Attention and care matter most right now.',
          'Don’t rush conclusions—clarity comes with time.',
        ],
        career: [
          'Set realistic goals and track progress.',
          'Structure will accelerate movement.',
          'Focus on one key move at a time.',
          'Steady work delivers the best outcome.',
        ],
        health: [
          'Sleep, hydration, and routine are your anchor.',
          'Light activity helps keep balance.',
          'Listen to your body and avoid overload.',
          'Recovery matters more than intensity.',
        ],
        finance: [
          'Review spending and keep a clear budget.',
          'Avoid impulsive purchases for now.',
          'Small savings build a sense of stability.',
          'Plan expenses ahead to reduce stress.',
        ],
      },
      es: {
        general: [
          'Mantén el foco y elige prioridades claras.',
          'Pasos pequeños dan resultados estables.',
          'Actúa con constancia y confía en la intuición.',
          'Evita la prisa—la calidad vale más.',
        ],
        love: [
          'El diálogo cálido fortalecerá el vínculo.',
          'Palabras suaves evitan fricciones innecesarias.',
          'La atención y el cuidado son clave ahora.',
          'No apresures conclusiones—la claridad llega con tiempo.',
        ],
        career: [
          'Define metas realistas y mide avances.',
          'La estructura acelera el progreso.',
          'Enfócate en un paso clave a la vez.',
          'El trabajo constante trae mejores resultados.',
        ],
        health: [
          'Sueño, agua y rutina son tu apoyo.',
          'Actividad ligera ayuda a mantener equilibrio.',
          'Escucha tu cuerpo y evita sobrecargas.',
          'La recuperación importa más que la intensidad.',
        ],
        finance: [
          'Revisa gastos y mantén un presupuesto claro.',
          'Evita compras impulsivas por ahora.',
          'Pequeños ahorros dan estabilidad.',
          'Planifica gastos para reducir estrés.',
        ],
      },
    };

    const pool = pools[locale]?.[category] || [];
    if (!pool.length) return base;
    const idx1 = Math.abs(hashSignature([...seed, category])) % pool.length;
    const idx2 =
      pool.length > 1
        ? Math.abs(hashSignature([...seed, category, 'b'])) % pool.length
        : idx1;
    const idx3 =
      pool.length > 2
        ? Math.abs(hashSignature([...seed, category, 'c'])) % pool.length
        : idx1;
    const first = pool[idx1];
    const second = pool[idx2] && idx2 !== idx1 ? pool[idx2] : '';
    const third =
      pool[idx3] && idx3 !== idx1 && idx3 !== idx2 ? pool[idx3] : '';
    const extra = [first, second, third].filter(Boolean).join(' ');
    if (!extra) return base;
    return `${base} ${extra}`;
  }

  /**
   * Получение временного фрейма
   */
  private getTimeFrame(
    period: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const frames: Record<string, Record<'ru' | 'en' | 'es', string>> = {
      day: { ru: 'Сегодня', en: 'Today', es: 'Hoy' },
      tomorrow: { ru: 'Завтра', en: 'Tomorrow', es: 'Mañana' },
      week: { ru: 'На этой неделе', en: 'This week', es: 'Esta semana' },
      month: { ru: 'В этом месяце', en: 'This month', es: 'Este mes' },
    };
    return frames[period]?.[locale] || frames.day[locale];
  }

  /**
   * Получение текущих транзитов
   */
  private async getCurrentTransits(date: Date): Promise<TransitData> {
    const julianDay = this.ephemerisService.dateToJulianDay(date);
    const planets = await this.ephemerisService.calculatePlanets(julianDay);
    return { planets: planets as Record<string, TransitPlanet>, date };
  }

  /**
   * Анализ транзитных аспектов
   */
  private analyzeTransitAspects(
    natalPlanets: Record<string, Planet> | undefined,
    transitPlanets: Record<string, TransitPlanet>,
    natalHouses?: Record<number, House>,
  ): TransitAspect[] {
    const aspects: TransitAspect[] = [];

    if (!natalPlanets) return aspects;

    for (const [natalKey, natalPlanet] of Object.entries(natalPlanets)) {
      for (const [transitKey, transitPlanet] of Object.entries(
        transitPlanets,
      )) {
        const aspect = this.calculateAspect(
          natalPlanet.longitude,
          transitPlanet.longitude,
          transitKey as PlanetKey,
        );

        if (aspect) {
          const house = natalHouses
            ? getHouseForLongitude(transitPlanet.longitude, natalHouses)
            : undefined;
          const isRetrograde = transitPlanet.isRetrograde === true;
          const transitSign = transitPlanet.sign;
          const transitSpeed = transitPlanet.speed;
          let dignity: DignityLevel = 'neutral';
          if (transitSign) {
            try {
              dignity = getEssentialDignity(
                transitKey as PlanetKey,
                transitSign as import('../modules/shared/types').Sign,
              );
            } catch {
              dignity = 'neutral';
            }
          }

          aspects.push({
            natalPlanet: natalKey,
            transitPlanet: transitKey,
            aspect: aspect.type,
            orb: aspect.orb,
            strength: aspect.strength,
            house,
            isRetrograde,
            transitSign,
            transitSpeed,
            dignity,
          });
        }
      }
    }

    return aspects.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Расчет аспекта между двумя долготами
   */
  private calculateAspect(
    longitudeNatal: number,
    longitudeTransit: number,
    transitPlanet?: PlanetKey,
  ): AspectCalculationResult | null {
    // Используем shared утилиту с динамическими орбисами
    let customOrbs: Partial<Record<AspectType, number>> | undefined;

    if (transitPlanet != null) {
      // Для транзитной планеты используем специальные узкие орбисы
      customOrbs = {
        conjunction: getTransitOrb(transitPlanet, 'conjunction'),
        sextile: getTransitOrb(transitPlanet, 'sextile'),
        square: getTransitOrb(transitPlanet, 'square'),
        trine: getTransitOrb(transitPlanet, 'trine'),
        opposition: getTransitOrb(transitPlanet, 'opposition'),
      };
    }

    return calculateAspect(longitudeNatal, longitudeTransit, customOrbs);
  }

  /**
   * Доминирующий транзит с учётом веса планеты, силы аспекта и бонуса за релевантный дом домена.
   * domain: 'love' | 'career' | 'health' | 'finance' | 'general'
   */
  private getDominantTransit(
    transitAspects: TransitAspect[],
    domain?: string,
  ): TransitAspect | null {
    if (!transitAspects || transitAspects.length === 0) return null;

    const domainHouses: Record<string, number[]> = {
      love: [5, 7],
      career: [10],
      health: [6],
      finance: [2, 8],
      general: [],
    };

    let best: TransitAspect | null = null;
    let bestScore = -Infinity;

    for (const a of transitAspects) {
      const weight =
        PLANET_WEIGHTS[(a.transitPlanet || 'sun') as PlanetKey] || 1;
      let score = weight * (a.strength || 0);

      // Эссенциальное достоинство усиливает/ослабляет вклад
      const dignityMap: Record<DignityLevel, number> = {
        ruler: 1.15,
        exalted: 1.1,
        triplicity: 1.05,
        neutral: 1.0,
        detriment: 0.9,
        fall: 0.85,
      };
      const dignityLevel: DignityLevel =
        (a.dignity as DignityLevel) || 'neutral';
      score *= dignityMap[dignityLevel] ?? 1.0;

      // Длительность транзита — медленные/долгие получают небольшой бонус
      const days = this.estimateTransitDurationDays(a);
      const durFactor = Math.min(1.3, 1.0 + Math.max(0, days) / 60); // до +30%
      score *= durFactor;

      // Бонус за релевантный дом для домена
      const houses = domain ? domainHouses[domain] || [] : [];
      if (a.house && houses.includes(a.house)) {
        score *= 1.2;
      }

      // Штраф за ретроградность
      if (a.isRetrograde) score *= 0.9;

      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  /**
   * Расчет энергии
   */
  private calculateEnergy(transitAspects: TransitAspect[]): number {
    let energy = 50;

    transitAspects.forEach((aspect) => {
      if (['trine', 'sextile'].includes(aspect.aspect)) {
        energy += aspect.strength * 15;
      } else if (aspect.aspect === 'conjunction') {
        energy += aspect.strength * 10;
      } else if (['square', 'opposition'].includes(aspect.aspect)) {
        energy += aspect.strength * 5;
      }

      // Небольшая корректировка за ретроградность транзитной планеты
      if (aspect.isRetrograde) {
        energy -= aspect.strength * 5;
      }
    });

    return Math.min(100, Math.max(0, Math.round(energy)));
  }

  /**
   * Определение настроения
   */
  private determineMood(
    energy: number,
    _transitAspects: TransitAspect[],
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const moods = {
      ru: {
        high: 'Радостное и вдохновленное',
        midHigh: 'Позитивное и активное',
        mid: 'Сбалансированное',
        low: 'Задумчивое',
        min: 'Спокойное',
      },
      en: {
        high: 'Joyful and inspired',
        midHigh: 'Positive and active',
        mid: 'Balanced',
        low: 'Thoughtful',
        min: 'Calm',
      },
      es: {
        high: 'Alegre e inspirado',
        midHigh: 'Positivo y activo',
        mid: 'Equilibrado',
        low: 'Reflexivo',
        min: 'Tranquilo',
      },
    };
    const dict = moods[locale];
    if (energy > 80) return dict.high;
    if (energy > 60) return dict.midHigh;
    if (energy > 40) return dict.mid;
    if (energy > 20) return dict.low;
    return dict.min;
  }
  /**
   * Оценка длительности транзита (примерно) в днях на основе орбиса и скорости транзитной планеты.
   * Используем планетарный орбис из getTransitOrb и фактическую скорость (deg/day) из эфемерид.
   */
  private estimateTransitDurationDays(a: TransitAspect): number {
    try {
      const baseOrb =
        getTransitOrb(
          (a?.transitPlanet || 'sun') as PlanetKey,
          a?.aspect as import('../modules/shared/types').AspectType,
        ) || 6;
      const remaining = Math.max(0, baseOrb - (a?.orb ?? 0));
      const speedAbs = Math.abs(a?.transitSpeed ?? 0); // deg/day (может быть 0 при стационарности)
      const minSpeed = 0.1; // чтобы исключить деление на 0 и учесть стационарные периоды
      const speed = Math.max(minSpeed, speedAbs);

      // В обе стороны от точного аспекта (до/после) — грубо умножаем на 2
      const days = (remaining / speed) * 2;
      return Math.max(1, Math.min(120, Math.round(days)));
    } catch {
      // Базовый фолбэк
      return 7;
    }
  }

  /**
   * Добавляет к тексту информацию об окне влияния доминирующего транзита (в днях).
   * Для day/tomorrow короче формулировка, для week/month — общая.
   */
  private appendTransitWindow(
    text: string,
    dominantTransit: TransitAspect | null,
    timeFrame: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    try {
      if (!dominantTransit) return text;
      const days = this.estimateTransitDurationDays(dominantTransit);
      const frames: Record<
        'ru' | 'en' | 'es',
        { day: string; tomorrow: string }
      > = {
        ru: { day: 'Сегодня', tomorrow: 'Завтра' },
        en: { day: 'Today', tomorrow: 'Tomorrow' },
        es: { day: 'Hoy', tomorrow: 'Mañana' },
      };
      const shortFrames = new Set([
        frames[locale]?.day,
        frames[locale]?.tomorrow,
      ]);
      const suffix = shortFrames.has(timeFrame)
        ? locale === 'en'
          ? ` Window ~${days} d.`
          : locale === 'es'
            ? ` Ventana ~${days} d.`
            : ` Окно ~${days} дн.`
        : locale === 'en'
          ? ` Influence window ~${days} d.`
          : locale === 'es'
            ? ` Ventana de influencia ~${days} d.`
            : ` Окно влияния ~${days} дн.`;
      return `${text} ${suffix}`.trim();
    } catch {
      return text;
    }
  }

  /**
   * Ключевые жизненные циклы по возрасту (приближенно):
   * - Сатурново возвращение ~29.5 и ~58.6 лет
   * - Возвращение Юпитера каждые ~12 лет
   * - Возврат Лунных Узлов ~18.6 лет; инверсия ~9.3 лет
   * - Возвращение Хирона ~50.9 лет
   */
  private getLifeCycles(
    chartData: ChartData,
    targetDate: Date,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string[] {
    const cycles: string[] = [];
    const labels = {
      saturnReturn: {
        ru: 'Сатурново возвращение',
        en: 'Saturn return',
        es: 'Retorno de Saturno',
      },
      jupiterReturn: {
        ru: 'Возвращение Юпитера',
        en: 'Jupiter return',
        es: 'Retorno de Júpiter',
      },
      lunarNodesReturn: {
        ru: 'Возврат Лунных Узлов',
        en: 'Lunar Nodes return',
        es: 'Retorno de los Nodos Lunares',
      },
      lunarNodesInversion: {
        ru: 'Инверсия Лунных Узлов',
        en: 'Lunar Nodes inversion',
        es: 'Inversión de los Nodos Lunares',
      },
      chironReturn: {
        ru: 'Возвращение Хирона',
        en: 'Chiron return',
        es: 'Retorno de Quirón',
      },
    };
    try {
      // Try to get birthDate from chartData extended properties
      const chartDataAny = chartData as Record<string, unknown>;
      const birthDateRaw =
        (chartDataAny?.birthDate as string | undefined) ??
        ((chartDataAny?.data as Record<string, unknown>)?.birthDate as
          | string
          | undefined) ??
        ((chartDataAny?.meta as Record<string, unknown>)?.birthDate as
          | string
          | undefined);

      const birthDate = normalizeBirthDateValue(birthDateRaw);
      if (!birthDate) return cycles;

      const [birthYear, birthMonth, birthDay] = birthDate
        .split('-')
        .map(Number);
      if (
        [birthYear, birthMonth, birthDay].some((part) => Number.isNaN(part))
      ) {
        return cycles;
      }

      const birth = new Date(
        Date.UTC(birthYear, birthMonth - 1, birthDay, 12, 0, 0),
      );
      const targetDateNoon = new Date(
        Date.UTC(
          targetDate.getUTCFullYear(),
          targetDate.getUTCMonth(),
          targetDate.getUTCDate(),
          12,
          0,
          0,
        ),
      );

      const age =
        (targetDateNoon.getTime() - birth.getTime()) /
        (365.2425 * 24 * 3600 * 1000);
      const near = (val: number, center: number, tol: number) =>
        Math.abs(val - center) <= tol;

      if (near(age, 29.5, 1.5) || near(age, 58.6, 1.5)) {
        cycles.push(labels.saturnReturn[locale]);
      }
      if (
        near(age, 12.0, 1.0) ||
        near(age, 24.0, 1.0) ||
        near(age, 36.0, 1.0) ||
        near(age, 48.0, 1.0)
      ) {
        cycles.push(labels.jupiterReturn[locale]);
      }
      if (near(age, 18.6, 1.0) || near(age, 37.2, 1.0)) {
        cycles.push(labels.lunarNodesReturn[locale]);
      }
      if (near(age, 9.3, 0.8) || near(age, 27.9, 0.8)) {
        cycles.push(labels.lunarNodesInversion[locale]);
      }
      if (near(age, 50.9, 2.0)) {
        cycles.push(labels.chironReturn[locale]);
      }
    } catch {
      // ignore
    }
    return Array.from(new Set(cycles)).slice(0, 3);
  }

  /**
   * Calculate lunar phase for the target date
   */
  private calculateLunarPhaseForDate(
    transits: TransitData,
    locale: 'ru' | 'en' | 'es',
  ):
    | {
        phase: string;
        emoji: string;
        description: string;
        illumination: number;
        interpretation: string;
      }
    | undefined {
    try {
      const sunLongitude = transits.planets?.sun?.longitude;
      const moonLongitude = transits.planets?.moon?.longitude;

      if (sunLongitude == null || moonLongitude == null) {
        this.logger.warn(
          'Sun or Moon longitude not available for lunar phase calculation',
        );
        return undefined;
      }

      const phaseInfo = calculateLunarPhase(sunLongitude, moonLongitude);
      const interpretation = getLunarPhaseInterpretation(
        phaseInfo.phase,
        locale,
      );

      return {
        phase: phaseInfo.phase,
        emoji: phaseInfo.emoji,
        description: phaseInfo.description,
        illumination: Math.round(phaseInfo.illumination * 100) / 100, // Round to 2 decimals
        interpretation,
      };
    } catch (error) {
      this.logger.error('Error calculating lunar phase:', error);
      return undefined;
    }
  }

  /**
   * Генерация счастливых чисел
   */
  private generateLuckyNumbers(chartData: ChartData, date: Date): number[] {
    const seed = date.getDate() + date.getMonth() * 31;
    const numbers: number[] = [];

    for (let i = 0; i < 5; i++) {
      numbers.push(((seed * (i + 1) * 7) % 90) + 1);
    }

    return [...new Set(numbers)].slice(0, 5);
  }

  /**
   * Генерация счастливых цветов
   */
  private generateLuckyColors(
    sunSign: string,
    _dominantTransit: TransitAspect | null,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const colors = getSignColors(
      sunSign as import('../modules/shared/types').Sign,
      locale,
    ) as string[] | undefined;
    return colors && colors.length
      ? colors
      : locale === 'en'
        ? ['White', 'Blue']
        : locale === 'es'
          ? ['Blanco', 'Azul']
          : ['Белый', 'Синий'];
  }
}
