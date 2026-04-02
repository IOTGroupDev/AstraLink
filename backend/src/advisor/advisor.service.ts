import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';
import { AIService } from '@/services/ai.service';
import { ChartService } from '@/chart/chart.service';
import { InterpretationService } from '@/services/interpretation.service';
import { calculateAspectWithSpecs } from '@/shared/astro-calculations';
import { EvaluateAdviceDto } from './dto/evaluate-advice.dto';
import {
  AdviceResponseDto,
  AdvisorAspect,
  AdvisorFactor,
  AdvisorVerdict,
  TimeWindow,
  AdvisorRecommendation,
  AdvisorHouse,
} from './dto/advice-response.dto';

type PlanetKey =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

interface TopicConfig {
  planets: Partial<Record<PlanetKey, number>>;
  houses: number[];
  description: string;
  recommendations: {
    good: string[];
    neutral: string[];
    challenging: string[];
  };
}

interface PlanetData {
  longitude: number;
  isRetrograde?: boolean;
  sign?: string;
  degree?: number;
}

interface HouseData {
  sign?: string;
  cusp?: number;
}

type AdvisorLocale = 'ru' | 'en' | 'es';

@Injectable()
export class AdvisorService {
  private readonly logger = new Logger(AdvisorService.name);

  private readonly TOPIC_CONFIGS: Record<string, TopicConfig> = {
    contract: {
      planets: { mercury: 15, jupiter: 8, saturn: 6, sun: 4 },
      houses: [3, 7, 10],
      description: 'Подписание контрактов и юридических документов',
      recommendations: {
        good: [
          'Идеальное время для подписания важных контрактов',
          'Все детали будут учтены и проверены',
          'Договоренности принесут долгосрочную выгоду',
          'Партнеры настроены конструктивно',
        ],
        neutral: [
          'Проверьте все условия дважды перед подписанием',
          'Консультация с юристом будет полезна',
          'Возможны небольшие задержки в оформлении',
          'Будьте внимательны к мелким деталям',
        ],
        challenging: [
          'Отложите подписание, если возможно',
          'Высок риск упущения важных деталей',
          'Возможны недопонимания с партнерами',
          'Лучше перепроверить все условия позже',
        ],
      },
    },
    meeting: {
      planets: { mercury: 12, venus: 6, sun: 6, jupiter: 6 },
      houses: [1, 3, 7, 11],
      description: 'Деловые и личные встречи',
      recommendations: {
        good: [
          'Встреча пройдет продуктивно и конструктивно',
          'Легкое взаимопонимание с собеседниками',
          'Ваши идеи будут услышаны и приняты',
          'Возможны неожиданные полезные знакомства',
        ],
        neutral: [
          'Подготовьте основные тезисы заранее',
          'Будьте готовы к изменению повестки',
          'Возможны технические сложности',
          'Держите фокус на главных вопросах',
        ],
        challenging: [
          'Высок риск недопонимания',
          'Перенесите встречу, если это возможно',
          'Возможны конфликты и разногласия',
          'Документируйте все договоренности',
        ],
      },
    },
    negotiation: {
      planets: { mercury: 14, jupiter: 8, saturn: 6, moon: 4 },
      houses: [2, 7, 8, 10],
      description: 'Переговоры и заключение сделок',
      recommendations: {
        good: [
          'Отличное время для важных переговоров',
          'Вы сможете отстоять свои интересы',
          'Партнеры склонны к компромиссам',
          'Возможна выгодная сделка для всех сторон',
        ],
        neutral: [
          'Будьте готовы к жестким переговорам',
          'Не спешите с окончательным решением',
          'Изучите позицию оппонентов',
          'Оставьте пространство для маневра',
        ],
        challenging: [
          'Отложите важные переговоры',
          'Сложно будет найти компромисс',
          'Возможны манипуляции со стороны партнеров',
          'Сохраняйте спокойствие и не давите',
        ],
      },
    },
    date: {
      planets: { venus: 15, moon: 8, sun: 5 },
      houses: [5, 7],
      description: 'Романтические свидания',
      recommendations: {
        good: [
          'Идеальное время для романтики',
          'Легкость в общении и взаимопонимание',
          'Возможны яркие эмоциональные моменты',
          'День запомнится обоим надолго',
        ],
        neutral: [
          'Будьте искренни и открыты',
          'Не стройте завышенных ожиданий',
          'Возможны небольшие недопонимания',
          'Сосредоточьтесь на приятном общении',
        ],
        challenging: [
          'Возможны эмоциональные сложности',
          'Перенесите свидание, если чувствуете напряжение',
          'Избегайте серьезных разговоров',
          'Будьте терпеливы к партнеру',
        ],
      },
    },
    travel: {
      planets: { jupiter: 12, mercury: 8, moon: 4 },
      houses: [3, 9],
      description: 'Путешествия и поездки',
      recommendations: {
        good: [
          'Отличное время для путешествий',
          'Поездка принесет новые впечатления',
          'Минимум непредвиденных ситуаций',
          'Возможны приятные знакомства в пути',
        ],
        neutral: [
          'Проверьте все документы и билеты',
          'Заложите запас времени на дорогу',
          'Будьте гибки в планах',
          'Возможны небольшие изменения маршрута',
        ],
        challenging: [
          'Отложите поездку, если возможно',
          'Высок риск задержек и препятствий',
          'Тщательно проверьте все детали',
          'Имейте план Б на случай проблем',
        ],
      },
    },
    purchase: {
      planets: { mercury: 10, venus: 8, saturn: 4 },
      houses: [2, 8],
      description: 'Крупные покупки и инвестиции',
      recommendations: {
        good: [
          'Удачное время для покупок',
          'Вы найдете оптимальное соотношение цены и качества',
          'Сделка будет выгодной',
          'Покупка прослужит долго',
        ],
        neutral: [
          'Изучите все варианты перед покупкой',
          'Сравните предложения разных продавцов',
          'Не торопитесь с решением',
          'Проверьте все характеристики товара',
        ],
        challenging: [
          'Отложите крупные покупки',
          'Высок риск переплатить или ошибиться',
          'Возможны скрытые дефекты',
          'Лучше подождать более благоприятного времени',
        ],
      },
    },
    health: {
      planets: { sun: 8, moon: 8, mars: 8, saturn: 4 },
      houses: [1, 6, 12],
      description: 'Здоровье и медицинские процедуры',
      recommendations: {
        good: [
          'Отличный день для заботы о здоровье',
          'Организм хорошо реагирует на процедуры',
          'Высокий уровень энергии и восстановления',
          'Эффективность лечения повышена',
        ],
        neutral: [
          'Слушайте сигналы своего тела',
          'Не перегружайте себя физически',
          'Соблюдайте баланс активности и отдыха',
          'Проконсультируйтесь со специалистом',
        ],
        challenging: [
          'Отложите плановые процедуры',
          'Организм ослаблен, нужен отдых',
          'Избегайте рисков и перегрузок',
          'Сосредоточьтесь на восстановлении',
        ],
      },
    },
    custom: {
      planets: {
        sun: 6,
        moon: 6,
        mercury: 6,
        venus: 6,
        mars: 6,
        jupiter: 6,
        saturn: 6,
      },
      houses: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      description: 'Общая оценка дня',
      recommendations: {
        good: [
          'Благоприятный день для большинства дел',
          'Хорошая энергия и настрой',
          'События развиваются позитивно',
          'Используйте день максимально',
        ],
        neutral: [
          'Обычный день с умеренной энергией',
          'Фокусируйтесь на важных задачах',
          'Будьте внимательны к деталям',
          'Планируйте с учетом возможных изменений',
        ],
        challenging: [
          'День требует осторожности',
          'Отложите важные решения',
          'Сосредоточьтесь на рутинных делах',
          'Больше отдыхайте и набирайтесь сил',
        ],
      },
    },
  };

  private readonly PLANET_NAMES_RU: Record<PlanetKey, string> = {
    sun: 'Солнце',
    moon: 'Луна',
    mercury: 'Меркурий',
    venus: 'Венера',
    mars: 'Марс',
    jupiter: 'Юпитер',
    saturn: 'Сатурн',
    uranus: 'Уран',
    neptune: 'Нептун',
    pluto: 'Плутон',
  };

  private readonly ASPECT_NAMES_RU: Record<string, string> = {
    conjunction: 'соединение',
    sextile: 'секстиль',
    square: 'квадрат',
    trine: 'трин',
    opposition: 'оппозиция',
    'semi-sextile': 'полусекстиль',
    'semi-square': 'полуквадрат',
    sesquiquadrate: 'полутораквадрат',
    quincunx: 'квинконс',
    quintile: 'квинтиль',
    biquintile: 'биквинтиль',
  };

  constructor(
    private readonly redis: RedisService,
    private readonly ephemeris: EphemerisService,
    private readonly aiService: AIService,
    private readonly chartService: ChartService,
    private readonly interpretationService: InterpretationService,
  ) {}

  private resolveTopic(topic?: string): string {
    if (!topic) return 'custom';
    const key = topic.toLowerCase();
    return this.TOPIC_CONFIGS[key] ? key : 'custom';
  }

  private resolveLocale(locale?: string): AdvisorLocale {
    const normalized = String(locale || 'ru').toLowerCase();
    if (normalized.startsWith('en')) return 'en';
    if (normalized.startsWith('es')) return 'es';
    return 'ru';
  }

  private normalizeCustomNote(note?: string): string {
    return String(note || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeStructuredText(value: unknown): string {
    if (typeof value === 'string') {
      return value.replace(/\s+/g, ' ').trim();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim();
    }

    return '';
  }

  private buildCacheKey(
    userId: string,
    date: string,
    topicKey: string,
    timezone: string,
    locale: AdvisorLocale,
    customNote?: string,
  ): string {
    const note = this.normalizeCustomNote(customNote);
    const noteHash = note
      ? createHash('sha1').update(note).digest('hex').slice(0, 12)
      : 'none';

    return `advisor:${userId}:${date}:${topicKey}:${timezone}:${locale}:${noteHash}`;
  }

  async evaluate(
    userId: string,
    dto: EvaluateAdviceDto,
    locale?: string,
  ): Promise<AdviceResponseDto> {
    const tz = dto.timezone || 'UTC';
    const topicKey = this.resolveTopic(dto.topic);
    const resolvedLocale = this.resolveLocale(locale);
    const customNote = this.normalizeCustomNote(dto.customNote);
    const cacheKey = this.buildCacheKey(
      userId,
      dto.date,
      topicKey,
      tz,
      resolvedLocale,
      customNote,
    );

    // Try cache
    const cached = await this.redis.get<AdviceResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    // Load natal chart
    const natal = await this.chartService.getNatalChart(userId);
    const natalData = (natal as any)?.data ?? natal;
    const natalPlanets = (natalData?.planets || {}) as Record<
      string,
      PlanetData
    >;
    const natalHouses = (natalData?.houses || {}) as Record<string, HouseData>;

    // Calculate hourly windows for the day
    const windows = await this.calculateHourlyWindows(
      dto.date,
      natalPlanets,
      topicKey,
      tz,
    );

    // Get best window (with safety check)
    const bestWindow = windows.reduce<TimeWindow>(
      (best, current) => {
        const bestScore = best.score ?? 0;
        const currentScore = current.score ?? 0;
        return currentScore > bestScore ? current : best;
      },
      windows[0] || { startISO: '', endISO: '', score: 50 },
    );

    // Calculate detailed aspects and factors for best window
    const dateTime = new Date(bestWindow.startISO);
    const jd = this.ephemeris.dateToJulianDay(dateTime);
    const currentPlanets = await this.ephemeris.calculatePlanets(jd);

    const { aspects, factors, score } = await this.evaluateTimePoint(
      currentPlanets,
      natalPlanets,
      topicKey,
    );

    const verdict: AdvisorVerdict =
      score >= 70 ? 'good' : score >= 50 ? 'neutral' : 'challenging';

    const color: string =
      verdict === 'good'
        ? '#10B981'
        : verdict === 'neutral'
          ? '#F59E0B'
          : '#EF4444';

    // Analyze relevant houses
    const houses = this.analyzeRelevantHouses(topicKey, natalHouses);
    const topicConfig = this.TOPIC_CONFIGS[topicKey];
    const fallbackExplanation = this.generateInterpretation(
      factors,
      topicKey,
      verdict,
      bestWindow,
      tz,
      dto.date,
      customNote,
      resolvedLocale,
      score,
    );
    const fallbackRecommendations = this.getRecommendations(
      topicKey,
      verdict,
      bestWindow,
      tz,
      factors,
      customNote,
      resolvedLocale,
    );
    const aiSummary = await this.generateAdvisorSummary({
      locale: resolvedLocale,
      topicKey,
      topicDescription: topicConfig?.description || '',
      customNote,
      verdict,
      score,
      bestWindow,
      timeZone: tz,
      date: dto.date,
      aspects,
      factors,
      houses,
      fallbackExplanation,
      fallbackRecommendations,
    });
    const explanation = aiSummary?.explanation || fallbackExplanation;
    const recommendations =
      aiSummary?.recommendations?.length && aiSummary.recommendations.length > 0
        ? aiSummary.recommendations
        : fallbackRecommendations;

    const response: AdviceResponseDto = {
      verdict,
      color,
      score,
      factors,
      aspects,
      houses,
      bestWindows: windows.slice(0, 5), // Top 5 windows
      explanation,
      recommendations,
      generatedBy: aiSummary?.generatedBy || 'enhanced-rules',
      evaluatedAt: new Date().toISOString(),
      date: dto.date,
      topic: topicKey,
      timezone: dto.timezone,
      topicDescription: topicConfig?.description || '',
    };

    // Cache for 6 hours
    await this.redis.set(cacheKey, response, 6 * 3600);
    return response;
  }

  private async calculateHourlyWindows(
    date: string,
    natalPlanets: Record<string, PlanetData>,
    topic: string,
    timeZone = 'UTC',
  ): Promise<TimeWindow[]> {
    const windows: TimeWindow[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const startUTC = this.zonedLocalDateTimeToUtc(date, hour, 0, timeZone);
      const nextBoundaryUTC =
        hour === 23
          ? this.zonedLocalDateTimeToUtc(
              this.shiftIsoDate(date, 1),
              0,
              0,
              timeZone,
            )
          : this.zonedLocalDateTimeToUtc(date, hour + 1, 0, timeZone);
      const endUTC = new Date(nextBoundaryUTC.getTime() - 1);
      const startISO = startUTC.toISOString();
      const endISO = endUTC.toISOString();

      const dateTime = new Date(startISO);
      const jd = this.ephemeris.dateToJulianDay(dateTime);
      const currentPlanets = await this.ephemeris.calculatePlanets(jd);

      const { score } = await this.evaluateTimePoint(
        currentPlanets,
        natalPlanets,
        topic,
      );

      windows.push({ startISO, endISO, score });
    }

    return windows.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  private async evaluateTimePoint(
    currentPlanets: Record<string, PlanetData>,
    natalPlanets: Record<string, PlanetData>,
    topic: string,
  ): Promise<{
    aspects: AdvisorAspect[];
    factors: AdvisorFactor[];
    score: number;
  }> {
    const topicKey = this.resolveTopic(topic);
    const topicConfig = this.TOPIC_CONFIGS[topicKey];
    if (!topicConfig) {
      return { aspects: [], factors: [], score: 50 };
    }

    const trackedPlanets: PlanetKey[] = [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
    ];

    const aspects: AdvisorAspect[] = [];
    const factors: AdvisorFactor[] = [];

    const aspectWeights: Record<
      AdvisorAspect['type'],
      { base: number; orb: number }
    > = {
      // Major aspects (stronger influence)
      conjunction: { base: 10, orb: 8 },
      sextile: { base: 8, orb: 6 },
      square: { base: -10, orb: 8 },
      trine: { base: 12, orb: 8 },
      opposition: { base: -12, orb: 8 },
      // Minor aspects (weaker influence, tighter orbs)
      'semi-sextile': { base: 3, orb: 2 },
      'semi-square': { base: -4, orb: 2 },
      sesquiquadrate: { base: -4, orb: 2 },
      quincunx: { base: -5, orb: 3 },
      quintile: { base: 6, orb: 2 },
      biquintile: { base: 6, orb: 2 },
    };

    for (const p of trackedPlanets) {
      const cur = currentPlanets[p];
      const nat = natalPlanets[p];
      if (!cur || !nat) continue;

      const a = this.calculateAspect(
        cur.longitude,
        nat.longitude,
        aspectWeights,
      );

      if (a) {
        const impactSigned = this.aspectImpactSigned(
          a.type,
          a.orb,
          aspectWeights,
        );

        const aspectName = this.ASPECT_NAMES_RU[a.type] || a.type;

        aspects.push({
          planetA: p,
          planetB: p,
          type: a.type,
          orb: a.orb,
          impact: impactSigned / 12,
          description: this.getAspectDescription(p, a.type, impactSigned > 0),
        });

        const planetWeight = topicConfig.planets[p] ?? 0;
        const contribution = planetWeight * (impactSigned / 12);
        const orbValue = aspectWeights[a.type]?.orb ?? 1;

        factors.push({
          label: `${this.PLANET_NAMES_RU[p]} (${aspectName})`,
          weight: planetWeight,
          value: 1 - a.orb / orbValue,
          contribution,
          description: this.getFactorDescription(p, a.type, topicKey),
        });
      }
    }

    // Mercury retrograde penalty
    const merc = currentPlanets.mercury;
    const mercRetroPenaltyTopics = new Set([
      'contract',
      'purchase',
      'meeting',
      'negotiation',
    ]);

    if (merc?.isRetrograde && mercRetroPenaltyTopics.has(topicKey)) {
      const penalty = -12;
      factors.push({
        label: 'Меркурий ретроградный',
        weight: penalty,
        value: 1,
        contribution: penalty,
        description:
          'Ретроградный Меркурий замедляет коммуникацию и может вызвать недопонимания. Будьте особенно внимательны к деталям.',
      });
    }

    // Calculate final score
    let score = 50 + factors.reduce((acc, f) => acc + f.contribution, 0);
    score = Math.round(Math.min(100, Math.max(0, score)));

    return { aspects, factors, score };
  }

  private calculateAspect(
    longitude1: number,
    longitude2: number,
    specs: Record<AdvisorAspect['type'], { base: number; orb: number }>,
  ): { type: AdvisorAspect['type']; orb: number } | null {
    // Используем shared утилиту вместо дублирования логики
    return calculateAspectWithSpecs(longitude1, longitude2, specs);
  }

  private aspectImpactSigned(
    type: AdvisorAspect['type'],
    orb: number,
    specs: Record<AdvisorAspect['type'], { base: number; orb: number }>,
  ): number {
    const spec = specs[type];
    const strength = 1 - Math.min(1, orb / (spec.orb || 1));
    return spec.base * strength;
  }

  private getAspectDescription(
    planet: PlanetKey,
    aspectType: string,
    isPositive: boolean,
  ): string {
    const planetName = this.PLANET_NAMES_RU[planet];
    const aspectName = this.ASPECT_NAMES_RU[aspectType] || aspectType;

    const descriptions: Partial<Record<PlanetKey, Record<string, string>>> = {
      sun: {
        conjunction: isPositive
          ? 'Усиление витальности и уверенности в себе'
          : 'Повышенное эго может мешать',
        trine: 'Гармоничное выражение вашей сути и целей',
        sextile: 'Благоприятные возможности для самореализации',
        square: 'Напряжение между желаемым и действительным',
        opposition: 'Конфликт между личными целями и требованиями ситуации',
      },
      moon: {
        conjunction: isPositive
          ? 'Эмоциональная ясность и интуитивная точность'
          : 'Эмоции могут затмевать разум',
        trine: 'Внутренний комфорт и эмоциональная гармония',
        sextile: 'Легкость в выражении чувств',
        square: 'Эмоциональное напряжение и беспокойство',
        opposition: 'Конфликт между чувствами и разумом',
      },
      mercury: {
        conjunction: isPositive
          ? 'Ясность мышления и коммуникации'
          : 'Информационная перегрузка',
        trine: 'Легкость общения и понимания',
        sextile: 'Продуктивные переговоры и обмен идеями',
        square: 'Недопонимания и коммуникативные сложности',
        opposition: 'Разногласия во мнениях',
      },
      venus: {
        conjunction: isPositive
          ? 'Усиление привлекательности и обаяния'
          : 'Чрезмерная потребность в одобрении',
        trine: 'Гармония в отношениях и эстетическое удовольствие',
        sextile: 'Приятные социальные взаимодействия',
        square: 'Сложности в отношениях, конфликт ценностей',
        opposition: 'Напряжение между личными и чужими потребностями',
      },
      mars: {
        conjunction: isPositive
          ? 'Прилив энергии и инициативности'
          : 'Импульсивность и конфликтность',
        trine: 'Эффективное действие и достижение целей',
        sextile: 'Продуктивная активность',
        square: 'Фрустрация и агрессия',
        opposition: 'Конфронтация и борьба за власть',
      },
      jupiter: {
        conjunction: isPositive
          ? 'Расширение возможностей и удача'
          : 'Чрезмерный оптимизм и переоценка сил',
        trine: 'Благоприятные обстоятельства и рост',
        sextile: 'Возможности для развития',
        square: 'Переоценка ситуации, избыточность',
        opposition: 'Конфликт между желаниями и реальностью',
      },
      saturn: {
        conjunction: isPositive
          ? 'Структурирование и укрепление позиций'
          : 'Ограничения и дополнительная ответственность',
        trine: 'Дисциплина приносит результаты',
        sextile: 'Практичный подход работает',
        square: 'Препятствия и задержки',
        opposition: 'Давление обстоятельств и ответственности',
      },
    };

    return (
      descriptions[planet]?.[aspectType] ||
      `${planetName} формирует ${aspectName} с натальной позицией`
    );
  }

  private getFactorDescription(
    planet: PlanetKey,
    aspectType: string,
    topic: string,
  ): string {
    const topicDescriptions: Partial<
      Record<string, Partial<Record<PlanetKey, Record<string, string>>>>
    > = {
      contract: {
        mercury: {
          trine: 'Отличная ясность в понимании условий и деталей договора',
          sextile: 'Хорошее понимание юридических тонкостей',
          square: 'Риск упустить важные детали или неверно их истолковать',
          opposition: 'Возможны разногласия в интерпретации условий контракта',
        },
        jupiter: {
          trine: 'Контракт принесет долгосрочную выгоду и рост',
          sextile: 'Благоприятные условия для обеих сторон',
          square: 'Риск переоценки выгод от сделки',
        },
        saturn: {
          trine: 'Надежный и долговечный контракт с четкими обязательствами',
          square: 'Чрезмерные ограничения или обязательства',
        },
      },
    };

    return (
      topicDescriptions[topic]?.[planet]?.[aspectType] ||
      this.getAspectDescription(planet, aspectType, true)
    );
  }

  private shiftIsoDate(date: string, deltaDays: number): string {
    const base = new Date(`${date}T00:00:00.000Z`);
    base.setUTCDate(base.getUTCDate() + deltaDays);
    return base.toISOString().slice(0, 10);
  }

  private getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });

      const parts = Object.fromEntries(
        formatter
          .formatToParts(date)
          .filter((part) => part.type !== 'literal')
          .map((part) => [part.type, part.value]),
      ) as Record<string, string>;

      const utcTime = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      );

      return Math.round((utcTime - date.getTime()) / 60000);
    } catch {
      return 0;
    }
  }

  private zonedLocalDateTimeToUtc(
    date: string,
    hour: number,
    minute: number,
    timeZone: string,
  ): Date {
    const [year, month, day] = date.split('-').map(Number);
    let utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

    // Two passes are enough for DST transitions around the boundary hour.
    for (let iteration = 0; iteration < 2; iteration += 1) {
      const offsetMinutes = this.getTimeZoneOffsetMinutes(utc, timeZone);
      utc = new Date(
        Date.UTC(year, month - 1, day, hour, minute, 0, 0) -
          offsetMinutes * 60 * 1000,
      );
    }

    return utc;
  }

  private getLocaleTag(locale: AdvisorLocale): string {
    if (locale === 'en') return 'en-US';
    if (locale === 'es') return 'es-ES';
    return 'ru-RU';
  }

  private formatAdvisorWindow(
    window: TimeWindow | null | undefined,
    timeZone: string,
    locale: AdvisorLocale,
  ): string {
    if (!window?.startISO || !window?.endISO) return '';

    const formatter = new Intl.DateTimeFormat(this.getLocaleTag(locale), {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });

    return `${formatter.format(new Date(window.startISO))}-${formatter.format(new Date(window.endISO))}`;
  }

  private getSignificantFactors(
    factors: AdvisorFactor[],
    predicate?: (factor: AdvisorFactor) => boolean,
  ): AdvisorFactor[] {
    return factors
      .filter((factor) =>
        predicate ? predicate(factor) : Math.abs(factor.contribution) > 3,
      )
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
  }

  private trimSentence(text?: string): string {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[.!\s]+$/g, '');
  }

  private generateInterpretation(
    factors: AdvisorFactor[],
    topic: string,
    verdict: AdvisorVerdict,
    bestWindow: TimeWindow | null,
    timeZone: string,
    date: string,
    customNote: string | undefined,
    locale: AdvisorLocale,
    score: number,
  ): string {
    const topicConfig = this.TOPIC_CONFIGS[topic];
    const topicDesc = topicConfig?.description || topic;
    const bestWindowLabel = this.formatAdvisorWindow(
      bestWindow,
      timeZone,
      locale,
    );
    const strongestPositive = this.getSignificantFactors(
      factors,
      (factor) => factor.contribution > 2,
    )[0];
    const strongestNegative = this.getSignificantFactors(
      factors,
      (factor) => factor.contribution < -2,
    )[0];

    const opening =
      verdict === 'good'
        ? `По теме "${topicDesc}" день выглядит сильным и рабочим: здесь действительно есть окно, в которое стоит заходить с главным действием.`
        : verdict === 'neutral'
          ? `По теме "${topicDesc}" день неоднозначный: результат возможен, но он будет зависеть от подготовки и точности шагов.`
          : `По теме "${topicDesc}" фон напряженный: если вопрос не срочный, безопаснее снизить ставку или перенести ключевое действие.`;

    const noteLine = customNote
      ? `Ваш конкретный запрос: "${customNote}". Ответ ниже относится именно к нему, а не к теме в общем.`
      : '';

    const timeLine = bestWindowLabel
      ? `Самое сильное окно на ${date} — ${bestWindowLabel}${timeZone && timeZone !== 'UTC' ? ` (${timeZone})` : ''}. Именно туда лучше ставить главный разговор, подпись, встречу или финальное согласование.`
      : '';

    const positiveLine = strongestPositive
      ? `Главный плюс сейчас — ${strongestPositive.label}: ${this.trimSentence(strongestPositive.description)}. Это можно использовать как точку опоры, когда понадобится ясность, мягкая подача или решительность.`
      : '';

    const negativeLine = strongestNegative
      ? `Главный риск — ${strongestNegative.label}: ${this.trimSentence(strongestNegative.description)}. На этом месте чаще всего возникают спешка, самообман, недосказанность или лишнее давление.`
      : '';

    const closing =
      verdict === 'good'
        ? `Если будете действовать предметно и без лишних отклонений, день можно конвертировать в заметный результат. Итоговая оценка — ${score}/100.`
        : verdict === 'neutral'
          ? `Здесь выиграет не импульс, а дисциплина: короткий план, один приоритет и обязательная перепроверка деталей. Итоговая оценка — ${score}/100.`
          : `Лучший сценарий на сегодня — не форсировать, а уменьшить риск: меньше обещаний, больше проверок и резервный вариант на случай срыва. Итоговая оценка — ${score}/100.`;

    return [noteLine, opening, timeLine, positiveLine, negativeLine, closing]
      .filter(Boolean)
      .join(' ');
  }

  private getRecommendations(
    topic: string,
    verdict: AdvisorVerdict,
    bestWindow: TimeWindow | null,
    timeZone: string,
    factors: AdvisorFactor[],
    customNote: string | undefined,
    locale: AdvisorLocale,
  ): AdvisorRecommendation[] {
    const topicKey = this.resolveTopic(topic);
    const topicConfig = this.TOPIC_CONFIGS[topicKey];
    const recommendations: AdvisorRecommendation[] = [];
    const bestWindowLabel = this.formatAdvisorWindow(
      bestWindow,
      timeZone,
      locale,
    );
    const strongestPositive = this.getSignificantFactors(
      factors,
      (factor) => factor.contribution > 2,
    )[0];
    const strongestNegative = this.getSignificantFactors(
      factors,
      (factor) => factor.contribution < -2,
    )[0];

    if (bestWindowLabel) {
      recommendations.push({
        text:
          verdict === 'good'
            ? `Поставьте главное действие на ${bestWindowLabel}: это самое сильное окно дня.`
            : verdict === 'neutral'
              ? `Если решать вопрос сегодня, держите ключевой шаг в окне ${bestWindowLabel}.`
              : `Если перенос невозможен, ограничьте главный шаг окном ${bestWindowLabel} и не расширяйте задачу.`,
        priority: 'high',
        category:
          verdict === 'good'
            ? 'action'
            : verdict === 'neutral'
              ? 'caution'
              : 'warning',
      });
    }

    if (strongestPositive) {
      recommendations.push({
        text: `Используйте плюс "${strongestPositive.label}": ${this.trimSentence(strongestPositive.description)}.`,
        priority: verdict === 'good' ? 'high' : 'medium',
        category: 'action',
      });
    }

    if (strongestNegative) {
      recommendations.push({
        text: `Закройте риск "${strongestNegative.label}": ${this.trimSentence(strongestNegative.description)}.`,
        priority: 'high',
        category: verdict === 'challenging' ? 'warning' : 'caution',
      });
    }

    if (customNote) {
      recommendations.push({
        text: `Для задачи "${customNote}" заранее выпишите 2-3 критерия решения и не уходите в импровизацию.`,
        priority: 'medium',
        category: verdict === 'challenging' ? 'warning' : 'caution',
      });
    }

    const textRecommendations = topicConfig?.recommendations?.[verdict] ?? [];
    textRecommendations.forEach((text, index) => {
      recommendations.push({
        text,
        priority: index === 0 ? 'medium' : 'low',
        category:
          verdict === 'good'
            ? 'action'
            : verdict === 'neutral'
              ? 'caution'
              : 'warning',
      });
    });

    const seen = new Set<string>();
    return recommendations
      .filter((item) => {
        const normalized = item.text.toLowerCase().trim();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
      .slice(0, 5);
  }

  private async generateAdvisorSummary(input: {
    locale: AdvisorLocale;
    topicKey: string;
    topicDescription: string;
    customNote: string;
    verdict: AdvisorVerdict;
    score: number;
    bestWindow: TimeWindow | null;
    timeZone: string;
    date: string;
    aspects: AdvisorAspect[];
    factors: AdvisorFactor[];
    houses: AdvisorHouse[];
    fallbackExplanation: string;
    fallbackRecommendations: AdvisorRecommendation[];
  }): Promise<{
    explanation: string;
    recommendations: AdvisorRecommendation[];
    generatedBy: string;
  } | null> {
    if (!this.aiService.isAvailable()) {
      return null;
    }

    try {
      const prompt = this.buildAdvisorPrompt(input);
      const raw = await this.aiService.generateText(
        prompt,
        undefined,
        input.locale,
      );
      const parsed = this.parseAdvisorSummary(raw);
      if (!parsed) {
        return null;
      }

      return {
        explanation: parsed.explanation,
        recommendations: parsed.recommendations,
        generatedBy: 'hybrid',
      };
    } catch (error) {
      this.logger.warn(
        `Advisor AI synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  private buildAdvisorPrompt(input: {
    locale: AdvisorLocale;
    topicKey: string;
    topicDescription: string;
    customNote: string;
    verdict: AdvisorVerdict;
    score: number;
    bestWindow: TimeWindow | null;
    timeZone: string;
    date: string;
    aspects: AdvisorAspect[];
    factors: AdvisorFactor[];
    houses: AdvisorHouse[];
    fallbackExplanation: string;
    fallbackRecommendations: AdvisorRecommendation[];
  }): string {
    const bestWindowLabel = this.formatAdvisorWindow(
      input.bestWindow,
      input.timeZone,
      input.locale,
    );
    const strongestFactors = this.getSignificantFactors(input.factors).slice(
      0,
      4,
    );

    if (input.locale === 'en') {
      return `You are an astrology decision advisor. Your job is to turn structured astrological signals into concrete, practical guidance.

Return ONLY valid JSON:
{
  "explanation": "120-190 words",
  "recommendations": [
    { "text": "short imperative recommendation", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Rules:
- Be specific. No vague spiritual filler, no motivational fluff, no generic coaching phrases.
- Base every claim ONLY on the provided data. Do not invent aspects, windows, risks, or strengths.
- Mention the verdict, the score, the best time window, and 2-3 strongest factors directly in the explanation.
- If customNote is present, tailor the advice to that exact situation.
- Recommendations must be concrete and actionable. At least one must mention timing, and at least one must mention what to double-check or avoid.
- Keep recommendation texts short, practical, and human.

DATA:
${JSON.stringify(
  {
    topic: input.topicKey,
    topicDescription: input.topicDescription,
    customNote: input.customNote || null,
    verdict: input.verdict,
    score: input.score,
    date: input.date,
    bestWindow: bestWindowLabel || null,
    timeZone: input.timeZone,
    factors: strongestFactors,
    aspects: input.aspects.slice(0, 4),
    houses: input.houses.slice(0, 4),
    fallbackExplanation: input.fallbackExplanation,
    fallbackRecommendations: input.fallbackRecommendations,
  },
  null,
  2,
)}`;
    }

    if (input.locale === 'es') {
      return `Eres un asesor astrológico para decisiones. Tu tarea es convertir señales astrológicas estructuradas en orientación concreta y útil.

Devuelve SOLO JSON válido:
{
  "explanation": "120-190 palabras",
  "recommendations": [
    { "text": "recomendación breve en imperativo", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Reglas:
- Sé específico. Nada de relleno espiritual vago, frases genéricas o coaching vacío.
- Basa cada afirmación SOLO en los datos proporcionados. No inventes aspectos, ventanas horarias, riesgos ni ventajas.
- Menciona directamente el veredicto, la puntuación, la mejor franja horaria y 2-3 factores más fuertes.
- Si existe customNote, adapta el consejo exactamente a esa situación.
- Las recomendaciones deben ser concretas y accionables. Al menos una debe mencionar el momento oportuno y otra qué revisar o evitar.
- Mantén los textos breves, prácticos y humanos.

DATOS:
${JSON.stringify(
  {
    topic: input.topicKey,
    topicDescription: input.topicDescription,
    customNote: input.customNote || null,
    verdict: input.verdict,
    score: input.score,
    date: input.date,
    bestWindow: bestWindowLabel || null,
    timeZone: input.timeZone,
    factors: strongestFactors,
    aspects: input.aspects.slice(0, 4),
    houses: input.houses.slice(0, 4),
    fallbackExplanation: input.fallbackExplanation,
    fallbackRecommendations: input.fallbackRecommendations,
  },
  null,
  2,
)}`;
    }

    return `Ты астрологический советник по решениям. Твоя задача — превратить структурированные астрологические сигналы в конкретный и полезный совет.

Верни ТОЛЬКО валидный JSON:
{
  "explanation": "120-190 слов",
  "recommendations": [
    { "text": "короткая рекомендация в повелительной форме", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Правила:
- Пиши конкретно. Никакой размытой эзотерики, пустого ободрения и общих фраз.
- Опирайся ТОЛЬКО на данные ниже. Не придумывай аспекты, окна времени, риски или сильные стороны.
- В объяснении прямо упомяни вердикт, score, лучшее окно времени и 2-3 самых сильных фактора.
- Если есть customNote, адаптируй ответ именно под эту ситуацию.
- Рекомендации должны быть предметными и выполнимыми. Хотя бы одна должна говорить, когда действовать, и хотя бы одна — что перепроверить или чего избегать.
- Пиши живо и по-человечески, но без воды.

ДАННЫЕ:
${JSON.stringify(
  {
    topic: input.topicKey,
    topicDescription: input.topicDescription,
    customNote: input.customNote || null,
    verdict: input.verdict,
    score: input.score,
    date: input.date,
    bestWindow: bestWindowLabel || null,
    timeZone: input.timeZone,
    factors: strongestFactors,
    aspects: input.aspects.slice(0, 4),
    houses: input.houses.slice(0, 4),
    fallbackExplanation: input.fallbackExplanation,
    fallbackRecommendations: input.fallbackRecommendations,
  },
  null,
  2,
)}`;
  }

  private parseAdvisorSummary(raw: string): {
    explanation: string;
    recommendations: AdvisorRecommendation[];
  } | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as {
        explanation?: unknown;
        recommendations?: unknown;
      };

      const explanation = this.normalizeStructuredText(parsed.explanation);

      if (!explanation) {
        return null;
      }

      const recommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
            .map((item) => {
              const record = item as Record<string, unknown>;
              const text = this.normalizeStructuredText(record.text);
              const priority =
                record.priority === 'high' ||
                record.priority === 'medium' ||
                record.priority === 'low'
                  ? record.priority
                  : 'medium';
              const category =
                record.category === 'action' ||
                record.category === 'caution' ||
                record.category === 'warning'
                  ? record.category
                  : 'action';

              if (!text) return null;
              return { text, priority, category } as AdvisorRecommendation;
            })
            .filter((item): item is AdvisorRecommendation => Boolean(item))
            .slice(0, 5)
        : [];

      return { explanation, recommendations };
    } catch {
      return null;
    }
  }

  private analyzeRelevantHouses(
    topic: string,
    natalHouses: Record<string, HouseData>,
  ): AdvisorHouse[] {
    const topicKey = this.resolveTopic(topic);
    const topicConfig = this.TOPIC_CONFIGS[topicKey];
    const relevantHouses = topicConfig?.houses ?? [];

    return relevantHouses.map((houseNum) => {
      const house =
        natalHouses[houseNum.toString()] ||
        natalHouses[`house${houseNum}`] ||
        {};
      return {
        house: houseNum,
        sign: house.sign || '',
        relevance: this.getHouseRelevance(houseNum, topicKey),
        planets: [],
      };
    });
  }

  private getHouseRelevance(house: number, topic: string): string {
    const relevance: Partial<Record<string, Record<number, string>>> = {
      contract: {
        3: 'Коммуникация и документооборот',
        7: 'Партнерские отношения и соглашения',
        10: 'Профессиональные обязательства',
      },
      meeting: {
        1: 'Личное впечатление',
        3: 'Коммуникация',
        7: 'Взаимодействие с партнерами',
        11: 'Деловые связи',
      },
    };

    return relevance[topic]?.[house] || '';
  }

  /**
   * Получить статистику использования советника для пользователя
   */
  async getUsageStats(userId: string) {
    const key = `advisor:rate_limit:${userId}`;
    const today = new Date().toISOString().split('T')[0];
    const dayKey = `${key}:${today}`;

    const currentUsage = await this.redis.get(dayKey);
    const usageCount = currentUsage ? parseInt(currentUsage, 10) : 0;

    // Get subscription info from subscription service would be better
    // For now returning basic stats
    return {
      date: today,
      used: usageCount,
      // Limit should be fetched from subscription service
      // This is a placeholder
      message: `Использовано ${usageCount} запросов сегодня`,
    };
  }
}
