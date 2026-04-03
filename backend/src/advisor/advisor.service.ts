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
  AdvisorAlternativeDate,
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

type AdvisorNatalContext = {
  sunSign: string | null;
  moonSign: string | null;
  ascendantSign: string | null;
  dominantElements: string[];
  dominantQualities: string[];
  personalityTraits: string[];
  lifePurpose: string;
  relationships: string;
  careerPath: string;
  healthFocus: string;
  financialApproach: string;
};

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

  private normalizeStructuredTextList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => this.normalizeStructuredText(item))
      .filter(Boolean)
      .slice(0, 4);
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

    return `advisor:v2:${userId}:${date}:${topicKey}:${timezone}:${locale}:${noteHash}`;
  }

  private buildNatalContext(
    natalData: Record<string, any>,
  ): AdvisorNatalContext {
    const planets = (natalData?.planets || {}) as Record<
      string,
      PlanetData & { sign?: string }
    >;
    const houses = (natalData?.houses || {}) as Record<string, HouseData>;
    const interpretation = (natalData?.interpretation || {}) as Record<
      string,
      any
    >;
    const summary = (interpretation.summary || {}) as Record<string, any>;

    const ascendantSign =
      natalData?.ascendant?.sign ||
      houses['1']?.sign ||
      houses['house1']?.sign ||
      null;

    const pickText = (value: unknown): string =>
      this.normalizeStructuredText(value);
    const pickList = (value: unknown): string[] =>
      this.normalizeStructuredTextList(value);

    return {
      sunSign: planets.sun?.sign || null,
      moonSign: planets.moon?.sign || null,
      ascendantSign,
      dominantElements: pickList(summary.dominantElements),
      dominantQualities: pickList(summary.dominantQualities),
      personalityTraits: pickList(summary.personalityTraits),
      lifePurpose: pickText(summary.lifePurpose),
      relationships: pickText(summary.relationships),
      careerPath: pickText(summary.careerPath),
      healthFocus: pickText(summary.healthFocus),
      financialApproach: pickText(summary.financialApproach),
    };
  }

  private getPrimaryNatalSignal(
    natalContext: AdvisorNatalContext,
  ): string | null {
    return (
      natalContext.personalityTraits[0] ||
      natalContext.dominantElements[0] ||
      natalContext.dominantQualities[0] ||
      natalContext.sunSign ||
      natalContext.ascendantSign ||
      null
    );
  }

  private buildNatalDecisionBasis(
    topicKey: string,
    natalContext: AdvisorNatalContext,
    locale: AdvisorLocale,
  ): string {
    const signal = this.getPrimaryNatalSignal(natalContext);
    const relationText = natalContext.relationships;
    const careerText = natalContext.careerPath;
    const healthText = natalContext.healthFocus;
    const financeText = natalContext.financialApproach;
    const lifePurpose = natalContext.lifePurpose;
    const element = natalContext.dominantElements[0];

    const snippets: Record<AdvisorLocale, Record<string, string>> = {
      ru: {
        travel: relationText
          ? `Поверх натала здесь важно, что ваш профиль лучше раскрывается через ${relationText.toLowerCase()}. Поэтому формат поездки должен совпадать с вашим внутренним ритмом, а не только с желанием сменить картинку.`
          : signal
            ? `Поверх натала здесь важно, что ваш профиль тянется к качеству "${signal}". Поэтому поездка должна совпадать с вашим темпом и способом восстанавливаться.`
            : 'Поверх натала здесь важно выбирать поездку не по импульсу, а по тому, как вы реально восстанавливаете силы и проживаете впечатления.',
        date: relationText
          ? `Поверх натала здесь важно, что в отношениях у вас работает сценарий: ${relationText.toLowerCase()}. Поэтому решение по свиданию должно поддерживать этот стиль контакта.`
          : signal
            ? `Поверх натала здесь важно, что в контакте вы проявляетесь через "${signal}". Поэтому формат свидания должен подчеркивать это, а не ломать вас об чужой темп.`
            : 'Поверх натала здесь важно выбирать формат свидания, который соответствует вашему естественному способу сближаться.',
        meeting: careerText
          ? `Поверх натала здесь важно, что ваш рабочий стиль описывается так: ${careerText.toLowerCase()}. Поэтому встреча должна быть собранной и понятной по цели.`
          : signal
            ? `Поверх натала здесь важно, что вы лучше действуете через "${signal}". Поэтому встречу стоит строить в вашем естественном стиле коммуникации.`
            : 'Поверх натала здесь важно опираться на ваш естественный стиль общения, а не на давление ситуации.',
        negotiation: careerText
          ? `Поверх натала здесь важно, что ваш путь в деловых вопросах раскрывается через ${careerText.toLowerCase()}. Поэтому переговоры должны идти в формате, где вы сохраняете позицию и ритм.`
          : signal
            ? `Поверх натала здесь важно, что ваш профиль в решениях держится на качестве "${signal}". Поэтому переговоры лучше вести в стиле, который оставляет вам внутреннюю опору.`
            : 'Поверх натала здесь важно вести переговоры так, чтобы не потерять свою естественную опору и темп.',
        contract: financeText
          ? `Поверх натала здесь важно, что в материальных вопросах у вас работает линия: ${financeText.toLowerCase()}. Поэтому решение по договору должно быть не только выгодным, но и устойчивым для вас.`
          : careerText
            ? `Поверх натала здесь важно, что в делах вы раскрываетесь через ${careerText.toLowerCase()}. Поэтому контракт нужно оценивать через устойчивость, а не только через быстрый плюс.`
            : 'Поверх натала здесь важно выбирать только те договоренности, которые выдерживают вашу реальную долгую траекторию.',
        purchase: financeText
          ? `Поверх натала здесь важно, что ваш денежный стиль описывается так: ${financeText.toLowerCase()}. Поэтому покупка должна совпадать с вашей долгой логикой, а не с моментным импульсом.`
          : signal
            ? `Поверх натала здесь важно, что вы выбираете лучше, когда опираетесь на "${signal}". Поэтому покупку надо фильтровать через реальную ценность, а не эмоцию момента.`
            : 'Поверх натала здесь важно, чтобы покупка выдерживала ваш настоящий ритм, бюджет и стиль решений.',
        health: healthText
          ? `Поверх натала здесь важно, что в теме тела и восстановления у вас выделяется: ${healthText.toLowerCase()}. Поэтому решение по здоровью должно уважать именно этот способ нагрузки и восстановления.`
          : element
            ? `Поверх натала здесь важно, что доминирующая стихия ${element} задает ваш телесный ритм. Поэтому режим нагрузки и восстановления нужно выбирать под него.`
            : 'Поверх натала здесь важно учитывать ваш природный ритм тела, а не подстраиваться под чужую норму.',
        custom: lifePurpose
          ? `Поверх натала здесь важно, что ваша карта в целом ведет к такому вектору: ${lifePurpose.toLowerCase()}. Поэтому решение стоит сверять не только с выгодой дня, но и с вашей траекторией.`
          : signal
            ? `Поверх натала здесь важно, что ваш устойчивый способ действовать связан с "${signal}". Поэтому решение нужно проверять на совместимость с этим ядром.`
            : 'Поверх натала здесь важно, чтобы решение не спорило с вашим базовым способом жить, чувствовать и действовать.',
      },
      en: {
        travel: relationText
          ? `On top of the natal chart, your profile opens best through ${relationText.toLowerCase()}. So the trip format should match your inner rhythm, not just the wish to escape.`
          : signal
            ? `On top of the natal chart, your profile leans toward "${signal}". So the trip should match your pace and way of restoring energy.`
            : 'On top of the natal chart, travel should be chosen by how you actually recharge, not by impulse alone.',
        date: relationText
          ? `On top of the natal chart, your relationship pattern is described like this: ${relationText.toLowerCase()}. So the date format should support that style of closeness.`
          : signal
            ? `On top of the natal chart, you connect through "${signal}". So the date should highlight that style instead of forcing a foreign pace.`
            : 'On top of the natal chart, the date should fit the way you naturally build closeness.',
        meeting: careerText
          ? `On top of the natal chart, your work style reads as ${careerText.toLowerCase()}. So the meeting should be structured and goal-clear.`
          : signal
            ? `On top of the natal chart, you work best through "${signal}". So the meeting should be built in your natural communication style.`
            : 'On top of the natal chart, the meeting should respect your natural communication style, not the pressure of the moment.',
        negotiation: careerText
          ? `On top of the natal chart, your business path works through ${careerText.toLowerCase()}. So the negotiation should preserve your position and pacing.`
          : signal
            ? `On top of the natal chart, your decision style rests on "${signal}". So negotiations should keep that inner leverage intact.`
            : 'On top of the natal chart, negotiations should keep your natural leverage and pace intact.',
        contract: financeText
          ? `On top of the natal chart, your material pattern works through ${financeText.toLowerCase()}. So a contract should feel sustainable for you, not just profitable on paper.`
          : careerText
            ? `On top of the natal chart, your work path expresses through ${careerText.toLowerCase()}. So the contract should be judged by durability, not only by a quick upside.`
            : 'On top of the natal chart, only the agreements that support your real long path make sense.',
        purchase: financeText
          ? `On top of the natal chart, your financial style reads as ${financeText.toLowerCase()}. So the purchase should match your long logic, not a momentary urge.`
          : signal
            ? `On top of the natal chart, you choose better when you lean on "${signal}". So the purchase should be filtered through real value, not momentary emotion.`
            : 'On top of the natal chart, the purchase should fit your real rhythm, budget, and decision style.',
        health: healthText
          ? `On top of the natal chart, your body and recovery theme is ${healthText.toLowerCase()}. So the health decision should respect that natural rhythm.`
          : element
            ? `On top of the natal chart, the dominant ${element} element shapes your body rhythm. So effort and recovery should be chosen accordingly.`
            : 'On top of the natal chart, the health decision should respect your natural body rhythm, not someone else’s norm.',
        custom: lifePurpose
          ? `On top of the natal chart, your broader path points toward ${lifePurpose.toLowerCase()}. So the decision should be checked against your deeper trajectory, not only the mood of the day.`
          : signal
            ? `On top of the natal chart, your stable way of acting is tied to "${signal}". So the decision should be tested against that core.`
            : 'On top of the natal chart, the decision should not fight your basic way of living, feeling, and acting.',
      },
      es: {
        travel: relationText
          ? `Por encima del timing del día, tu carta natal se abre mejor a través de ${relationText.toLowerCase()}. Por eso el viaje debe encajar con tu ritmo interno y no solo con las ganas de escapar.`
          : signal
            ? `Por encima del timing del día, tu perfil natal se inclina hacia "${signal}". Por eso el viaje debe coincidir con tu forma de recargar energía.`
            : 'Por encima del timing del día, el viaje debe elegirse por cómo realmente recuperas energía, no solo por impulso.',
        date: relationText
          ? `Por encima del timing del día, tu patrón relacional se describe así: ${relationText.toLowerCase()}. Por eso la cita debe sostener esa forma de cercanía.`
          : signal
            ? `Por encima del timing del día, conectas a través de "${signal}". Por eso la cita debe apoyar ese estilo y no imponerte un ritmo ajeno.`
            : 'Por encima del timing del día, la cita debe encajar con tu forma natural de acercarte.',
        meeting: careerText
          ? `Por encima del timing del día, tu estilo de trabajo se lee como ${careerText.toLowerCase()}. Por eso la reunión debe ser clara y bien encuadrada.`
          : signal
            ? `Por encima del timing del día, funcionas mejor a través de "${signal}". Por eso la reunión debe seguir tu estilo natural de comunicación.`
            : 'Por encima del timing del día, la reunión debe respetar tu estilo natural de comunicación.',
        negotiation: careerText
          ? `Por encima del timing del día, tu camino profesional funciona a través de ${careerText.toLowerCase()}. Por eso la negociación debe preservar tu posición y tu ritmo.`
          : signal
            ? `Por encima del timing del día, tu estilo de decisión se apoya en "${signal}". Por eso la negociación debe mantener esa palanca interna.`
            : 'Por encima del timing del día, la negociación debe conservar tu ritmo y tu base interna.',
        contract: financeText
          ? `Por encima del timing del día, tu patrón material funciona a través de ${financeText.toLowerCase()}. Por eso un contrato debe sentirse sostenible para ti, no solo rentable en papel.`
          : careerText
            ? `Por encima del timing del día, tu camino laboral se expresa por ${careerText.toLowerCase()}. Por eso el contrato debe medirse por su solidez, no solo por la ganancia rápida.`
            : 'Por encima del timing del día, solo tienen sentido los acuerdos que sostienen tu camino real a largo plazo.',
        purchase: financeText
          ? `Por encima del timing del día, tu estilo financiero se lee como ${financeText.toLowerCase()}. Por eso la compra debe coincidir con tu lógica de largo plazo.`
          : signal
            ? `Por encima del timing del día, eliges mejor cuando te apoyas en "${signal}". Por eso la compra debe pasar por el filtro del valor real, no de la emoción del momento.`
            : 'Por encima del timing del día, la compra debe encajar con tu ritmo real, tu presupuesto y tu estilo de decisión.',
        health: healthText
          ? `Por encima del timing del día, tu tema corporal y de recuperación es ${healthText.toLowerCase()}. Por eso la decisión de salud debe respetar ese ritmo natural.`
          : element
            ? `Por encima del timing del día, el elemento dominante ${element} marca tu ritmo corporal. Por eso el esfuerzo y la recuperación deben elegirse en función de eso.`
            : 'Por encima del timing del día, la decisión de salud debe respetar tu ritmo natural del cuerpo.',
        custom: lifePurpose
          ? `Por encima del timing del día, tu camino general apunta hacia ${lifePurpose.toLowerCase()}. Por eso la decisión debe revisarse frente a tu trayectoria profunda, no solo frente al ánimo del día.`
          : signal
            ? `Por encima del timing del día, tu forma estable de actuar está ligada a "${signal}". Por eso la decisión debe medirse contra ese núcleo.`
            : 'Por encima del timing del día, la decisión no debería contradecir tu forma básica de vivir, sentir y actuar.',
      },
    };

    return snippets[locale][topicKey] || snippets[locale].custom;
  }

  private getClarifyingQuestion(
    topicKey: string,
    customNote: string,
    locale: AdvisorLocale,
  ): string | undefined {
    const note = this.normalizeCustomNote(customNote);
    const normalized = note.toLowerCase();
    const words = note.split(/\s+/).filter(Boolean);
    const looksSpecific =
      note.length >= 18 &&
      words.length >= 3 &&
      ![
        'встреча',
        'свидание',
        'поездка',
        'путешествие',
        'переговоры',
        'покупка',
        'здоровье',
        'контракт',
        'другое',
      ].includes(normalized);

    if (looksSpecific) {
      return undefined;
    }

    const questions: Record<AdvisorLocale, Record<string, string>> = {
      ru: {
        contract:
          'Что именно вы подписываете: новый договор, продление или спорное соглашение, где важны жёсткие условия?',
        meeting:
          'Что это за встреча: знакомство, деловая договорённость, конфликтный разговор или финальное согласование?',
        negotiation:
          'В переговорах для вас сейчас важнее продавить условия, сохранить отношения или просто закрыть сделку?',
        date: 'Это первое свидание, попытка сблизиться или разговор, где нужно прояснить чувства?',
        travel:
          'Какой отдых вам нужен: море, город, природа, уединение или активная поездка с движением?',
        purchase:
          'О какой покупке речь: техника, машина, жильё, инвестиция или что-то для комфорта и красоты?',
        health:
          'Речь о диагностике, плановой процедуре, восстановлении или о нагрузке/тренировке?',
        custom:
          'Какое одно решение для вас сейчас главное: выбрать вариант, назначить дату, идти в разговор или отказаться?',
      },
      en: {
        contract:
          'What exactly are you signing: a new agreement, an extension, or a contract with risky terms that need extra scrutiny?',
        meeting:
          'What kind of meeting is this: a first introduction, a working discussion, a tense conversation, or a final alignment?',
        negotiation:
          'In this negotiation, is your main goal to win better terms, preserve the relationship, or simply close the deal?',
        date: 'Is this a first date, an attempt to get closer, or a conversation where feelings need to be clarified?',
        travel:
          'What kind of trip do you want right now: sea, city, nature, retreat, or an active weekend with movement?',
        purchase:
          'What are you choosing: tech, a car, property, an investment, or something focused on comfort and aesthetics?',
        health:
          'Are you asking about diagnostics, a planned procedure, recovery, or physical load and training?',
        custom:
          'What is the single key decision right now: choose an option, pick a date, have the conversation, or walk away?',
      },
      es: {
        contract:
          '¿Qué vas a firmar exactamente: un acuerdo nuevo, una renovación o un contrato con condiciones delicadas?',
        meeting:
          '¿Qué tipo de encuentro es: una primera reunión, una conversación de trabajo, un diálogo tenso o un cierre final?',
        negotiation:
          'En esta negociación, ¿te importa más conseguir mejores términos, cuidar la relación o simplemente cerrar?',
        date: '¿Es una primera cita, un intento de acercarte más o una conversación para aclarar sentimientos?',
        travel:
          '¿Qué tipo de viaje necesitas ahora: mar, ciudad, naturaleza, retiro o un fin de semana activo con movimiento?',
        purchase:
          '¿Qué compra estás considerando: tecnología, coche, vivienda, inversión o algo de confort y estética?',
        health:
          '¿Hablas de diagnóstico, un procedimiento programado, recuperación o carga física y entrenamiento?',
        custom:
          '¿Cuál es la decisión principal ahora mismo: elegir opción, fijar fecha, tener la conversación o retirarte?',
      },
    };

    return questions[locale][topicKey] || questions[locale].custom;
  }

  private isReflectiveRequest(customNote: string): boolean {
    const normalized = this.normalizeCustomNote(customNote).toLowerCase();
    if (!normalized || normalized.length < 24) {
      return false;
    }

    const reflectiveMarkers = [
      'не знаю',
      'сомневаюсь',
      'думаю',
      'стоит ли',
      'хочу понять',
      'не понимаю',
      'боюсь',
      'переживаю',
      'мечусь',
      'разрываюсь',
      'не могу решить',
      'should i',
      'i do not know',
      'i don’t know',
      'i am not sure',
      'i am unsure',
      'i keep thinking',
      'i am torn',
      'me cuesta decidir',
      'no se',
      'no sé',
      'dudo',
      'estoy pensando',
      'no puedo decidir',
      'tengo miedo',
    ];

    return reflectiveMarkers.some((marker) => normalized.includes(marker));
  }

  private buildDecisionSuggestion(
    topicKey: string,
    verdict: AdvisorVerdict,
    locale: AdvisorLocale,
    natalContext: AdvisorNatalContext,
    alternativeDate?: AdvisorAlternativeDate | null,
  ): string {
    const suggestions: Record<
      AdvisorLocale,
      Record<string, Record<AdvisorVerdict, string>>
    > = {
      ru: {
        contract: {
          good: 'Лучшее решение — идти в подписание, но только по заранее проверенной версии документа.',
          neutral:
            'Лучшее решение — не отменять, а сузить задачу до одного конкретного решения и перепроверки условий.',
          challenging:
            'Лучшее решение — не подписывать на эмоции и не закрывать вопрос любой ценой; лучше взять паузу и вернуться позже.',
        },
        meeting: {
          good: 'Лучшее решение — идти в живой разговор и быстро переходить к главной теме без долгой раскачки.',
          neutral:
            'Лучшее решение — оставить встречу, но заранее определить 1-2 цели и держать разговор в рамке.',
          challenging:
            'Лучшее решение — не форсировать откровенный или конфликтный разговор; лучше смягчить формат или перенести.',
        },
        negotiation: {
          good: 'Лучшее решение — заходить в переговоры с чёткой позицией и заранее понятной нижней границей условий.',
          neutral:
            'Лучшее решение — вести переговоры коротко, не раскрывая сразу все уступки и оставляя пространство для паузы.',
          challenging:
            'Лучшее решение — не пытаться продавить сделку сегодня; безопаснее сохранить рычаги и вернуться к разговору позже.',
        },
        date: {
          good: 'Лучшее решение — выбрать простой живой формат, где легко говорить и быстро чувствуется химия.',
          neutral:
            'Лучшее решение — не перегружать свидание ожиданиями и идти в короткий, спокойный формат.',
          challenging:
            'Лучшее решение — не делать ставку на тяжёлый разговор о чувствах; лучше снизить эмоциональную нагрузку или перенести.',
        },
        travel: {
          good: 'Лучшее решение — выбирать поездку, в которой есть движение, свежие впечатления и понятная логистика.',
          neutral:
            'Лучшее решение — брать короткий и управляемый формат отдыха, а не перегруженный маршрут.',
          challenging:
            'Лучшее решение — не гнаться за сложной поездкой сейчас; лучше сократить маршрут или выбрать более спокойную дату.',
        },
        purchase: {
          good: 'Лучшее решение — покупать то, что уже прошло сравнение и отвечает практической задаче, а не импульсу.',
          neutral:
            'Лучшее решение — не спешить с полной оплатой, пока не сверены характеристики, цена и альтернатива.',
          challenging:
            'Лучшее решение — не покупать на эмоциях и не закрывать покупку до полной проверки.',
        },
        health: {
          good: 'Лучшее решение — идти в режим поддержки тела: плановая процедура, мягкая нагрузка или восстановление по расписанию.',
          neutral:
            'Лучшее решение — снизить интенсивность и выбрать формат, где есть контроль, а не героизм.',
          challenging:
            'Лучшее решение — не нагружать организм сверх меры и не форсировать то, что можно перенести.',
        },
        custom: {
          good: 'Лучшее решение — выбрать один главный шаг и довести его до результата без лишних отвлечений.',
          neutral:
            'Лучшее решение — сузить задачу до самого важного и убрать всё, что не влияет на исход.',
          challenging:
            'Лучшее решение — не принимать финальное решение в лоб; лучше собрать недостающие данные и взять паузу.',
        },
      },
      en: {
        contract: {
          good: 'The best move is to sign, but only from a version of the document you have already checked carefully.',
          neutral:
            'The best move is not to cancel, but to narrow the task to one concrete decision and a clean review of terms.',
          challenging:
            'The best move is not to sign under emotion or urgency; pause and come back later.',
        },
        meeting: {
          good: 'The best move is to have the conversation live and move to the main point quickly.',
          neutral:
            'The best move is to keep the meeting but define one or two goals in advance and hold the frame.',
          challenging:
            'The best move is not to force a deep or conflict-heavy talk today; soften the format or postpone it.',
        },
        negotiation: {
          good: 'The best move is to enter negotiations with a clear position and a known minimum acceptable outcome.',
          neutral:
            'The best move is to negotiate briefly, without revealing every concession at once.',
          challenging:
            'The best move is not to force the deal today; preserve leverage and return later.',
        },
        date: {
          good: 'The best move is a simple live format where chemistry can show up quickly.',
          neutral:
            'The best move is a shorter, calmer date without heavy expectations.',
          challenging:
            'The best move is not to turn the date into a heavy feelings talk; reduce the emotional load or postpone.',
        },
        travel: {
          good: 'The best move is a trip with movement, fresh impressions, and clean logistics.',
          neutral:
            'The best move is a short manageable break rather than an overloaded route.',
          challenging:
            'The best move is not to chase a complicated trip right now; shorten the route or pick a calmer date.',
        },
        purchase: {
          good: 'The best move is to buy what already matches a practical need, not just an emotional impulse.',
          neutral:
            'The best move is to hold back from final payment until price, specs, and alternatives are checked.',
          challenging:
            'The best move is not to buy emotionally or close the purchase before full verification.',
        },
        health: {
          good: 'The best move is supportive care for the body: a planned procedure, measured activity, or proper recovery.',
          neutral:
            'The best move is to lower intensity and choose a format with control, not heroics.',
          challenging:
            'The best move is not to overload the body or force what can be moved to a better day.',
        },
        custom: {
          good: 'The best move is to pick one main step and finish it without scattering your energy.',
          neutral:
            'The best move is to reduce the task to what really changes the outcome.',
          challenging:
            'The best move is not to push a final decision head-on; gather the missing facts and pause.',
        },
      },
      es: {
        contract: {
          good: 'La mejor decisión es firmar, pero solo con una versión del documento ya revisada con calma.',
          neutral:
            'La mejor decisión no es cancelar, sino reducir la tarea a una sola decisión concreta y una revisión limpia.',
          challenging:
            'La mejor decisión es no firmar desde la emoción o la urgencia; mejor hacer una pausa y volver después.',
        },
        meeting: {
          good: 'La mejor decisión es ir al encuentro en vivo y pasar rápido al punto principal.',
          neutral:
            'La mejor decisión es mantener la reunión, pero con una o dos metas claras desde el principio.',
          challenging:
            'La mejor decisión es no forzar una conversación profunda o conflictiva hoy; mejor suavizar el formato o posponer.',
        },
        negotiation: {
          good: 'La mejor decisión es entrar a negociar con una postura clara y un mínimo aceptable definido.',
          neutral:
            'La mejor decisión es negociar en corto, sin mostrar todas las concesiones de entrada.',
          challenging:
            'La mejor decisión es no forzar el cierre hoy; conviene conservar margen y volver más tarde.',
        },
        date: {
          good: 'La mejor decisión es un formato simple y vivo donde la química pueda aparecer rápido.',
          neutral:
            'La mejor decisión es una cita corta y tranquila, sin expectativas demasiado pesadas.',
          challenging:
            'La mejor decisión es no convertir la cita en una conversación emocionalmente pesada; mejor bajar la intensidad o posponer.',
        },
        travel: {
          good: 'La mejor decisión es un viaje con movimiento, aire nuevo y logística clara.',
          neutral:
            'La mejor decisión es una escapada corta y manejable, no una ruta sobrecargada.',
          challenging:
            'La mejor decisión es no perseguir un viaje complicado ahora; mejor acortar la ruta o elegir otra fecha.',
        },
        purchase: {
          good: 'La mejor decisión es comprar algo que responda a una necesidad práctica y no solo al impulso.',
          neutral:
            'La mejor decisión es no cerrar el pago final hasta comprobar precio, especificaciones y alternativas.',
          challenging:
            'La mejor decisión es no comprar desde la emoción ni cerrar nada sin verificación completa.',
        },
        health: {
          good: 'La mejor decisión es cuidar el cuerpo con apoyo: procedimiento previsto, actividad medida o recuperación real.',
          neutral:
            'La mejor decisión es bajar la intensidad y elegir un formato con control, no con sobreesfuerzo.',
          challenging:
            'La mejor decisión es no cargar el cuerpo de más ni forzar algo que puede moverse a un día mejor.',
        },
        custom: {
          good: 'La mejor decisión es elegir un paso principal y llevarlo hasta el resultado sin dispersarte.',
          neutral:
            'La mejor decisión es reducir la tarea a lo que realmente cambia el resultado.',
          challenging:
            'La mejor decisión es no empujar una decisión final de frente; reúne los datos que faltan y haz una pausa.',
        },
      },
    };

    const natalBasis = this.buildNatalDecisionBasis(
      topicKey,
      natalContext,
      locale,
    );
    const base =
      suggestions[locale][topicKey]?.[verdict] ||
      suggestions[locale].custom[verdict];

    if (verdict === 'challenging' && alternativeDate?.date) {
      if (locale === 'en') {
        return `${natalBasis} ${base} The nearest cleaner date is ${alternativeDate.date}${alternativeDate.bestWindow ? ` at ${alternativeDate.bestWindow}` : ''}.`;
      }
      if (locale === 'es') {
        return `${natalBasis} ${base} La fecha más limpia cercana es ${alternativeDate.date}${alternativeDate.bestWindow ? ` en ${alternativeDate.bestWindow}` : ''}.`;
      }
      return `${natalBasis} ${base} Ближайшая более чистая дата — ${alternativeDate.date}${alternativeDate.bestWindow ? ` в окно ${alternativeDate.bestWindow}` : ''}.`;
    }

    return `${natalBasis} ${base}`;
  }

  private buildDirectAnswer(
    topicKey: string,
    topicDescription: string,
    customNote: string,
    verdict: AdvisorVerdict,
    bestWindow: TimeWindow | null,
    timeZone: string,
    locale: AdvisorLocale,
    date: string,
    natalContext: AdvisorNatalContext,
    alternativeDate?: AdvisorAlternativeDate | null,
  ): string {
    const subject = this.normalizeCustomNote(customNote) || topicDescription;
    const bestWindowLabel = this.formatAdvisorWindow(
      bestWindow,
      timeZone,
      locale,
    );
    const reflectiveMode = this.isReflectiveRequest(customNote);
    const natalBasis = this.buildNatalDecisionBasis(
      topicKey,
      natalContext,
      locale,
    );
    const decisionSuggestion = this.buildDecisionSuggestion(
      topicKey,
      verdict,
      locale,
      natalContext,
      alternativeDate,
    );
    const alternativeDateText = alternativeDate?.date
      ? `${alternativeDate.date}${alternativeDate.bestWindow ? ` (${alternativeDate.bestWindow})` : ''}`
      : '';

    if (locale === 'en') {
      if (reflectiveMode) {
        return `${decisionSuggestion} For "${subject}", the most workable slot is ${bestWindowLabel || 'the strongest part of the day'}.`;
      }
      if (verdict === 'good') {
        return `${natalBasis} Yes, ${subject} fits ${date}. Put the main step into ${bestWindowLabel || 'the strongest part of the day'} and act decisively.`;
      }
      if (verdict === 'neutral') {
        return `${natalBasis} You can do ${subject} on ${date}, but only with structure and a backup plan. The safest slot is ${bestWindowLabel || 'the strongest part of the day'}.`;
      }
      return `${natalBasis} I would not force ${subject} on ${date}. The day carries more friction than support; ${alternativeDateText ? `the nearest cleaner option is ${alternativeDateText}.` : 'if you can, postpone it.'}`;
    }

    if (locale === 'es') {
      if (reflectiveMode) {
        return `${decisionSuggestion} Para "${subject}", la franja más útil es ${bestWindowLabel || 'el tramo más fuerte del día'}.`;
      }
      if (verdict === 'good') {
        return `${natalBasis} Sí, ${subject} encaja bien en ${date}. Coloca el paso principal en ${bestWindowLabel || 'el tramo más fuerte del día'} y actúa con claridad.`;
      }
      if (verdict === 'neutral') {
        return `${natalBasis} Puedes hacer ${subject} en ${date}, pero solo con estructura y plan B. La franja más segura es ${bestWindowLabel || 'el tramo más fuerte del día'}.`;
      }
      return `${natalBasis} No forzaría ${subject} en ${date}. El día trae más fricción que apoyo; ${alternativeDateText ? `la opción más cercana y limpia es ${alternativeDateText}.` : 'si puedes, mejor posponerlo.'}`;
    }

    if (reflectiveMode) {
      return `${decisionSuggestion} Для запроса "${subject}" самое рабочее окно — ${bestWindowLabel || 'наиболее сильная часть дня'}.`;
    }

    if (verdict === 'good') {
      return `${natalBasis} Да, ${subject} на ${date} выглядит уместно. Главный шаг лучше ставить в окно ${bestWindowLabel || 'с самой сильной поддержкой дня'} и действовать без расфокуса.`;
    }
    if (verdict === 'neutral') {
      return `${natalBasis} Сделать ${subject} на ${date} можно, но только с чётким планом и запасным вариантом. Самое безопасное окно — ${bestWindowLabel || 'наиболее сильная часть дня'}.`;
    }
    return `${natalBasis} Я бы не форсировал(а) ${subject} на ${date}. День даёт больше трения, чем опоры; ${alternativeDateText ? `ближайшая более чистая дата — ${alternativeDateText}.` : 'если есть возможность, лучше перенести.'}`;
  }

  private buildRiskWarnings(
    topicKey: string,
    verdict: AdvisorVerdict,
    factors: AdvisorFactor[],
    customNote: string,
    locale: AdvisorLocale,
  ): string[] {
    const strongestNegative = this.getSignificantFactors(
      factors,
      (factor) => factor.contribution < -2,
    )
      .slice(0, 2)
      .map(
        (factor) =>
          `${factor.label}: ${this.trimSentence(factor.description || '')}.`,
      );

    const genericRisks: Record<AdvisorLocale, Record<string, string[]>> = {
      ru: {
        contract: [
          'Можно пропустить спорный пункт, срок или финансовое ограничение.',
          'Высока вероятность подписать документ под давлением или в спешке.',
        ],
        meeting: [
          'Разговор может уйти в сторону, а ключевые договорённости останутся размытыми.',
          'Люди могут услышать не то, что вы реально имели в виду.',
        ],
        negotiation: [
          'Оппонент может занять жёсткую позицию и продавить невыгодные условия.',
          'Под давлением легко согласиться на уступку, которую потом сложно отыграть назад.',
        ],
        date: [
          'Эмоциональный фон может дать лишние ожидания, резкость или неловкость.',
          'Непростые темы легко испортят атмосферу быстрее, чем вы успеете это заметить.',
        ],
        travel: [
          'Есть риск задержек, путаницы с логистикой или лишней усталости в дороге.',
          'Маршрут может оказаться красивым на бумаге, но нервным и перегруженным по факту.',
        ],
        purchase: [
          'Высок риск переплатить, сделать импульсивный выбор или не заметить скрытый минус.',
          'На эмоциях легко взять не то, что действительно нужно в долгую.',
        ],
        health: [
          'Организм может хуже переносить лишнюю нагрузку или спешку с процедурами.',
          'Если речь о восстановлении, перегиб сейчас даст откат вместо прогресса.',
        ],
        custom: [
          'На этом фоне легко спутать срочность с важностью и принять решение слишком резко.',
          'Если не сузить задачу, день быстро рассыпается на отвлекающие факторы.',
        ],
      },
      en: {
        contract: [
          'A risky clause, deadline, or financial limit can slip through unnoticed.',
          'There is a real chance of signing under pressure or haste.',
        ],
        meeting: [
          'The conversation can drift while the actual agreements remain blurry.',
          'People may hear something different from what you intended.',
        ],
        negotiation: [
          'The other side may harden their position and push unfavorable terms.',
          'Under pressure it becomes easier to concede something you will regret later.',
        ],
        date: [
          'The emotional tone can create extra expectations, sharpness, or awkwardness.',
          'Difficult topics can spoil the atmosphere faster than you notice.',
        ],
        travel: [
          'There is a risk of delays, routing confusion, or unnecessary fatigue on the road.',
          'The trip may look attractive on paper but feel tense and overloaded in practice.',
        ],
        purchase: [
          'The risk of overpaying, buying impulsively, or missing a hidden downside is high.',
          'Emotion can pull you toward something that is not truly right long term.',
        ],
        health: [
          'Your system may tolerate extra load or rushed procedures worse than usual.',
          'If the goal is recovery, overdoing it now can create a setback instead of progress.',
        ],
        custom: [
          'This is the kind of day when urgency can masquerade as importance.',
          'If the task is not narrowed down, the day scatters quickly into noise.',
        ],
      },
      es: {
        contract: [
          'Puede pasarse por alto una cláusula delicada, un plazo o una limitación financiera.',
          'Hay riesgo real de firmar con presión o prisa.',
        ],
        meeting: [
          'La conversación puede desviarse y dejar borrosos los acuerdos principales.',
          'Los demás pueden entender algo distinto de lo que realmente quisiste decir.',
        ],
        negotiation: [
          'La otra parte puede endurecer su postura y empujar términos desfavorables.',
          'Bajo presión es más fácil ceder algo que luego te costará recuperar.',
        ],
        date: [
          'El tono emocional puede traer expectativas extra, incomodidad o demasiada sensibilidad.',
          'Los temas difíciles pueden estropear la atmósfera más rápido de lo esperado.',
        ],
        travel: [
          'Hay riesgo de retrasos, confusión logística o cansancio innecesario en el trayecto.',
          'El viaje puede parecer ideal en papel pero sentirse tenso y sobrecargado en la práctica.',
        ],
        purchase: [
          'Es alto el riesgo de pagar de más, comprar por impulso o no ver un punto débil oculto.',
          'La emoción puede llevarte a elegir algo poco conveniente a largo plazo.',
        ],
        health: [
          'El cuerpo puede tolerar peor la carga extra o los procedimientos apresurados.',
          'Si buscas recuperación, excederte ahora puede traer retroceso en vez de mejora.',
        ],
        custom: [
          'Es un día en el que la urgencia puede disfrazarse de importancia.',
          'Si no reduces la tarea a lo esencial, el día se dispersa rápidamente.',
        ],
      },
    };

    const risks: string[] = [];

    if (verdict !== 'good') {
      risks.push(
        ...(genericRisks[locale][topicKey] || genericRisks[locale].custom),
      );
    }

    if (strongestNegative.length > 0) {
      risks.unshift(...strongestNegative);
    }

    if (customNote && verdict === 'challenging') {
      if (locale === 'en') {
        risks.unshift(
          `For "${customNote}", the main threat is acting too fast before the situation is fully checked.`,
        );
      } else if (locale === 'es') {
        risks.unshift(
          `Para "${customNote}", el riesgo principal es actuar demasiado rápido antes de comprobar toda la situación.`,
        );
      } else {
        risks.unshift(
          `Для задачи "${customNote}" главный риск — принять решение быстрее, чем вы успеете всё перепроверить.`,
        );
      }
    }

    return risks.slice(0, 4);
  }

  private buildAlternativeReason(
    locale: AdvisorLocale,
    score: number,
    bestWindowLabel: string,
    strongestPositive?: AdvisorFactor,
  ): string {
    const factorBit = strongestPositive
      ? this.trimSentence(
          strongestPositive.description || strongestPositive.label,
        )
      : '';

    if (locale === 'en') {
      return factorBit
        ? `This date scores ${score}/100, has a stronger window ${bestWindowLabel}, and the clearest support comes from ${factorBit}.`
        : `This date scores ${score}/100 and gives you a cleaner window ${bestWindowLabel} with less friction.`;
    }

    if (locale === 'es') {
      return factorBit
        ? `Esta fecha marca ${score}/100, tiene una mejor franja ${bestWindowLabel}, y el apoyo más claro viene de ${factorBit}.`
        : `Esta fecha marca ${score}/100 y te da una franja ${bestWindowLabel} más limpia y con menos fricción.`;
    }

    return factorBit
      ? `Эта дата даёт ${score}/100, более сильное окно ${bestWindowLabel}, а главный плюс там — ${factorBit}.`
      : `Эта дата даёт ${score}/100 и более чистое окно ${bestWindowLabel} с меньшим количеством трения.`;
  }

  private async findAlternativeDate(input: {
    date: string;
    timeZone: string;
    natalPlanets: Record<string, PlanetData>;
    topicKey: string;
    locale: AdvisorLocale;
    currentScore: number;
  }): Promise<AdvisorAlternativeDate | null> {
    const minimumTarget = input.currentScore < 50 ? 60 : 70;
    let fallbackCandidate: AdvisorAlternativeDate | null = null;

    for (let offset = 1; offset <= 7; offset += 1) {
      const candidateDate = this.shiftIsoDate(input.date, offset);
      const windows = await this.calculateHourlyWindows(
        candidateDate,
        input.natalPlanets,
        input.topicKey,
        input.timeZone,
      );
      const bestWindow = windows[0] || null;
      const bestScore = bestWindow?.score ?? 0;

      if (!bestWindow || bestScore <= input.currentScore) {
        continue;
      }

      const jd = this.ephemeris.dateToJulianDay(new Date(bestWindow.startISO));
      const currentPlanets = await this.ephemeris.calculatePlanets(jd);
      const { factors } = await this.evaluateTimePoint(
        currentPlanets,
        input.natalPlanets,
        input.topicKey,
      );
      const strongestPositive = this.getSignificantFactors(
        factors,
        (factor) => factor.contribution > 2,
      )[0];
      const bestWindowLabel = this.formatAdvisorWindow(
        bestWindow,
        input.timeZone,
        input.locale,
      );
      const candidate: AdvisorAlternativeDate = {
        date: candidateDate,
        score: bestScore,
        bestWindow: bestWindowLabel || undefined,
        reason: this.buildAlternativeReason(
          input.locale,
          bestScore,
          bestWindowLabel || '',
          strongestPositive,
        ),
      };

      if (bestScore >= minimumTarget && bestScore >= input.currentScore + 8) {
        return candidate;
      }

      if (!fallbackCandidate || candidate.score > fallbackCandidate.score) {
        fallbackCandidate = candidate;
      }
    }

    return fallbackCandidate;
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
    const natalContext = this.buildNatalContext(natalData);

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
    const alternativeDate =
      verdict === 'good'
        ? null
        : await this.findAlternativeDate({
            date: dto.date,
            timeZone: tz,
            natalPlanets,
            topicKey,
            locale: resolvedLocale,
            currentScore: score,
          });
    const fallbackExplanation = this.generateInterpretation(
      factors,
      topicKey,
      verdict,
      bestWindow,
      tz,
      dto.date,
      customNote,
      resolvedLocale,
      natalContext,
      score,
    );
    const fallbackDirectAnswer = this.buildDirectAnswer(
      topicKey,
      topicConfig?.description || topicKey,
      customNote,
      verdict,
      bestWindow,
      tz,
      resolvedLocale,
      dto.date,
      natalContext,
      alternativeDate,
    );
    const fallbackRisks = this.buildRiskWarnings(
      topicKey,
      verdict,
      factors,
      customNote,
      resolvedLocale,
    );
    const fallbackClarifyingQuestion = this.getClarifyingQuestion(
      topicKey,
      customNote,
      resolvedLocale,
    );
    const fallbackRecommendations = this.getRecommendations(
      topicKey,
      verdict,
      bestWindow,
      tz,
      factors,
      customNote,
      natalContext,
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
      natalContext,
      alternativeDate,
      fallbackDirectAnswer,
      fallbackExplanation,
      fallbackRisks,
      fallbackClarifyingQuestion,
      fallbackRecommendations,
    });
    const explanation = aiSummary?.explanation || fallbackExplanation;
    const directAnswer = aiSummary?.directAnswer || fallbackDirectAnswer;
    const recommendations =
      aiSummary?.recommendations?.length && aiSummary.recommendations.length > 0
        ? aiSummary.recommendations
        : fallbackRecommendations;
    const risks =
      aiSummary?.risks?.length && aiSummary.risks.length > 0
        ? aiSummary.risks
        : fallbackRisks;
    const clarifyingQuestion =
      aiSummary?.clarifyingQuestion || fallbackClarifyingQuestion;
    const resolvedAlternativeDate =
      aiSummary?.alternativeDate || alternativeDate || undefined;

    const response: AdviceResponseDto = {
      verdict,
      color,
      score,
      factors,
      aspects,
      houses,
      bestWindows: windows.slice(0, 5), // Top 5 windows
      directAnswer,
      explanation,
      recommendations,
      risks,
      clarifyingQuestion,
      alternativeDate: resolvedAlternativeDate,
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
    natalContext: AdvisorNatalContext,
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
    const natalLine = this.buildNatalDecisionBasis(topic, natalContext, locale);

    const closing =
      verdict === 'good'
        ? `Если будете действовать предметно и без лишних отклонений, день можно конвертировать в заметный результат. Итоговая оценка — ${score}/100.`
        : verdict === 'neutral'
          ? `Здесь выиграет не импульс, а дисциплина: короткий план, один приоритет и обязательная перепроверка деталей. Итоговая оценка — ${score}/100.`
          : `Лучший сценарий на сегодня — не форсировать, а уменьшить риск: меньше обещаний, больше проверок и резервный вариант на случай срыва. Итоговая оценка — ${score}/100.`;

    return [
      noteLine,
      opening,
      natalLine,
      timeLine,
      positiveLine,
      negativeLine,
      closing,
    ]
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
    natalContext: AdvisorNatalContext,
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

    recommendations.push({
      text: this.buildNatalDecisionBasis(topicKey, natalContext, locale),
      priority: verdict === 'good' ? 'medium' : 'high',
      category: verdict === 'challenging' ? 'caution' : 'action',
    });

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
    natalContext: AdvisorNatalContext;
    alternativeDate: AdvisorAlternativeDate | null;
    fallbackDirectAnswer: string;
    fallbackExplanation: string;
    fallbackRisks: string[];
    fallbackClarifyingQuestion?: string;
    fallbackRecommendations: AdvisorRecommendation[];
  }): Promise<{
    directAnswer?: string;
    explanation: string;
    recommendations: AdvisorRecommendation[];
    risks?: string[];
    clarifyingQuestion?: string;
    alternativeDate?: AdvisorAlternativeDate;
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
        directAnswer: parsed.directAnswer,
        explanation: parsed.explanation,
        recommendations: parsed.recommendations,
        risks: parsed.risks,
        clarifyingQuestion: parsed.clarifyingQuestion,
        alternativeDate: parsed.alternativeDate,
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
    natalContext: AdvisorNatalContext;
    alternativeDate: AdvisorAlternativeDate | null;
    fallbackDirectAnswer: string;
    fallbackExplanation: string;
    fallbackRisks: string[];
    fallbackClarifyingQuestion?: string;
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
  "directAnswer": "1-3 decisive sentences that answer the user's real question",
  "explanation": "120-190 words",
  "risks": ["short concrete risk", "short concrete risk"],
  "clarifyingQuestion": "one clarifying question if context is insufficient, otherwise null",
  "alternativeDate": {
    "date": "YYYY-MM-DD",
    "score": 0,
    "bestWindow": "HH:MM-HH:MM",
    "reason": "why this date is better"
  },
  "recommendations": [
    { "text": "short imperative recommendation", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Rules:
- Be specific. No vague spiritual filler, no motivational fluff, no generic coaching phrases.
- Base every claim ONLY on the provided data. Do not invent aspects, windows, risks, or strengths.
- Every decision must be built on the natal profile first and only then adjusted by the day's transit timing.
- Mention the verdict, the score, the best time window, and 2-3 strongest factors directly in the explanation.
- Use the natal profile to explain why this advice fits the person's natural preferences, character style, relationship pattern, work style, or risk profile.
- If customNote is present, tailor the advice to that exact situation.
- If the user writes a stream of thoughts, doubts, or internal conflict, do not just summarize it. Infer the core decision and propose the most sensible solution path.
- directAnswer must answer the user's practical question first. If the note asks to choose where to go, whom to meet, what to prioritize, or which option suits them better, make a concrete recommendation when the data allows it.
- If there is not enough context for a confident concrete choice, keep the direct answer narrower and put exactly one useful clarifyingQuestion.
- If the verdict is challenging, risks must explicitly say what can go wrong or what to watch out for.
- Use the provided alternativeDate only when the current day is weak and postponing is smarter; otherwise return null.
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
    natalContext: input.natalContext,
    fallbackDirectAnswer: input.fallbackDirectAnswer,
    fallbackExplanation: input.fallbackExplanation,
    fallbackRisks: input.fallbackRisks,
    fallbackClarifyingQuestion: input.fallbackClarifyingQuestion || null,
    alternativeDate: input.alternativeDate,
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
  "directAnswer": "1-3 frases decisivas que respondan a la pregunta real",
  "explanation": "120-190 palabras",
  "risks": ["riesgo concreto", "riesgo concreto"],
  "clarifyingQuestion": "una sola pregunta aclaratoria si falta contexto; si no, null",
  "alternativeDate": {
    "date": "YYYY-MM-DD",
    "score": 0,
    "bestWindow": "HH:MM-HH:MM",
    "reason": "por qué esa fecha es mejor"
  },
  "recommendations": [
    { "text": "recomendación breve en imperativo", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Reglas:
- Sé específico. Nada de relleno espiritual vago, frases genéricas o coaching vacío.
- Basa cada afirmación SOLO en los datos proporcionados. No inventes aspectos, ventanas horarias, riesgos ni ventajas.
- Toda decisión debe construirse primero sobre el perfil natal y solo después ajustarse por el timing de tránsitos del día.
- Menciona directamente el veredicto, la puntuación, la mejor franja horaria y 2-3 factores más fuertes.
- Usa el perfil natal para explicar por qué el consejo encaja con el carácter, el estilo relacional, la forma de trabajar o la tolerancia al riesgo de la persona.
- Si existe customNote, adapta el consejo exactamente a esa situación.
- Si el usuario escribe dudas, pensamientos sueltos o conflicto interno, no lo resumes sin más: infiere la decisión de fondo y propone una salida concreta.
- directAnswer debe responder primero a la pregunta práctica. Si la nota pide elegir destino, persona, prioridad u opción, haz una recomendación concreta cuando los datos lo permitan.
- Si no hay suficiente contexto para una elección realmente segura, deja la respuesta directa más estrecha y formula una sola clarifyingQuestion útil.
- Si el veredicto es desafiante, risks debe explicar qué puede salir mal o qué conviene vigilar.
- Usa alternativeDate solo si el día actual es flojo y posponer es más inteligente; en caso contrario devuelve null.
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
    natalContext: input.natalContext,
    fallbackDirectAnswer: input.fallbackDirectAnswer,
    fallbackExplanation: input.fallbackExplanation,
    fallbackRisks: input.fallbackRisks,
    fallbackClarifyingQuestion: input.fallbackClarifyingQuestion || null,
    alternativeDate: input.alternativeDate,
    fallbackRecommendations: input.fallbackRecommendations,
  },
  null,
  2,
)}`;
    }

    return `Ты астрологический советник по решениям. Твоя задача — превратить структурированные астрологические сигналы в конкретный и полезный совет.

Верни ТОЛЬКО валидный JSON:
{
  "directAnswer": "1-3 решающие фразы, которые прямо отвечают на реальный вопрос пользователя",
  "explanation": "120-190 слов",
  "risks": ["короткий конкретный риск", "короткий конкретный риск"],
  "clarifyingQuestion": "один уточняющий вопрос, если контекста мало; иначе null",
  "alternativeDate": {
    "date": "YYYY-MM-DD",
    "score": 0,
    "bestWindow": "HH:MM-HH:MM",
    "reason": "почему эта дата лучше"
  },
  "recommendations": [
    { "text": "короткая рекомендация в повелительной форме", "priority": "high|medium|low", "category": "action|caution|warning" }
  ]
}

Правила:
- Пиши конкретно. Никакой размытой эзотерики, пустого ободрения и общих фраз.
- Опирайся ТОЛЬКО на данные ниже. Не придумывай аспекты, окна времени, риски или сильные стороны.
- Каждое решение строй сначала поверх натального профиля человека и только потом уточняй его текущим транзитным таймингом дня.
- В объяснении прямо упомяни вердикт, score, лучшее окно времени и 2-3 самых сильных фактора.
- Используй натальный профиль, чтобы показать, почему совет подходит именно этому человеку по складу характера, отношениям, стилю решений и способу действовать.
- Если есть customNote, адаптируй ответ именно под эту ситуацию.
- Если пользователь пишет поток мыслей, сомнений или внутренний конфликт, не пересказывай это обратно. Выдели ядро решения и предложи самый внятный путь действия.
- directAnswer должен сначала дать практический вывод. Если пользователь по сути спрашивает, куда ехать, что выбрать, с кем идти в разговор, какому формату дать приоритет, дай конкретный ответ там, где данных хватает.
- Если для уверенного выбора контекста всё же не хватает, оставь прямой ответ уже́м и задай ровно один полезный clarifyingQuestion.
- Если вердикт сложный, risks должен прямо сказать, что может пойти не так и чего опасаться.
- Используй alternativeDate только если текущий день реально слабее и перенос выглядит разумнее; иначе верни null.
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
    natalContext: input.natalContext,
    fallbackDirectAnswer: input.fallbackDirectAnswer,
    fallbackExplanation: input.fallbackExplanation,
    fallbackRisks: input.fallbackRisks,
    fallbackClarifyingQuestion: input.fallbackClarifyingQuestion || null,
    alternativeDate: input.alternativeDate,
    fallbackRecommendations: input.fallbackRecommendations,
  },
  null,
  2,
)}`;
  }

  private parseAdvisorSummary(raw: string): {
    directAnswer?: string;
    explanation: string;
    recommendations: AdvisorRecommendation[];
    risks?: string[];
    clarifyingQuestion?: string;
    alternativeDate?: AdvisorAlternativeDate;
  } | null {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as {
        directAnswer?: unknown;
        explanation?: unknown;
        risks?: unknown;
        clarifyingQuestion?: unknown;
        alternativeDate?: unknown;
        recommendations?: unknown;
      };

      const directAnswer = this.normalizeStructuredText(parsed.directAnswer);
      const explanation = this.normalizeStructuredText(parsed.explanation);
      const risks = this.normalizeStructuredTextList(parsed.risks);
      const clarifyingQuestion = this.normalizeStructuredText(
        parsed.clarifyingQuestion,
      );

      if (!explanation) {
        return null;
      }

      let alternativeDate: AdvisorAlternativeDate | undefined;
      if (
        parsed.alternativeDate &&
        typeof parsed.alternativeDate === 'object'
      ) {
        const record = parsed.alternativeDate as Record<string, unknown>;
        const date = this.normalizeStructuredText(record.date);
        const reason = this.normalizeStructuredText(record.reason);
        const bestWindow = this.normalizeStructuredText(record.bestWindow);
        const rawScore =
          typeof record.score === 'number'
            ? record.score
            : Number(record.score);

        if (date && reason && Number.isFinite(rawScore)) {
          alternativeDate = {
            date,
            score: Math.max(0, Math.min(100, Math.round(rawScore))),
            bestWindow: bestWindow || undefined,
            reason,
          };
        }
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

      return {
        directAnswer: directAnswer || undefined,
        explanation,
        recommendations,
        risks: risks.length > 0 ? risks : undefined,
        clarifyingQuestion: clarifyingQuestion || undefined,
        alternativeDate,
      };
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
