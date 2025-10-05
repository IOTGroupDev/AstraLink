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
      return this.generateGenericHoroscope(period, isPremium);
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
        );
        this.logger.log(`Found ${transitAspects.length} transit aspects`);
      } catch (ephemerisError) {
        const errorMessage =
          ephemerisError instanceof Error
            ? ephemerisError.message
            : 'Unknown error';
        this.logger.warn(
          `Ephemeris calculation failed, using simplified transits: ${errorMessage}`,
        );
        transits = { planets: {}, date: targetDate };
        transitAspects = [];
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
        `Falling back to generic horoscope due to error: ${errorMessage}`,
      );
      return this.generateGenericHoroscope(period, isPremium);
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
      this.logger.log(
        'Falling back to generic horoscope for premium user due to AI error',
      );
      return this.generateGenericHoroscope(period as any, true);
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

  /**
   * УЛУЧШЕННАЯ генерация общего прогноза с учетом периода
   */
  private generateGeneralPrediction(
    sunSign: string,
    dominantTransit: any,
    transitAspects: any[],
    timeFrame: string,
  ): string {
    const tone = this.determinePredictionTone(transitAspects);

    const periodSpecific = {
      Сегодня: {
        positive: [
          `${timeFrame} звезды благоволят вам. Энергия планет создает благоприятные возможности для действий.`,
          `${timeFrame} вы ощутите прилив сил. Используйте это время для важных начинаний.`,
          `${timeFrame} особенно благоприятный день. Космические энергии поддерживают ваши стремления.`,
          `${timeFrame} планеты создают гармоничную конфигурацию. Идеальное время для реализации планов.`,
        ],
        neutral: [
          `${timeFrame} принесет смешанные энергии. Сохраняйте баланс и следуйте интуиции.`,
          `${timeFrame} стабильный период. Фокусируйтесь на текущих задачах.`,
          `${timeFrame} требует внимательности. Прислушивайтесь к своим ощущениям.`,
        ],
        challenging: [
          `${timeFrame} потребует терпения. Сложности — это возможность для роста.`,
          `${timeFrame} будьте внимательны к деталям. Осторожность поможет избежать проблем.`,
          `${timeFrame} звезды испытывают вашу стойкость. Сохраняйте спокойствие.`,
        ],
      },
      Завтра: {
        positive: [
          `${timeFrame} откроются новые перспективы. Планеты готовят приятные сюрпризы.`,
          `${timeFrame} будет насыщенным положительными событиями. Космос благоволит вашим начинаниям.`,
          `${timeFrame} принесет вдохновение и энергию для свершений.`,
          `${timeFrame} ожидается благоприятная астрологическая конфигурация.`,
        ],
        neutral: [
          `${timeFrame} сохранится текущая динамика. Продолжайте движение в выбранном направлении.`,
          `${timeFrame} будет промежуточным этапом. Готовьтесь к будущим изменениям.`,
          `${timeFrame} планеты займут нейтральные позиции. Время для планирования.`,
        ],
        challenging: [
          `${timeFrame} могут возникнуть препятствия. Будьте готовы к непредвиденным ситуациям.`,
          `${timeFrame} потребует дополнительных усилий. Не сдавайтесь перед трудностями.`,
          `${timeFrame} звезды предупреждают о возможных сложностях. Проявите осмотрительность.`,
        ],
      },
      'На этой неделе': {
        positive: [
          `${timeFrame} складывается благоприятная астрологическая ситуация для достижения целей.`,
          `${timeFrame} энергии планет будут способствовать вашему успеху в различных сферах.`,
          `${timeFrame} открываются широкие возможности. Используйте это время максимально эффективно.`,
          `${timeFrame} космические влияния создают идеальные условия для прогресса.`,
        ],
        neutral: [
          `${timeFrame} характеризуется стабильными энергиями. Действуйте последовательно.`,
          `${timeFrame} планеты занимают нейтральные позиции. Сосредоточьтесь на приоритетах.`,
          `${timeFrame} будет периодом умеренной активности. Распределяйте силы разумно.`,
        ],
        challenging: [
          `${timeFrame} может принести испытания. Воспринимайте их как уроки роста.`,
          `${timeFrame} потребует от вас гибкости и терпения. Не форсируйте события.`,
          `${timeFrame} звезды предупреждают о необходимости осторожности в действиях.`,
        ],
      },
      'В этом месяце': {
        positive: [
          `${timeFrame} формируется благоприятный астрологический климат для долгосрочных проектов.`,
          `${timeFrame} планеты создают мощную поддержку ваших устремлений и начинаний.`,
          `${timeFrame} открывается период больших возможностей и позитивных перемен.`,
          `${timeFrame} космические энергии будут способствовать реализации ваших планов.`,
        ],
        neutral: [
          `${timeFrame} характеризуется плавным течением событий. Сохраняйте стабильный темп.`,
          `${timeFrame} планеты создают сбалансированную ситуацию. Действуйте взвешенно.`,
          `${timeFrame} будет периодом постепенного развития. Терпение принесет результаты.`,
        ],
        challenging: [
          `${timeFrame} может быть непростым. Относитесь к трудностям как к возможностям.`,
          `${timeFrame} потребует максимальной концентрации и усилий. Не теряйте веры в себя.`,
          `${timeFrame} звезды испытывают вашу выдержку. Сохраняйте оптимизм и настойчивость.`,
        ],
      },
    };

    const templates =
      (periodSpecific as any)[timeFrame] || periodSpecific['Сегодня'];
    const pool = templates[tone] || templates['neutral'];

    const index =
      Math.abs(new Date().getDate() + timeFrame.length) % pool.length;

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
  ): string {
    const venusAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'venus' || a.natalPlanet === 'venus',
    );

    const periodPhrases: Record<
      string,
      { positive: string; neutral: string; negative: string }
    > = {
      Сегодня: {
        positive: 'создает романтическую атмосферу',
        neutral: 'влияет на ваше настроение',
        negative: 'создает напряжение',
      },
      Завтра: {
        positive: 'обещает приятные встречи',
        neutral: 'будет способствовать общению',
        negative: 'может вызвать недопонимание',
      },
      'На этой неделе': {
        positive: 'открывает перспективы для отношений',
        neutral: 'поддерживает стабильность в паре',
        negative: 'требует работы над отношениями',
      },
      'В этом месяце': {
        positive: 'создает благоприятные условия для любви',
        neutral: 'способствует развитию отношений',
        negative: 'призывает к переосмыслению приоритетов',
      },
    };

    if (venusAspects.length > 0) {
      const aspect = venusAspects[0];
      const phrases = periodPhrases[timeFrame] || periodPhrases['Сегодня'];

      if (['trine', 'sextile', 'conjunction'].includes(aspect.aspect)) {
        return `${timeFrame} Венера ${phrases.positive}. Хорошее время для романтики и общения с близкими.`;
      } else {
        return `${timeFrame} Венера ${phrases.negative}. Проявите терпение в отношениях.`;
      }
    }

    const phrases = periodPhrases[timeFrame] || periodPhrases['Сегодня'];
    return `${timeFrame} энергии ${phrases.neutral}. Цените существующие отношения.`;
  }

  /**
   * УЛУЧШЕННАЯ генерация прогноза для карьеры
   */
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
    const marsAspects = transitAspects.filter(
      (a) => a.transitPlanet === 'mars',
    );

    const periodActions: Record<
      string,
      { jupiter: string; saturn: string; mars: string; neutral: string }
    > = {
      Сегодня: {
        jupiter: 'сегодняшний день благоприятен для',
        saturn: 'сегодня требуется',
        mars: 'сегодня появляется энергия для',
        neutral: 'сегодня продолжайте работу над',
      },
      Завтра: {
        jupiter: 'завтра откроются возможности для',
        saturn: 'завтра понадобится',
        mars: 'завтра будет импульс к',
        neutral: 'завтра сосредоточьтесь на',
      },
      'На этой неделе': {
        jupiter: 'эта неделя принесет перспективы в',
        saturn: 'эта неделя потребует',
        mars: 'эта неделя даст силы для',
        neutral: 'эта неделя подходит для работы над',
      },
      'В этом месяце': {
        jupiter: 'этот месяц открывает возможности для роста в',
        saturn: 'этот месяц призывает к',
        mars: 'этот месяц добавит энергии для продвижения в',
        neutral: 'этот месяц благоприятен для развития',
      },
    };

    const actions = periodActions[timeFrame] || periodActions['Сегодня'];

    if (jupiterAspects.length > 0) {
      return `${timeFrame} Юпитер ${actions.jupiter} карьерных инициатив. Время для смелых решений.`;
    }

    if (marsAspects.length > 0) {
      if (['trine', 'sextile'].includes(marsAspects[0].aspect)) {
        return `${timeFrame} Марс ${actions.mars} активных действий в работе. Используйте свою энергию конструктивно.`;
      }
    }

    if (saturnAspects.length > 0) {
      return `${timeFrame} Сатурн ${actions.saturn} дисциплина и ответственность. Сосредоточьтесь на долгосрочных целях.`;
    }

    return `${timeFrame} ${actions.neutral} текущими проектами. Последовательность важна.`;
  }

  /**
   * Генерация прогноза для здоровья
   */
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

  /**
   * Генерация финансового прогноза
   */
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

  /**
   * УЛУЧШЕННАЯ генерация совета с учетом периода
   */
  private generateAdvice(
    sunSign: string,
    dominantTransit: any,
    timeFrame: string,
  ): string {
    const periodAdvices = {
      Сегодня: [
        'Сегодня доверяйте своей интуиции и не бойтесь делать первый шаг.',
        'Сегодня будьте открыты новому опыту и неожиданным возможностям.',
        'Сегодня практикуйте благодарность за все, что имеете.',
        'Сегодня фокусируйтесь на том, что действительно важно для вас.',
        'Сегодня прислушивайтесь к своему внутреннему голосу.',
      ],
      Завтра: [
        'Завтра начните день с позитивного настроя и ясных намерений.',
        'Завтра подготовьтесь к новым возможностям и будьте гибкими.',
        'Завтра уделите время планированию важных дел.',
        'Завтра сосредоточьтесь на приоритетах и не распыляйтесь.',
        'Завтра будьте внимательны к знакам судьбы.',
      ],
      'На этой неделе': [
        'На этой неделе поддерживайте баланс между работой и отдыхом.',
        'На этой неделе развивайте свои сильные стороны и таланты.',
        'На этой неделе укрепляйте отношения с близкими людьми.',
        'На этой неделе не бойтесь выходить из зоны комфорта.',
        'На этой неделе практикуйте осознанность в каждом действии.',
      ],
      'В этом месяце': [
        'В этом месяце работайте над долгосрочными целями с терпением и упорством.',
        'В этом месяце инвестируйте в свое развитие и обучение.',
        'В этом месяце стройте прочный фундамент для будущих достижений.',
        'В этом месяце уделите внимание своему здоровью и благополучию.',
        'В этом месяце культивируйте позитивное мышление и оптимизм.',
      ],
    };

    const advices =
      (periodAdvices as any)[timeFrame] || periodAdvices['Сегодня'];

    const index =
      Math.abs(new Date().getDate() + new Date().getMonth()) % advices.length;

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

  /**
   * Расчет аспекта между двумя долготами
   */
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

  /**
   * Получение доминирующего транзита
   */
  private getDominantTransit(transitAspects: any[]): any {
    return transitAspects.length > 0 ? transitAspects[0] : null;
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

  /**
   * Генерация общего гороскопа (когда нет карты)
   */
  private generateGenericHoroscope(
    period: 'day' | 'tomorrow' | 'week' | 'month',
    isPremium: boolean,
  ): HoroscopePrediction {
    this.logger.log(
      `Generating generic horoscope for period: ${period}, premium: ${isPremium}`,
    );

    const targetDate = this.getTargetDate(period);
    const timeFrame = this.getTimeFrame(period);

    const genericPredictions = {
      general: `${timeFrame} принесет новые возможности для развития. Слушайте свою интуицию и будьте открыты к изменениям.`,
      love: `${timeFrame} хорошее время для укрепления отношений. Проявите заботу и внимание к близким.`,
      career: `${timeFrame} сосредоточьтесь на текущих задачах. Ваше упорство принесет результаты.`,
      health: `${timeFrame} поддерживайте баланс между работой и отдыхом. Здоровье - это основа всего.`,
      finance: `${timeFrame} будьте внимательны к финансовым решениям. Планируйте расходы разумно.`,
      advice: `${timeFrame} доверяйте себе и своим способностям. Вы на правильном пути.`,
    };

    return {
      period,
      date: targetDate.toISOString(),
      general: genericPredictions.general,
      love: genericPredictions.love,
      career: genericPredictions.career,
      health: genericPredictions.health,
      finance: isPremium ? genericPredictions.finance : '',
      advice: genericPredictions.advice,
      luckyNumbers: this.generateLuckyNumbers({}, targetDate),
      luckyColors: ['Белый', 'Синий', 'Зеленый'],
      energy: 65,
      mood: 'Сбалансированное',
      challenges: isPremium
        ? ['Будьте внимательны к деталям', 'Избегайте поспешных решений']
        : [],
      opportunities: isPremium ? ['Новые знакомства', 'Креативные идеи'] : [],
      generatedBy: 'interpreter',
    };
  }
}
