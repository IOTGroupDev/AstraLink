// backend/src/services/horoscope-generator.service.ts
// СТРОГОЕ РАЗДЕЛЕНИЕ: FREE = Интерпретатор, PREMIUM = AI
import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EphemerisService } from './ephemeris.service';
import { AIService } from './ai.service';
import { RedisService } from '../redis/redis.service';
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
  HoroscopeContext,
  DominantTransit,
  EnergyMetrics,
  ChartLookupResult,
  TransitData,
  AspectCalculationResult,
  RuleBasedPredictions,
  TransitPlanet,
} from './horoscope.types';
import type { Planet, House } from '../dating/dating.types';

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
  generatedBy: 'ai' | 'interpreter';
}

@Injectable()
export class HoroscopeGeneratorService {
  private readonly logger = new Logger(HoroscopeGeneratorService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
    private ephemerisService: EphemerisService,
    private aiService: AIService,
    private redis: RedisService,
  ) {}

  /**
   * Find user chart via multiple fallback methods
   */
  private async findUserChart(userId: string): Promise<ChartLookupResult> {
    this.logger.log(`Looking for natal chart for user ${userId}`);

    // Try admin client
    try {
      this.logger.log('Trying admin client lookup...');
      const { data: charts, error: adminError } =
        await this.supabaseService.getUserChartsAdmin(userId);

      if (!adminError && charts && charts.length > 0) {
        this.logger.log(
          `Found chart via admin client, created: ${charts[0].created_at?.toString() || 'unknown'}`,
        );
        return {
          chartData: charts[0].data as ChartData,
          foundVia: 'admin',
        };
      }
      if (adminError) {
        this.logger.warn('Admin chart lookup error:', adminError.message);
      }
    } catch (adminError) {
      const errorMessage =
        adminError instanceof Error ? adminError.message : 'Unknown error';
      this.logger.warn('Admin chart lookup failed:', errorMessage);
    }

    // Try regular client
    try {
      this.logger.log('Trying regular client lookup...');
      const { data: charts, error: regularError } =
        await this.supabaseService.getUserCharts(userId);

      if (!regularError && charts && charts.length > 0) {
        this.logger.log(
          `Found chart via regular client, created: ${charts[0].created_at?.toString() || 'unknown'}`,
        );
        return {
          chartData: charts[0].data as ChartData,
          foundVia: 'regular',
        };
      }
      if (regularError) {
        this.logger.warn('Regular chart lookup error:', regularError.message);
      }
    } catch (regularError) {
      const errorMessage =
        regularError instanceof Error ? regularError.message : 'Unknown error';
      this.logger.error('Regular chart lookup failed:', errorMessage);
    }

    // Try Prisma fallback
    try {
      this.logger.log('Trying Prisma fallback for chart lookup');
      const chart = await this.prisma.chart.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      if (chart) {
        this.logger.log(
          `Found chart via Prisma fallback, created: ${chart.createdAt?.toString() || 'unknown'}`,
        );
        return {
          chartData: chart.data as unknown as ChartData,
          foundVia: 'prisma',
        };
      }
    } catch (prismaError) {
      const errorMessage =
        prismaError instanceof Error ? prismaError.message : 'Unknown error';
      this.logger.error('Prisma lookup failed:', errorMessage);
    }

    return { chartData: null, foundVia: 'none' };
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
  ): Promise<HoroscopePrediction> {
    this.logger.log(
      `Генерация гороскопа для ${userId}, период: ${period}, premium: ${isPremium}`,
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
      const targetDate = this.getTargetDate(period);
      this.logger.log(`Target date for ${period}: ${targetDate.toISOString()}`);

      // Redis caching: key per userId + period + date bucket
      const dateKey = (() => {
        const d = new Date(targetDate);
        if (period === 'month') {
          return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        }
        if (period === 'week') {
          const tmp = new Date(
            Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
          );
          const day = (tmp.getUTCDay() + 6) % 7; // Monday=0
          tmp.setUTCDate(tmp.getUTCDate() - day); // start of week (Mon)
          return tmp.toISOString().split('T')[0];
        }
        // day/tomorrow => cache per UTC date
        return new Date(
          Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
        )
          .toISOString()
          .split('T')[0];
      })();
      const cacheKey = `horoscope:${userId}:${period}:${dateKey}`;
      const ttlSec = (() => {
        const now = new Date();
        const nd = new Date(targetDate);
        let end: Date;
        if (period === 'month') {
          end = new Date(
            Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth() + 1, 1, 0, 0, 0),
          );
        } else if (period === 'week') {
          const tmp = new Date(
            Date.UTC(nd.getUTCFullYear(), nd.getUTCMonth(), nd.getUTCDate()),
          );
          const day = (tmp.getUTCDay() + 6) % 7;
          tmp.setUTCDate(tmp.getUTCDate() + (7 - day)); // start of next week (Mon 00:00 UTC)
          end = new Date(
            Date.UTC(
              tmp.getUTCFullYear(),
              tmp.getUTCMonth(),
              tmp.getUTCDate(),
              0,
              0,
              0,
            ),
          );
        } else {
          // day/tomorrow => end of that UTC day
          end = new Date(
            Date.UTC(
              nd.getUTCFullYear(),
              nd.getUTCMonth(),
              nd.getUTCDate() + 1,
              0,
              0,
              0,
            ),
          );
        }
        const sec = Math.max(
          60,
          Math.floor((end.getTime() - now.getTime()) / 1000),
        );
        return sec;
      })();

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
      if (isPremium) {
        result = await this.generatePremiumHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
          cacheKey,
          ttlSec,
        );
      } else {
        result = this.generateFreeHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
          cacheKey,
          ttlSec,
        );
      }
      // cache result until end of period bucket
      await this.redis.set(cacheKey, result, ttlSec);
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
    _cacheKey: string,
    _ttlSec: number,
  ): Promise<HoroscopePrediction> {
    this.logger.log('💎 PREMIUM: Генерация через AI');

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
      };

      const aiPredictions = await this.aiService.generateHoroscope(aiContext);

      const energy = this.calculateEnergy(transitAspects);
      const mood = this.determineMood(energy, transitAspects);
      const luckyNumbers = this.generateLuckyNumbers(chartData, targetDate);
      const luckyColors = this.generateLuckyColors(sunSign, transitAspects[0]);

      const result: HoroscopePrediction = {
        period: period as 'day' | 'tomorrow' | 'week' | 'month',
        date: targetDate.toISOString(),
        general: aiPredictions.general,
        love: aiPredictions.love,
        career: aiPredictions.career,
        health: aiPredictions.health,
        finance: aiPredictions.finance,
        advice: aiPredictions.advice,
        luckyNumbers,
        luckyColors,
        energy,
        mood,
        challenges: aiPredictions.challenges || [],
        opportunities: aiPredictions.opportunities || [],
        generatedBy: 'ai',
      };
      return result;
    } catch (error) {
      this.logger.error('❌ Ошибка AI-генерации для PREMIUM:', error);
      this.logger.log('Fallback to interpreter (FREE rules) with real data');
      // Fallback на интерпретатор с реальными расчетами (без generic-моков)
      const dominantTransit = this.getDominantTransit(
        transitAspects,
        'general',
      );
      const energy = this.calculateEnergy(transitAspects);
      const mood = this.determineMood(energy, transitAspects);
      const predictions = this.generateRuleBasedPredictions(
        chartData.planets?.sun?.sign || 'Aries',
        chartData.planets?.moon?.sign || 'Cancer',
        dominantTransit,
        transitAspects,
        period,
        targetDate,
        chartData,
      );
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
        luckyColors: this.generateLuckyColors(
          chartData.planets?.sun?.sign || 'Aries',
          dominantTransit,
        ),
        energy,
        mood,
        challenges: [],
        opportunities: [],
        generatedBy: 'interpreter',
      };
      return result;
    }
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
  ): HoroscopePrediction {
    this.logger.log('🆓 FREE: Генерация через интерпретатор (правила)');

    const sunSign = chartData.planets?.sun?.sign || 'Aries';
    const moonSign = chartData.planets?.moon?.sign || 'Cancer';

    const dominantTransit = this.getDominantTransit(transitAspects, 'general');
    const energy = this.calculateEnergy(transitAspects);
    const mood = this.determineMood(energy, transitAspects);

    const predictions = this.generateRuleBasedPredictions(
      sunSign,
      moonSign,
      dominantTransit,
      transitAspects,
      period,
      targetDate,
      chartData,
    );

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
      luckyColors: this.generateLuckyColors(sunSign, dominantTransit),
      energy,
      mood,
      challenges: [],
      opportunities: [],
      generatedBy: 'interpreter',
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
  ): RuleBasedPredictions {
    const timeFrame = this.getTimeFrame(period);

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
      ),
      love: this.generateLovePrediction(
        sunSign,
        moonSign,
        transitAspects,
        timeFrame,
        domLove,
      ),
      career: this.generateCareerPrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domCareer,
      ),
      health: this.generateHealthPrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domHealth,
      ),
      finance: this.generateFinancePrediction(
        sunSign,
        transitAspects,
        timeFrame,
        domFinance,
      ),
      advice: this.generateAdvice(
        sunSign,
        dominantTransit,
        timeFrame,
        targetDate,
        chartData,
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
  ): string {
    const tone = this.determinePredictionTone(transitAspects);
    const templates = getGeneralTemplates(
      timeFrame as import('../modules/shared/types').PeriodFrame,
      'ru',
    ) as Record<string, string[]>;
    const pool = templates[tone] || templates['neutral'] || [];
    if (!pool.length) {
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
      txt = this.appendTransitWindow(txt, dominantTransit, timeFrame);
    }
    return txt;
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
  ): string {
    const venusAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'venus' || a.natalPlanet === 'venus',
    );

    try {
      const phrases = getLovePhrases(
        timeFrame as import('../modules/shared/types').PeriodFrame,
        'ru',
      ) as Record<string, string>;

      if (venusAspects.length > 0) {
        const aspect = venusAspects[0];
        const base = ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
          ? `${timeFrame} Венера ${phrases.positive}. Хорошее время для романтики и общения с близкими.`
          : `${timeFrame} Венера ${phrases.negative}. Проявите терпение в отношениях.`;

        // Добавим фокус по дому (если известен)
        if (dominantTransit?.house) {
          try {
            const focus = getPlanetHouseFocus(
              (dominantTransit?.transitPlanet || 'venus') as PlanetKey,
              dominantTransit.house,
              'ru',
            );
            return `${base} ${focus}`;
          } catch {
            return base;
          }
        }
        return base;
      }

      // Нет явных Венерианских транзитов — нейтральный тон + опциональный фокус дома
      const neutralText = `${timeFrame} энергии ${phrases.neutral}. Цените существующие отношения.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'venus') as PlanetKey,
            dominantTransit.house,
            'ru',
          );
          return `${neutralText} ${focus}`;
        } catch {
          return neutralText;
        }
      }
      return neutralText;
    } catch {
      if (venusAspects.length > 0) {
        const aspect = venusAspects[0];
        if (['trine', 'sextile', 'conjunction'].includes(aspect.aspect)) {
          return `${timeFrame} Венера создает романтическую атмосферу. Хорошее время для романтики и общения с близкими.`;
        } else {
          return `${timeFrame} Венера создает напряжение. Проявите терпение в отношениях.`;
        }
      }
      return `${timeFrame} энергии влияет на ваши эмоции. Цените существующие отношения.`;
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
      const actions = getCareerActions(
        timeFrame as import('../modules/shared/types').PeriodFrame,
        'ru',
      ) as Record<string, string>;

      if (jupiterAspects.length > 0) {
        return `${timeFrame} Юпитер ${actions.jupiter} карьерных инициатив. Время для смелых решений.`;
      }

      if (marsAspects.length > 0) {
        if (['trine', 'sextile'].includes(marsAspects[0].aspect)) {
          return `${timeFrame} Марс ${actions.mars} активных действий в работе. Используйте свою энергию конструктивно.`;
        }
      }

      if (saturnAspects.length > 0) {
        const base = `${timeFrame} Сатурн ${actions.saturn} дисциплина и ответственность. Сосредоточьтесь на долгосрочных целях.`;
        if (dominantTransit?.house) {
          try {
            const focus = getPlanetHouseFocus(
              (dominantTransit?.transitPlanet || 'saturn') as PlanetKey,
              dominantTransit.house,
              'ru',
            );
            return `${base} ${focus}`;
          } catch {
            return `${base}`;
          }
        }
        return base;
      }

      const neutralText = `${timeFrame} ${actions.neutral} текущими проектами. Последовательность важна.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'saturn') as PlanetKey,
            dominantTransit.house,
            'ru',
          );
          return `${neutralText} ${focus}`;
        } catch {
          return neutralText;
        }
      }
      return neutralText;
    } catch {
      if (jupiterAspects.length > 0) {
        return `${timeFrame} Юпитер благоприятен для карьерных инициатив. Время для смелых решений.`;
      }
      if (
        marsAspects.length > 0 &&
        ['trine', 'sextile'].includes(marsAspects[0].aspect)
      ) {
        return `${timeFrame} Марс добавляет энергии для активных действий в работе. Используйте её конструктивно.`;
      }
      if (saturnAspects.length > 0) {
        return `${timeFrame} Сатурн требует дисциплины и ответственности. Сосредоточьтесь на долгосрочных целях.`;
      }
      return `${timeFrame} продолжайте работу над текущими проектами. Последовательность важна.`;
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
  ): string {
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );

    if (marsAspects.length > 0 && marsAspects[0].aspect === 'square') {
      const base = `${timeFrame} будьте внимательны к здоровью. Избегайте перегрузок и отдыхайте.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'mars') as PlanetKey,
            dominantTransit.house,
            'ru',
          );
          return `${base} ${focus}`;
        } catch {
          return base;
        }
      }
      return base;
    }

    const ok = `${timeFrame} ваша энергия на хорошем уровне. Поддерживайте активный образ жизни.`;
    if (dominantTransit?.house) {
      try {
        const focus = getPlanetHouseFocus(
          (dominantTransit?.transitPlanet || 'mars') as PlanetKey,
          dominantTransit.house,
          'ru',
        );
        return `${ok} ${focus}`;
      } catch {
        return ok;
      }
    }
    return ok;
  }

  /**
   * Генерация финансового прогноза
   */
  private generateFinancePrediction(
    sunSign: string,
    transitAspects: TransitAspect[],
    timeFrame: string,
    dominantTransit?: TransitAspect | null,
  ): string {
    const jupiterAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'jupiter',
    );

    if (
      jupiterAspects.length > 0 &&
      ['trine', 'sextile'].includes(jupiterAspects[0].aspect)
    ) {
      const base = `${timeFrame} Юпитер благоприятствует финансам. Рассмотрите новые возможности.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            (dominantTransit?.transitPlanet || 'jupiter') as PlanetKey,
            dominantTransit.house,
            'ru',
          );
          return `${base} ${focus}`;
        } catch {
          return base;
        }
      }
      return base;
    }

    const neutralText = `${timeFrame} финансовая ситуация стабильна. Придерживайтесь бюджета.`;
    if (dominantTransit?.house) {
      try {
        const focus = getPlanetHouseFocus(
          (dominantTransit?.transitPlanet || 'jupiter') as PlanetKey,
          dominantTransit.house,
          'ru',
        );
        return `${neutralText} ${focus}`;
      } catch {
        return neutralText;
      }
    }
    return neutralText;
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
  ): string {
    const advices = getAdvicePool(
      timeFrame as import('../modules/shared/types').PeriodFrame,
      'ru',
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
        : 'Сохраняйте баланс и действуйте последовательно.';

    // Жизненные циклы (Сатурн, Юпитер, Узлы, Хирон)
    const cycles = this.getLifeCycles(chartData, targetDate);
    let text = basePick;
    if (cycles.length) {
      text = `${text} Циклы: ${cycles.join(', ')}.`;
    }

    // Окно влияния доминирующего транзита
    text = this.appendTransitWindow(text, dominantTransit, timeFrame);

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

  /**
   * Получение временного фрейма
   */
  private getTimeFrame(period: string): string {
    const frames: Record<string, string> = {
      day: 'Сегодня',
      tomorrow: 'Завтра',
      week: 'На этой неделе',
      month: 'В этом месяце',
    };
    return frames[period] || 'Сегодня';
  }

  /**
   * Получение целевой даты для периода
   */
  private getTargetDate(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'tomorrow':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
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
  ): string {
    if (energy > 80) return 'Радостное и вдохновленное';
    if (energy > 60) return 'Позитивное и активное';
    if (energy > 40) return 'Сбалансированное';
    if (energy > 20) return 'Задумчивое';
    return 'Спокойное';
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
  ): string {
    try {
      if (!dominantTransit) return text;
      const days = this.estimateTransitDurationDays(dominantTransit);
      const suffix =
        timeFrame === 'Сегодня' || timeFrame === 'Завтра'
          ? ` Окно ~${days} дн.`
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
  private getLifeCycles(chartData: ChartData, targetDate: Date): string[] {
    const cycles: string[] = [];
    try {
      // Try to get birthDate from chartData extended properties
      const chartDataAny = chartData as Record<string, unknown>;
      const bdISO =
        (chartDataAny?.birthDate as string | undefined) ??
        ((chartDataAny?.data as Record<string, unknown>)?.birthDate as
          | string
          | undefined) ??
        ((chartDataAny?.meta as Record<string, unknown>)?.birthDate as
          | string
          | undefined);

      if (typeof bdISO !== 'string' || bdISO.trim() === '') return cycles;

      const birth = new Date(bdISO);
      if (isNaN(birth.getTime())) return cycles;

      const age =
        (targetDate.getTime() - birth.getTime()) /
        (365.2425 * 24 * 3600 * 1000);
      const near = (val: number, center: number, tol: number) =>
        Math.abs(val - center) <= tol;

      if (near(age, 29.5, 1.5) || near(age, 58.6, 1.5)) {
        cycles.push('Сатурново возвращение');
      }
      if (
        near(age, 12.0, 1.0) ||
        near(age, 24.0, 1.0) ||
        near(age, 36.0, 1.0) ||
        near(age, 48.0, 1.0)
      ) {
        cycles.push('Возвращение Юпитера');
      }
      if (near(age, 18.6, 1.0) || near(age, 37.2, 1.0)) {
        cycles.push('Возврат Лунных Узлов');
      }
      if (near(age, 9.3, 0.8) || near(age, 27.9, 0.8)) {
        cycles.push('Инверсия Лунных Узлов');
      }
      if (near(age, 50.9, 2.0)) {
        cycles.push('Возвращение Хирона');
      }
    } catch {
      // ignore
    }
    return Array.from(new Set(cycles)).slice(0, 3);
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
  ): string[] {
    const colors = getSignColors(
      sunSign as import('../modules/shared/types').Sign,
      'ru',
    ) as string[] | undefined;
    return colors && colors.length ? colors : ['Белый', 'Синий'];
  }
}
