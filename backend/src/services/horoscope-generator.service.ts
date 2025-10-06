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
import { PlanetKey, PLANET_WEIGHTS } from '@/modules/shared/types';
import {
  getTransitOrb,
  getHouseForLongitude,
  hashSignature,
} from '@/modules/shared/utils';
import {
  getGeneralTemplates,
  getLovePhrases,
  getCareerActions,
  getAdvicePool,
  getSignColors,
  getPlanetHouseFocus,
} from '@/modules/shared/astro-text';

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
  ) {}

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
    let chartData: any = null;
    let foundVia = '';

    this.logger.log(`Looking for natal chart for user ${userId}`);

    try {
      this.logger.log('Trying admin client lookup...');
      const { data: charts, error: adminError } =
        await this.supabaseService.getUserChartsAdmin(userId);

      if (adminError) {
        this.logger.warn('Admin chart lookup error:', adminError.message);
      } else if (charts && charts.length > 0) {
        chartData = charts[0].data;
        foundVia = 'admin';
        this.logger.log(
          `Found chart via admin client, created: ${charts[0].created_at?.toString() || 'unknown'}`,
        );
      }
    } catch (adminError) {
      const errorMessage =
        adminError instanceof Error ? adminError.message : 'Unknown error';
      this.logger.warn('Admin chart lookup failed:', errorMessage);
    }

    if (!chartData) {
      try {
        this.logger.log('Trying regular client lookup...');
        const { data: charts, error: regularError } =
          await this.supabaseService.getUserCharts(userId);

        if (regularError) {
          this.logger.warn('Regular chart lookup error:', regularError.message);
        } else if (charts && charts.length > 0) {
          chartData = charts[0].data;
          foundVia = 'regular';
          this.logger.log(
            `Found chart via regular client, created: ${charts[0].created_at?.toString() || 'unknown'}`,
          );
        }
      } catch (regularError) {
        const errorMessage =
          regularError instanceof Error
            ? regularError.message
            : 'Unknown error';
        this.logger.error('Regular chart lookup failed:', errorMessage);
      }
    }

    if (!chartData) {
      this.logger.log('Trying Prisma fallback for chart lookup');
      try {
        const chart = await this.prisma.chart.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (chart) {
          chartData = chart.data as any;
          foundVia = 'prisma';
          this.logger.log(
            `Found chart via Prisma fallback, created: ${chart.createdAt?.toString() || 'unknown'}`,
          );
        }
      } catch (prismaError) {
        const errorMessage =
          prismaError instanceof Error ? prismaError.message : 'Unknown error';
        this.logger.error('Prisma lookup failed:', errorMessage);
      }
    }

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

      let transits: any;
      let transitAspects: any[] = [];

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

      if (isPremium) {
        return await this.generatePremiumHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
        );
      } else {
        return this.generateFreeHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
        );
      }
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
    chartData: any,
    transits: any,
    transitAspects: any[],
    period: string,
    targetDate: Date,
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

      return {
        period: period as any,
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
      );
      return {
        period: period as any,
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
    }
  }

  /**
   * FREE: Генерация через интерпретатор (правила)
   */
  private generateFreeHoroscope(
    chartData: any,
    transits: any,
    transitAspects: any[],
    period: string,
    targetDate: Date,
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
    );

    return {
      period: period as any,
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
  }

  /**
   * Генерация предсказаний на основе правил
   */
  private generateRuleBasedPredictions(
    sunSign: string,
    moonSign: string,
    dominantTransit: any,
    transitAspects: any[],
    period: string,
    targetDate: Date,
  ): any {
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
      ),
    };
  }

  /**
   * УЛУЧШЕННАЯ генерация общего прогноза с учетом периода
   */
  private generateGeneralPrediction(
    sunSign: string,
    dominantTransit: any,
    transitAspects: any[],
    timeFrame: string,
    _targetDate: Date,
  ): string {
    const tone = this.determinePredictionTone(transitAspects);
    const templates = getGeneralTemplates(timeFrame as any, 'ru');
    const pool =
      (templates as any)[tone] || (templates as any)['neutral'] || [];
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
    return pool[index];
  }

  /**
   * УЛУЧШЕННАЯ генерация прогноза для любви
   */
  private generateLovePrediction(
    sunSign: string,
    moonSign: string,
    transitAspects: any[],
    timeFrame: string,
    dominantTransit?: any,
  ): string {
    const venusAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'venus' || a.natalPlanet === 'venus',
    );

    try {
      const phrases = getLovePhrases(timeFrame as any, 'ru');

      if (venusAspects.length > 0) {
        const aspect = venusAspects[0];
        const base = ['trine', 'sextile', 'conjunction'].includes(aspect.aspect)
          ? `${timeFrame} Венера ${phrases.positive}. Хорошее время для романтики и общения с близкими.`
          : `${timeFrame} Венера ${phrases.negative}. Проявите терпение в отношениях.`;

        // Добавим фокус по дому (если известен)
        if (dominantTransit?.house) {
          try {
            const focus = getPlanetHouseFocus(
              dominantTransit?.transitPlanet || 'venus',
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
            dominantTransit?.transitPlanet || 'venus',
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
    transitAspects: any[],
    timeFrame: string,
    dominantTransit?: any,
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
      const actions = getCareerActions(timeFrame as any, 'ru');

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
              dominantTransit?.transitPlanet || 'saturn',
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
            dominantTransit?.transitPlanet || 'saturn',
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
    transitAspects: any[],
    timeFrame: string,
    dominantTransit?: any,
  ): string {
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );

    if (marsAspects.length > 0 && marsAspects[0].aspect === 'square') {
      const base = `${timeFrame} будьте внимательны к здоровью. Избегайте перегрузок и отдыхайте.`;
      if (dominantTransit?.house) {
        try {
          const focus = getPlanetHouseFocus(
            dominantTransit?.transitPlanet || 'mars',
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
          dominantTransit?.transitPlanet || 'mars',
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
    transitAspects: any[],
    timeFrame: string,
    dominantTransit?: any,
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
            dominantTransit?.transitPlanet || 'jupiter',
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
          dominantTransit?.transitPlanet || 'jupiter',
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
    dominantTransit: any,
    timeFrame: string,
    _targetDate: Date,
  ): string {
    const advices = getAdvicePool(timeFrame as any, 'ru') || [];
    if (!advices.length) {
      return 'Сохраняйте баланс и действуйте последовательно.';
    }
    // Детерминированный выбор по сигнатуре (без привязки к дате)
    const sig = [
      timeFrame,
      sunSign,
      dominantTransit?.transitPlanet || '-',
      dominantTransit?.aspect || '-',
      dominantTransit?.natalPlanet || '-',
      dominantTransit?.house || 0,
      dominantTransit?.isRetrograde ? 1 : 0,
    ];
    const index = Math.abs(hashSignature(sig)) % advices.length;
    return advices[index];
  }

  /**
   * Определение тональности прогноза
   */
  private determinePredictionTone(
    transitAspects: any[],
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
    const frames = {
      day: 'Сегодня',
      tomorrow: 'Завтра',
      week: 'На этой неделе',
      month: 'В этом месяце',
    };
    return (frames as any)[period] || 'Сегодня';
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
  private async getCurrentTransits(date: Date): Promise<any> {
    const julianDay = this.ephemerisService.dateToJulianDay(date);
    const planets = await this.ephemerisService.calculatePlanets(julianDay);
    return { planets, date };
  }

  /**
   * Анализ транзитных аспектов
   */
  private analyzeTransitAspects(
    natalPlanets: any,
    transitPlanets: any,
    natalHouses?: any,
  ): any[] {
    const aspects: any[] = [];

    for (const [natalKey, natalPlanet] of Object.entries(natalPlanets)) {
      for (const [transitKey, transitPlanet] of Object.entries(
        transitPlanets,
      )) {
        const aspect = this.calculateAspect(
          (natalPlanet as any).longitude,
          (transitPlanet as any).longitude,
          transitKey as PlanetKey,
        );

        if (aspect) {
          const house = natalHouses
            ? getHouseForLongitude(
                (transitPlanet as any).longitude,
                natalHouses,
              )
            : undefined;
          const isRetrograde = (transitPlanet as any).isRetrograde === true;

          aspects.push({
            natalPlanet: natalKey,
            transitPlanet: transitKey,
            aspect: aspect.type,
            orb: aspect.orb,
            strength: aspect.strength,
            house,
            isRetrograde,
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
  ): any | null {
    const diff = Math.abs(longitudeNatal - longitudeTransit);
    const normalizedDiff = Math.min(diff, 360 - diff);

    // Базовые углы аспектов
    const aspects = [
      { type: 'conjunction', angle: 0 },
      { type: 'sextile', angle: 60 },
      { type: 'square', angle: 90 },
      { type: 'trine', angle: 120 },
      { type: 'opposition', angle: 180 },
    ] as const;

    // Орбис: если указан транзитный объект — узкий по планете, иначе дефолт
    const defaultOrbs: Record<string, number> = {
      conjunction: 8,
      sextile: 6,
      square: 8,
      trine: 8,
      opposition: 8,
    };

    for (const aspect of aspects) {
      const orbDelta = Math.abs(normalizedDiff - aspect.angle);
      const baseOrb =
        transitPlanet != null
          ? getTransitOrb(transitPlanet, aspect.type as any)
          : (defaultOrbs as any)[aspect.type];

      if (orbDelta <= baseOrb) {
        return {
          type: aspect.type,
          orb: orbDelta,
          strength: 1 - orbDelta / baseOrb,
        };
      }
    }

    return null;
  }

  /**
   * Доминирующий транзит с учётом веса планеты, силы аспекта и бонуса за релевантный дом домена.
   * domain: 'love' | 'career' | 'health' | 'finance' | 'general'
   */
  private getDominantTransit(transitAspects: any[], domain?: string): any {
    if (!transitAspects || transitAspects.length === 0) return null;

    const domainHouses: Record<string, number[]> = {
      love: [5, 7],
      career: [10],
      health: [6],
      finance: [2, 8],
      general: [],
    };

    let best: any = null;
    let bestScore = -Infinity;

    for (const a of transitAspects) {
      const weight =
        PLANET_WEIGHTS[(a.transitPlanet || 'sun') as PlanetKey] || 1;
      let score = weight * (a.strength || 0);

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
  private calculateEnergy(transitAspects: any[]): number {
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
  private determineMood(energy: number, transitAspects: any[]): string {
    if (energy > 80) return 'Радостное и вдохновленное';
    if (energy > 60) return 'Позитивное и активное';
    if (energy > 40) return 'Сбалансированное';
    if (energy > 20) return 'Задумчивое';
    return 'Спокойное';
  }

  /**
   * Генерация счастливых чисел
   */
  private generateLuckyNumbers(chartData: any, date: Date): number[] {
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
  private generateLuckyColors(sunSign: string, dominantTransit: any): string[] {
    const colors = getSignColors(sunSign as any, 'ru');
    return colors && colors.length ? colors : ['Белый', 'Синий'];
  }
}
