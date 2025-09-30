// backend/src/services/horoscope-generator.service.ts
// СТРОГОЕ РАЗДЕЛЕНИЕ: FREE = Интерпретатор, PREMIUM = AI
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EphemerisService } from './ephemeris.service';
import { AIService } from './ai.service';

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
  generatedBy: 'ai' | 'interpreter'; // Индикатор источника
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

    // Ищем натальную карту через Supabase (как в ChartService)
    let chartData: any = null;
    let foundVia = '';

    this.logger.log(`Looking for natal chart for user ${userId}`);

    try {
      // Сначала пытаемся через admin клиент
      this.logger.log('Trying admin client lookup...');
      const { data: charts, error: adminError } = await this.supabaseService.getUserChartsAdmin(userId);

      if (adminError) {
        this.logger.warn('Admin chart lookup error:', adminError.message);
      } else if (charts && charts.length > 0) {
        chartData = charts[0].data;
        foundVia = 'admin';
        this.logger.log(`Found chart via admin client, created: ${charts[0].created_at}`);
      }
    } catch (adminError) {
      this.logger.warn('Admin chart lookup failed:', adminError.message);
    }

    // Если не нашли через admin, пробуем обычный клиент
    if (!chartData) {
      try {
        this.logger.log('Trying regular client lookup...');
        const { data: charts, error: regularError } = await this.supabaseService.getUserCharts(userId);

        if (regularError) {
          this.logger.warn('Regular chart lookup error:', regularError.message);
        } else if (charts && charts.length > 0) {
          chartData = charts[0].data;
          foundVia = 'regular';
          this.logger.log(`Found chart via regular client, created: ${charts[0].created_at}`);
        }
      } catch (regularError) {
        this.logger.error('Regular chart lookup failed:', regularError.message);
      }
    }

    // Если карта не найдена через Supabase, пробуем через Prisma как fallback
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
          this.logger.log(`Found chart via Prisma fallback, created: ${chart.createdAt}`);
        }
      } catch (prismaError) {
        this.logger.error('Prisma lookup failed:', prismaError.message);
      }
    }

    if (!chartData) {
      this.logger.error(`No natal chart found for user ${userId} via any method`);
      throw new Error('Натальная карта не найдена');
    }

    this.logger.log(`Successfully found natal chart for user ${userId} via ${foundVia}`);

    try {
      const targetDate = this.getTargetDate(period);
      this.logger.log(`Target date for ${period}: ${targetDate.toISOString()}`);

      const transits = await this.getCurrentTransits(targetDate);
      this.logger.log(`Calculated transits for ${transits.planets ? Object.keys(transits.planets).length : 0} planets`);

      const transitAspects = this.analyzeTransitAspects(
        chartData.planets,
        transits.planets,
      );
      this.logger.log(`Found ${transitAspects.length} transit aspects`);

      // СТРОГОЕ РАЗДЕЛЕНИЕ
      if (isPremium) {
        // PREMIUM: ТОЛЬКО через AI
        return await this.generatePremiumHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
        );
      } else {
        // FREE: ТОЛЬКО через интерпретатор
        return this.generateFreeHoroscope(
          chartData,
          transits,
          transitAspects,
          period,
          targetDate,
        );
      }
    } catch (error) {
      this.logger.error(`Error during horoscope generation for user ${userId}:`, error);
      throw new Error(`Ошибка генерации гороскопа: ${error.message}`);
    }
  }

  /**
   * PREMIUM: Генерация через AI (Claude или OpenAI)
   * Если AI недоступен - ошибка, НЕ fallback на правила
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
      // Подготавливаем контекст для AI
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

      // Генерируем через AI (Claude или OpenAI)
      const aiPredictions = await this.aiService.generateHoroscope(aiContext);

      // Дополняем AI-предсказания расчетными данными
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
      // НЕТ fallback! Premium пользователь должен получить AI или ошибку
      throw new Error(
        `Не удалось сгенерировать PREMIUM гороскоп через AI: ${error.message}`,
      );
    }
  }

  /**
   * FREE: Генерация через интерпретатор (правила)
   * Базовые шаблонные предсказания
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

    const dominantTransit = this.getDominantTransit(transitAspects);
    const energy = this.calculateEnergy(transitAspects);
    const mood = this.determineMood(energy, transitAspects);

    const predictions = this.generateRuleBasedPredictions(
      sunSign,
      moonSign,
      dominantTransit,
      transitAspects,
      period,
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
      challenges: [], // FREE не получает детальных вызовов
      opportunities: [], // FREE не получает детальных возможностей
      generatedBy: 'interpreter',
    };
  }

  // Методы интерпретатора для FREE пользователей

  private generateRuleBasedPredictions(
    sunSign: string,
    moonSign: string,
    dominantTransit: any,
    transitAspects: any[],
    period: string,
  ): any {
    const timeFrame = this.getTimeFrame(period);

    return {
      general: this.generateGeneralPrediction(
        sunSign,
        dominantTransit,
        transitAspects,
        timeFrame,
      ),
      love: this.generateLovePrediction(
        sunSign,
        moonSign,
        transitAspects,
        timeFrame,
      ),
      career: this.generateCareerPrediction(sunSign, transitAspects, timeFrame),
      health: this.generateHealthPrediction(sunSign, transitAspects, timeFrame),
      finance: this.generateFinancePrediction(
        sunSign,
        transitAspects,
        timeFrame,
      ),
      advice: this.generateAdvice(sunSign, dominantTransit, timeFrame),
    };
  }

  private getTimeFrame(period: string): string {
    const frames = {
      day: 'Сегодня',
      tomorrow: 'Завтра',
      week: 'На этой неделе',
      month: 'В этом месяце',
    };
    return frames[period] || 'Сегодня';
  }

  private generateGeneralPrediction(
    sunSign: string,
    dominantTransit: any,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const tone = this.determinePredictionTone(transitAspects);

    const templates = {
      positive: [
        `${timeFrame} звезды благоволят вам. Энергия планет создает благоприятные возможности для действий.`,
        `${timeFrame} вы ощутите прилив сил. Используйте это время для важных начинаний.`,
      ],
      neutral: [
        `${timeFrame} принесет смешанные энергии. Сохраняйте баланс и следуйте интуиции.`,
        `${timeFrame} стабильный период. Фокусируйтесь на текущих задачах.`,
      ],
      challenging: [
        `${timeFrame} потребует терпения. Сложности — это возможность для роста.`,
        `${timeFrame} будьте внимательны к деталям. Осторожность поможет избежать проблем.`,
      ],
    };

    const pool = templates[tone];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private generateLovePrediction(
    sunSign: string,
    moonSign: string,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const venusAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'venus' || a.natalPlanet === 'venus',
    );

    if (venusAspects.length > 0) {
      const aspect = venusAspects[0];
      if (['trine', 'sextile', 'conjunction'].includes(aspect.aspect)) {
        return `${timeFrame} Венера создает гармоничные аспекты. Хорошее время для романтики и общения с близкими.`;
      } else {
        return `${timeFrame} Венера в напряженном аспекте. Проявите терпение в отношениях.`;
      }
    }

    return `${timeFrame} стабильный период в любви. Цените существующие отношения.`;
  }

  private generateCareerPrediction(
    sunSign: string,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const jupiterAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'jupiter',
    );
    const saturnAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'saturn',
    );

    if (jupiterAspects.length > 0) {
      return `${timeFrame} Юпитер открывает новые возможности в карьере. Время для инициативы.`;
    }

    if (saturnAspects.length > 0) {
      return `${timeFrame} Сатурн требует дисциплины. Сосредоточьтесь на долгосрочных целях.`;
    }

    return `${timeFrame} продолжайте работу над текущими проектами. Последовательность важна.`;
  }

  private generateHealthPrediction(
    sunSign: string,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );

    if (marsAspects.length > 0 && marsAspects[0].aspect === 'square') {
      return `${timeFrame} будьте внимательны к здоровью. Избегайте перегрузок и отдыхайте.`;
    }

    return `${timeFrame} ваша энергия на хорошем уровне. Поддерживайте активный образ жизни.`;
  }

  private generateFinancePrediction(
    sunSign: string,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const jupiterAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'jupiter',
    );

    if (
      jupiterAspects.length > 0 &&
      ['trine', 'sextile'].includes(jupiterAspects[0].aspect)
    ) {
      return `${timeFrame} Юпитер благоприятствует финансам. Рассмотрите новые возможности.`;
    }

    return `${timeFrame} финансовая ситуация стабильна. Придерживайтесь бюджета.`;
  }

  private generateAdvice(
    sunSign: string,
    dominantTransit: any,
    timeFrame: string,
  ): string {
    const advices = [
      `${timeFrame} доверяйте своей интуиции.`,
      `${timeFrame} будьте открыты новому опыту.`,
      `${timeFrame} практикуйте благодарность.`,
      `${timeFrame} фокусируйтесь на важном.`,
    ];

    return advices[Math.floor(Math.random() * advices.length)];
  }

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

  // Вспомогательные методы

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

  private async getCurrentTransits(date: Date): Promise<any> {
    const julianDay = this.ephemerisService.dateToJulianDay(date);
    const planets = await this.ephemerisService.calculatePlanets(julianDay);
    return { planets, date };
  }

  private analyzeTransitAspects(natalPlanets: any, transitPlanets: any): any[] {
    const aspects: any[] = [];

    for (const [natalKey, natalPlanet] of Object.entries(natalPlanets)) {
      for (const [transitKey, transitPlanet] of Object.entries(
        transitPlanets,
      )) {
        const aspect = this.calculateAspect(
          (natalPlanet as any).longitude,
          (transitPlanet as any).longitude,
        );

        if (aspect) {
          aspects.push({
            natalPlanet: natalKey,
            transitPlanet: transitKey,
            aspect: aspect.type,
            orb: aspect.orb,
            strength: aspect.strength,
          });
        }
      }
    }

    return aspects.sort((a, b) => b.strength - a.strength);
  }

  private calculateAspect(longitude1: number, longitude2: number): any | null {
    const diff = Math.abs(longitude1 - longitude2);
    const normalizedDiff = Math.min(diff, 360 - diff);

    const aspects = [
      { type: 'conjunction', angle: 0, orb: 8 },
      { type: 'sextile', angle: 60, orb: 6 },
      { type: 'square', angle: 90, orb: 8 },
      { type: 'trine', angle: 120, orb: 8 },
      { type: 'opposition', angle: 180, orb: 8 },
    ];

    for (const aspect of aspects) {
      const orb = Math.abs(normalizedDiff - aspect.angle);
      if (orb <= aspect.orb) {
        return {
          type: aspect.type,
          orb: orb,
          strength: 1 - orb / aspect.orb,
        };
      }
    }

    return null;
  }

  private getDominantTransit(transitAspects: any[]): any {
    return transitAspects.length > 0 ? transitAspects[0] : null;
  }

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
    });

    return Math.min(100, Math.max(0, Math.round(energy)));
  }

  private determineMood(energy: number, transitAspects: any[]): string {
    if (energy > 80) return 'Радостное и вдохновленное';
    if (energy > 60) return 'Позитивное и активное';
    if (energy > 40) return 'Сбалансированное';
    if (energy > 20) return 'Задумчивое';
    return 'Спокойное';
  }

  private generateLuckyNumbers(chartData: any, date: Date): number[] {
    const seed = date.getDate() + date.getMonth() * 31;
    const numbers: number[] = [];

    for (let i = 0; i < 5; i++) {
      numbers.push(((seed * (i + 1) * 7) % 90) + 1);
    }

    return [...new Set(numbers)].slice(0, 5);
  }

  private generateLuckyColors(sunSign: string, dominantTransit: any): string[] {
    const signColors: { [key: string]: string[] } = {
      Aries: ['Красный', 'Оранжевый'],
      Taurus: ['Зеленый', 'Розовый'],
      Gemini: ['Желтый', 'Голубой'],
      Cancer: ['Серебряный', 'Белый'],
      Leo: ['Золотой', 'Оранжевый'],
      Virgo: ['Коричневый', 'Бежевый'],
      Libra: ['Розовый', 'Голубой'],
      Scorpio: ['Бордовый', 'Черный'],
      Sagittarius: ['Фиолетовый', 'Синий'],
      Capricorn: ['Серый', 'Зеленый'],
      Aquarius: ['Голубой', 'Серебряный'],
      Pisces: ['Бирюзовый', 'Лавандовый'],
    };

    return signColors[sunSign] || ['Белый', 'Синий'];
  }
}
