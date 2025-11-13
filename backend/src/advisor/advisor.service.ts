import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';
import { EphemerisService } from '@/services/ephemeris.service';
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
  };

  constructor(
    private readonly redis: RedisService,
    private readonly ephemeris: EphemerisService,
    private readonly chartService: ChartService,
    private readonly interpretationService: InterpretationService,
  ) {}

  private resolveTopic(topic?: string): string {
    if (!topic) return 'custom';
    const key = topic.toLowerCase();
    return this.TOPIC_CONFIGS[key] ? key : 'custom';
  }

  async evaluate(
    userId: string,
    dto: EvaluateAdviceDto,
  ): Promise<AdviceResponseDto> {
    const tz = dto.timezone || 'UTC';
    const topicKey = this.resolveTopic(dto.topic);
    const cacheKey = `advisor:${userId}:${dto.date}:${topicKey}:${tz}`;

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

    // Generate detailed interpretation
    const interpretation = this.generateInterpretation(
      factors,
      topicKey,
      verdict,
    );

    // Get recommendations
    const recommendations = this.getRecommendations(topicKey, verdict);

    // Analyze relevant houses
    const houses = this.analyzeRelevantHouses(topicKey, natalHouses);

    const topicConfig = this.TOPIC_CONFIGS[topicKey];

    const response: AdviceResponseDto = {
      verdict,
      color,
      score,
      factors,
      aspects,
      houses,
      bestWindows: windows.slice(0, 5), // Top 5 windows
      explanation: interpretation,
      recommendations,
      generatedBy: 'enhanced-rules',
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
  ): Promise<TimeWindow[]> {
    const windows: TimeWindow[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const startISO = new Date(
        `${date}T${hour.toString().padStart(2, '0')}:00:00.000Z`,
      ).toISOString();
      const endISO = new Date(
        `${date}T${hour.toString().padStart(2, '0')}:59:59.999Z`,
      ).toISOString();

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
      conjunction: { base: 10, orb: 8 },
      sextile: { base: 8, orb: 6 },
      square: { base: -10, orb: 8 },
      trine: { base: 12, orb: 8 },
      opposition: { base: -12, orb: 8 },
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

  private generateInterpretation(
    factors: AdvisorFactor[],
    topic: string,
    verdict: AdvisorVerdict,
  ): string {
    const topicConfig = this.TOPIC_CONFIGS[topic];
    const topicDesc = topicConfig?.description || topic;

    let intro = `Анализ для темы "${topicDesc}":\n\n`;

    if (verdict === 'good') {
      intro += `✨ Отличное время! Планетные влияния складываются благоприятно.\n\n`;
    } else if (verdict === 'neutral') {
      intro += `⚖️ Умеренно благоприятное время. Успех зависит от вашей подготовки.\n\n`;
    } else {
      intro += `⚠️ Сложное время. Рекомендуется осторожность или перенос.\n\n`;
    }

    // Key influences
    intro += `Ключевые влияния:\n`;

    const significantFactors = factors
      .filter((f) => Math.abs(f.contribution) > 3)
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    for (const factor of significantFactors) {
      const emoji = factor.contribution > 0 ? '✅' : '⚠️';
      intro += `${emoji} ${factor.label}: ${factor.description || ''}\n`;
    }

    intro += `\nОбщая оценка: ${Math.round(factors.reduce((acc, f) => acc + f.contribution, 50))}/100`;

    return intro;
  }

  private getRecommendations(
    topic: string,
    verdict: AdvisorVerdict,
  ): AdvisorRecommendation[] {
    const topicKey = this.resolveTopic(topic);
    const topicConfig = this.TOPIC_CONFIGS[topicKey];
    const recommendations: AdvisorRecommendation[] = [];

    const textRecommendations = topicConfig?.recommendations?.[verdict] ?? [];

    textRecommendations.forEach((text, index) => {
      recommendations.push({
        text,
        priority: index === 0 ? 'high' : 'medium',
        category:
          verdict === 'good'
            ? 'action'
            : verdict === 'neutral'
              ? 'caution'
              : 'warning',
      });
    });

    return recommendations;
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
