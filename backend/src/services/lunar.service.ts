import { Injectable, Logger } from '@nestjs/common';
import { EphemerisService } from './ephemeris.service';
import {
  deriveLocalBirthFieldsFromUtc,
  normalizeBirthDateValue,
  normalizeBirthTimeValue,
} from '@/common/utils/birth-data.util';

export interface MoonPhase {
  phase: number; // 0-1 (0 = новолуние, 0.5 = полнолуние)
  phaseName: string; // Название фазы
  illumination: number; // Процент освещенности
  sign: string; // Знак зодиака
  degree: number; // Градус в знаке
  house?: number; // Дом (если есть натальная карта)
  isVoidOfCourse: boolean; // Луна без курса
  nextPhaseDate: string; // Дата следующей фазы
  recommendations: {
    general: string;
    emotional: string;
    practical: string;
    avoid: string;
  };
}

export interface LunarDay {
  number: number; // Лунный день (1-30)
  name: string;
  energy: string; // positive, neutral, challenging
  recommendations: string[];
  energyScore: number;
  focus: 'initiate' | 'build' | 'complete' | 'release' | 'restore';
  summary: string;
  bestFor: string[];
  avoid: string[];
}

export interface MonthlyLunarCalendarDay {
  date: string;
  moonPhase: MoonPhase;
  lunarDay: LunarDay;
  isFavorable: boolean;
  favorabilityScore: number;
  dayType: 'power' | 'supportive' | 'mixed' | 'challenging';
}

@Injectable()
export class LunarService {
  private readonly logger = new Logger(LunarService.name);

  constructor(private ephemerisService: EphemerisService) {}

  private toUserLocalNoon(
    year: number,
    month: number,
    day: number,
    tzOffsetMinutes = 0,
  ): Date {
    return new Date(
      Date.UTC(year, month, day, 12, 0, 0) - tzOffsetMinutes * 60_000,
    );
  }

  /**
   * Получить фазу луны на указанную дату
   */
  async getMoonPhase(
    date: Date,
    natalChart?: any,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<MoonPhase> {
    try {
      this.logger.log(`Расчет фазы луны на ${date.toISOString()}`);

      // Получаем позицию Луны и Солнца через Swiss Ephemeris
      const julianDay = this.ephemerisService.dateToJulianDay(date);
      const planets = await this.ephemerisService.calculatePlanets(julianDay);

      const moonLongitude = planets.moon.longitude;
      const sunLongitude = planets.sun.longitude;

      // Рассчитываем фазу (угол между Луной и Солнцем)
      const phase = this.calculatePhase(moonLongitude, sunLongitude);
      const phaseName = this.getPhaseName(phase, locale);
      const illumination = this.calculateIllumination(phase);

      // Проверяем, не находится ли Луна без курса
      const isVoidOfCourse = this.checkVoidOfCourse(
        planets,
        moonLongitude,
        planets.moon.sign,
      );

      // Определяем дом, если есть натальная карта
      // Расширенный фолбэк: если в сохранённой карте нет домов, пробуем реконструировать их по canonical birth metadata
      let house: number | undefined;
      let natalHouses: any = natalChart?.houses;

      if (!natalHouses && natalChart?.location) {
        try {
          let dateStr = normalizeBirthDateValue(natalChart?.birthDate);
          let timeStr = normalizeBirthTimeValue(natalChart?.birthTime);

          if (
            (!dateStr || !timeStr) &&
            typeof natalChart?.birthDateTimeUtc === 'string' &&
            Number.isFinite(natalChart?.location?.timezone)
          ) {
            const derived = deriveLocalBirthFieldsFromUtc(
              natalChart.birthDateTimeUtc,
              Number(natalChart.location.timezone),
            );
            dateStr = dateStr || derived?.birthDate || null;
            timeStr = timeStr || derived?.birthTime || null;
          }

          if (dateStr && timeStr) {
            const recomputed = await this.ephemerisService.calculateNatalChart(
              dateStr,
              timeStr,
              natalChart.location,
            );
            natalHouses = recomputed?.houses;
          }
        } catch (e) {
          this.logger.debug(
            'Не удалось реконструировать дома для натальной карты (moon-phase)',
            e as any,
          );
        }
      }

      if (natalHouses) {
        house = this.getMoonHouse(moonLongitude, natalHouses);
      }

      // Рассчитываем дату следующей фазы
      const nextPhaseDate = await this.getNextPhaseDate(
        date,
        phase,
        moonLongitude,
        sunLongitude,
      );

      // Генерируем рекомендации
      const recommendations = this.generateRecommendations(
        phase,
        phaseName,
        planets.moon.sign,
        isVoidOfCourse,
        locale,
      );

      return {
        phase,
        phaseName,
        illumination,
        sign: planets.moon.sign,
        degree: planets.moon.degree,
        house: house ?? 1,
        isVoidOfCourse,
        nextPhaseDate,
        recommendations,
      };
    } catch (error) {
      this.logger.error('Ошибка расчета фазы луны:', error);
      throw error;
    }
  }

  /**
   * Получить лунный день
   */
  async getLunarDay(
    date: Date,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): Promise<LunarDay> {
    try {
      // Рассчитываем лунный день (от новолуния)
      const lastNewMoon = await this.findLastNewMoon(date);
      const daysSinceNewMoon = Math.floor(
        (date.getTime() - lastNewMoon.getTime()) / (1000 * 60 * 60 * 24),
      );
      const lunarDayNumber = (daysSinceNewMoon % 30) + 1;

      const lunarDayInfo = this.getLunarDayInfo(lunarDayNumber, locale);

      return {
        number: lunarDayNumber,
        name: lunarDayInfo.name,
        energy: lunarDayInfo.energy,
        recommendations: lunarDayInfo.recommendations,
        energyScore: lunarDayInfo.energyScore,
        focus: lunarDayInfo.focus,
        summary: lunarDayInfo.summary,
        bestFor: lunarDayInfo.bestFor,
        avoid: lunarDayInfo.avoid,
      };
    } catch (error) {
      this.logger.error('Ошибка расчета лунного дня:', error);
      throw error;
    }
  }

  /**
   * Получить календарь на месяц
   */
  async getMonthlyCalendar(
    year: number,
    month: number,
    natalChart?: any,
    locale: 'ru' | 'en' | 'es' = 'ru',
    tzOffsetMinutes = 0,
  ): Promise<MonthlyLunarCalendarDay[]> {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Promise.all(
      Array.from({ length: daysInMonth }, async (_, index) => {
        const day = index + 1;
        const date = this.toUserLocalNoon(year, month, day, tzOffsetMinutes);

        const [moonPhase, lunarDay] = await Promise.all([
          this.getMoonPhase(date, natalChart, locale),
          this.getLunarDay(date, locale),
        ]);
        const favorabilityScore = this.calculateFavorabilityScore(
          moonPhase,
          lunarDay,
        );
        const dayType = this.getDayType(favorabilityScore);

        return {
          date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          moonPhase,
          lunarDay,
          isFavorable: favorabilityScore >= 60,
          favorabilityScore,
          dayType,
        };
      }),
    );
  }

  /**
   * Рассчитать фазу луны (0-1)
   */
  private calculatePhase(moonLongitude: number, sunLongitude: number): number {
    let elongation = moonLongitude - sunLongitude;

    // Нормализуем к диапазону 0-360
    if (elongation < 0) {
      elongation += 360;
    }

    // Преобразуем в 0-1
    return elongation / 360;
  }

  /**
   * Получить название фазы
   */
  private getPhaseName(
    phase: number,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const names = {
      newMoon: {
        ru: 'Новолуние',
        en: 'New Moon',
        es: 'Luna nueva',
      },
      waxingCrescent: {
        ru: 'Растущий серп',
        en: 'Waxing Crescent',
        es: 'Creciente creciente',
      },
      firstQuarter: {
        ru: 'Первая четверть',
        en: 'First Quarter',
        es: 'Cuarto creciente',
      },
      waxingGibbous: {
        ru: 'Растущая луна',
        en: 'Waxing Gibbous',
        es: 'Gibosa creciente',
      },
      fullMoon: {
        ru: 'Полнолуние',
        en: 'Full Moon',
        es: 'Luna llena',
      },
      waningGibbous: {
        ru: 'Убывающая луна',
        en: 'Waning Gibbous',
        es: 'Gibosa menguante',
      },
      lastQuarter: {
        ru: 'Последняя четверть',
        en: 'Last Quarter',
        es: 'Cuarto menguante',
      },
      waningCrescent: {
        ru: 'Убывающий серп',
        en: 'Waning Crescent',
        es: 'Creciente menguante',
      },
    };
    if (phase < 0.03 || phase > 0.97) return names.newMoon[locale];
    if (phase >= 0.03 && phase < 0.22) return names.waxingCrescent[locale];
    if (phase >= 0.22 && phase < 0.28) return names.firstQuarter[locale];
    if (phase >= 0.28 && phase < 0.47) return names.waxingGibbous[locale];
    if (phase >= 0.47 && phase < 0.53) return names.fullMoon[locale];
    if (phase >= 0.53 && phase < 0.72) return names.waningGibbous[locale];
    if (phase >= 0.72 && phase < 0.78) return names.lastQuarter[locale];
    if (phase >= 0.78 && phase <= 0.97) return names.waningCrescent[locale];
    return names.newMoon[locale];
  }

  /**
   * Рассчитать процент освещенности
   */
  private calculateIllumination(phase: number): number {
    // Используем формулу для расчета освещенности
    // 0 (новолуние) = 0%, 0.5 (полнолуние) = 100%, 1 (новолуние) = 0%
    let illumination: number;
    if (phase <= 0.5) {
      illumination = phase * 2 * 100;
    } else {
      illumination = (1 - phase) * 2 * 100;
    }
    return Math.round(illumination);
  }

  /**
   * Проверить, находится ли Луна без курса
   */
  private checkVoidOfCourse(
    planets: any,
    moonLongitude: number,
    _moonSign: string,
  ): boolean {
    // Упрощенная проверка: Луна без курса если близка к границе знака
    // и не делает мажорных аспектов
    const degreeInSign = moonLongitude % 30;

    // Если Луна в последних 2 градусах знака - высокая вероятность VOC
    if (degreeInSign > 28) {
      return true;
    }

    return false;
  }

  /**
   * Определить дом Луны в натальной карте
   */
  private getMoonHouse(moonLongitude: number, houses: any): number {
    for (let i = 1; i <= 12; i++) {
      const currentCusp = houses[i]?.cusp || 0;
      const nextHouse = i === 12 ? 1 : i + 1;
      const nextCusp = houses[nextHouse]?.cusp || 0;

      if (currentCusp <= nextCusp) {
        if (moonLongitude >= currentCusp && moonLongitude < nextCusp) {
          return i;
        }
      } else {
        if (moonLongitude >= currentCusp || moonLongitude < nextCusp) {
          return i;
        }
      }
    }
    return 1;
  }

  /**
   * Найти дату следующей фазы
   */
  private async getNextPhaseDate(
    currentDate: Date,
    currentPhase: number,
    _moonLongitude: number,
    _sunLongitude: number,
  ): Promise<string> {
    // Определяем следующую ключевую фазу
    let targetPhase: number;
    if (currentPhase < 0.25) {
      targetPhase = 0.25; // Первая четверть
    } else if (currentPhase < 0.5) {
      targetPhase = 0.5; // Полнолуние
    } else if (currentPhase < 0.75) {
      targetPhase = 0.75; // Последняя четверть
    } else {
      targetPhase = 0.0; // Новолуние
    }

    // Приблизительно рассчитываем дату (каждая фаза ~7.4 дня)
    const phaseDifference =
      targetPhase > currentPhase
        ? targetPhase - currentPhase
        : 1 - currentPhase + targetPhase;
    const daysToNextPhase = phaseDifference * 29.53; // Синодический месяц

    const nextPhaseDate = new Date(
      currentDate.getTime() + daysToNextPhase * 24 * 60 * 60 * 1000,
    );

    return nextPhaseDate.toISOString().split('T')[0];
  }

  /**
   * Найти последнее новолуние
   */
  private async findLastNewMoon(fromDate: Date): Promise<Date> {
    // Ищем последнее новолуние, идя назад от текущей даты
    const searchDate = new Date(fromDate);
    searchDate.setDate(searchDate.getDate() - 30); // Начинаем с месяца назад

    let lastNewMoon = searchDate;
    let minPhase = 1;

    for (let i = 0; i < 30; i++) {
      const testDate = new Date(searchDate);
      testDate.setDate(testDate.getDate() + i);

      const julianDay = this.ephemerisService.dateToJulianDay(testDate);
      const planets = await this.ephemerisService.calculatePlanets(julianDay);

      const phase = this.calculatePhase(
        planets.moon.longitude,
        planets.sun.longitude,
      );

      if (phase < minPhase) {
        minPhase = phase;
        lastNewMoon = testDate;
      }

      // Если фаза начала расти после минимума, значит нашли новолуние
      if (minPhase < 0.05 && phase > minPhase + 0.02) {
        break;
      }
    }

    return lastNewMoon;
  }

  /**
   * Генерировать рекомендации на основе фазы
   */
  private generateRecommendations(
    phase: number,
    _phaseName: string,
    moonSign: string,
    isVoidOfCourse: boolean,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): {
    general: string;
    emotional: string;
    practical: string;
    avoid: string;
  } {
    let general = '';
    let emotional = '';
    let practical = '';
    let avoid = '';

    // Рекомендации по фазе
    if (phase < 0.25) {
      if (locale === 'en') {
        general =
          'The waxing Moon supports new beginnings and growth. Time to plant seeds for future projects.';
        emotional = 'Energy rises, mood improves. A time for optimism.';
        practical = 'Start new projects, sign contracts, invest in growth.';
        avoid = 'Avoid closing projects and large expenses on unproven ideas.';
      } else if (locale === 'es') {
        general =
          'La Luna creciente favorece nuevos comienzos y crecimiento. Es tiempo de sembrar las semillas de futuros proyectos.';
        emotional = 'La energía crece, el ánimo mejora. Tiempo de optimismo.';
        practical =
          'Inicia nuevos proyectos, firma contratos, invierte en crecimiento.';
        avoid = 'Evita cerrar proyectos y grandes gastos en algo no probado.';
      } else {
        general =
          'Растущая луна благоприятствует новым начинаниям и росту. Время сажать семена будущих проектов.';
        emotional = 'Энергия растет, настроение улучшается. Время оптимизма.';
        practical =
          'Начинайте новые проекты, заключайте контракты, инвестируйте в рост.';
        avoid = 'Избегайте завершения проектов, крупных трат на непроверенное.';
      }
    } else if (phase >= 0.25 && phase < 0.5) {
      if (locale === 'en') {
        general =
          'A phase of active growth and execution. Energy is rising to its peak.';
        emotional = 'Emotions intensify, the drive to act increases.';
        practical =
          'Work actively on projects, expand connections, strengthen positions.';
        avoid = 'Do not postpone important tasks or miss opportunities.';
      } else if (locale === 'es') {
        general =
          'Tiempo de crecimiento activo y realización de planes. La energía está en su punto máximo.';
        emotional =
          'Las emociones se intensifican, crece el impulso de actuar.';
        practical =
          'Trabaja activamente en proyectos, amplía contactos, fortalece posiciones.';
        avoid =
          'No postergues asuntos importantes ni pierdas oportunidades por dudas.';
      } else {
        general =
          'Время активного роста и реализации планов. Энергия на пике подъема.';
        emotional = 'Эмоции усиливаются, стремление к действию растет.';
        practical =
          'Активно работайте над проектами, расширяйте связи, укрепляйте позиции.';
        avoid =
          'Не откладывайте важные дела, не упускайте возможности из-за сомнений.';
      }
    } else if (phase >= 0.5 && phase < 0.75) {
      if (locale === 'en') {
        general =
          'The Full Moon has passed and energy is declining. Time to sum up and release what is no longer needed.';
        emotional =
          'Emotions can be intense. A time for letting go and forgiveness.';
        practical = 'Finish what you started, draw conclusions, declutter.';
        avoid =
          'Avoid starting major new projects or taking on extra obligations.';
      } else if (locale === 'es') {
        general =
          'La Luna llena ha pasado y la energía disminuye. Tiempo de hacer balance y soltar lo innecesario.';
        emotional =
          'Las emociones pueden ser intensas. Tiempo de soltar y perdonar.';
        practical =
          'Termina lo iniciado, saca conclusiones, libera lo que no sirve.';
        avoid =
          'Evita iniciar grandes proyectos nuevos o asumir compromisos extra.';
      } else {
        general =
          'Полнолуние завершено, энергия идет на убыль. Время подведения итогов и освобождения от лишнего.';
        emotional =
          'Эмоции могут быть интенсивными. Время для отпускания и прощения.';
        practical =
          'Завершайте начатое, делайте выводы, освобождайтесь от ненужного.';
        avoid =
          'Избегайте начала новых крупных проектов, излишних обязательств.';
      }
    } else {
      if (locale === 'en') {
        general =
          'The closing phase of the cycle. Time for rest, reflection, and preparing for a new cycle.';
        emotional = 'Energy is at a minimum. Time for inner work and recovery.';
        practical = 'Meditate, plan ahead, finish old tasks, rest.';
        avoid =
          'Do not start important projects, avoid major investments, and do not force events.';
      } else if (locale === 'es') {
        general =
          'Fase final del ciclo. Tiempo de descanso, reflexión y preparación para un nuevo ciclo.';
        emotional =
          'La energía está en su mínimo. Tiempo de trabajo interno y recuperación.';
        practical =
          'Medita, planifica el futuro, termina tareas antiguas, descansa.';
        avoid =
          'No inicies proyectos importantes, evita grandes inversiones y no fuerces los acontecimientos.';
      } else {
        general =
          'Завершающая фаза цикла. Время для отдыха, рефлексии и подготовки к новому циклу.';
        emotional =
          'Энергия на минимуме. Время для внутренней работы и восстановления.';
        practical =
          'Медитируйте, планируйте будущее, завершайте старые дела, отдыхайте.';
        avoid =
          'Не начинайте важные проекты, не делайте крупных инвестиций, не форсируйте события.';
      }
    }

    // Дополнительные рекомендации если Луна без курса
    if (isVoidOfCourse) {
      avoid +=
        locale === 'en'
          ? ' Void-of-course Moon — avoid important decisions and signing documents.'
          : locale === 'es'
            ? ' Luna fuera de curso: evita decisiones importantes y firmar documentos.'
            : ' Луна без курса - избегайте важных решений и подписания документов.';
    }

    // Добавляем рекомендации по знаку Луны
    const signAdvice = this.getSignRecommendations(moonSign, locale);
    const signPrefix =
      locale === 'en'
        ? ` Moon in ${moonSign}: ${signAdvice}`
        : locale === 'es'
          ? ` Luna en ${moonSign}: ${signAdvice}`
          : ` Луна в ${moonSign}: ${signAdvice}`;
    general += signPrefix;

    return { general, emotional, practical, avoid };
  }

  /**
   * Рекомендации по знаку Луны
   */
  private getSignRecommendations(
    sign: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    const recommendations: Record<
      'ru' | 'en' | 'es',
      { [key: string]: string }
    > = {
      ru: {
        Aries:
          'Время для смелых действий и инициативы. Энергия и решительность.',
        Taurus:
          'Фокус на материальной стабильности и комфорте. Практичность важна.',
        Gemini:
          'Хорошее время для общения, обучения и обмена информацией. Любознательность.',
        Cancer:
          'Эмоциональная чувствительность повышена. Время для дома и семьи.',
        Leo: 'Творчество и самовыражение. Время сиять и вдохновлять других.',
        Virgo:
          'Внимание к деталям и практичность. Хорошо для организации и здоровья.',
        Libra:
          'Гармония в отношениях и баланс. Время для партнерства и компромиссов.',
        Scorpio:
          'Глубокие эмоции и трансформация. Время для внутренней работы.',
        Sagittarius:
          'Оптимизм и стремление к новому опыту. Хорошо для путешествий и обучения.',
        Capricorn:
          'Фокус на целях и ответственности. Дисциплина и структура важны.',
        Aquarius:
          'Инновации и независимость. Время для оригинальных идей и дружбы.',
        Pisces: 'Интуиция и творческое воображение. Духовность и сострадание.',
      },
      en: {
        Aries: 'Time for bold action and initiative. Energy and decisiveness.',
        Taurus:
          'Focus on material stability and comfort. Practicality matters.',
        Gemini:
          'A good time for communication, learning, and exchanging information.',
        Cancer: 'Emotional sensitivity is high. Time for home and family.',
        Leo: 'Creativity and self-expression. Time to shine and inspire.',
        Virgo:
          'Attention to detail and practicality. Good for organization and health.',
        Libra:
          'Harmony in relationships and balance. Time for partnership and compromise.',
        Scorpio: 'Deep emotions and transformation. Time for inner work.',
        Sagittarius:
          'Optimism and the drive for new experiences. Good for travel and learning.',
        Capricorn:
          'Focus on goals and responsibility. Discipline and structure matter.',
        Aquarius:
          'Innovation and independence. Time for original ideas and friendship.',
        Pisces:
          'Intuition and creative imagination. Spirituality and compassion.',
      },
      es: {
        Aries:
          'Tiempo para acciones valientes e iniciativa. Energía y decisión.',
        Taurus:
          'Enfoque en estabilidad material y comodidad. La practicidad importa.',
        Gemini:
          'Buen momento para la comunicación, el aprendizaje y el intercambio de información.',
        Cancer:
          'La sensibilidad emocional es alta. Tiempo para el hogar y la familia.',
        Leo: 'Creatividad y autoexpresión. Tiempo para brillar e inspirar.',
        Virgo:
          'Atención al detalle y practicidad. Bueno para organización y salud.',
        Libra:
          'Armonía en relaciones y equilibrio. Tiempo para alianzas y compromisos.',
        Scorpio:
          'Emociones profundas y transformación. Tiempo para trabajo interior.',
        Sagittarius:
          'Optimismo y deseo de nuevas experiencias. Bueno para viajes y aprendizaje.',
        Capricorn:
          'Enfoque en metas y responsabilidad. La disciplina y la estructura importan.',
        Aquarius:
          'Innovación e independencia. Tiempo para ideas originales y amistad.',
        Pisces: 'Intuición e imaginación creativa. Espiritualidad y compasión.',
      },
    };

    return (
      recommendations[locale][sign] ||
      (locale === 'en'
        ? 'Influences your mood and actions.'
        : locale === 'es'
          ? 'Influye en tu estado de ánimo y acciones.'
          : 'Влияет на ваше настроение и действия.')
    );
  }

  /**
   * Информация о лунном дне
   */
  private getLunarDayInfo(
    day: number,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): {
    name: string;
    energy: string;
    recommendations: string[];
    energyScore: number;
    focus: 'initiate' | 'build' | 'complete' | 'release' | 'restore';
    summary: string;
    bestFor: string[];
    avoid: string[];
  } {
    const lunarDays: Record<
      number,
      {
        name: Record<'ru' | 'en' | 'es', string>;
        energy: string;
        recommendations: Record<'ru' | 'en' | 'es', string[]>;
      }
    > = {
      1: {
        name: { ru: 'Начало', en: 'Beginning', es: 'Inicio' },
        energy: 'positive',
        recommendations: {
          ru: ['Начинайте новое', 'Ставьте цели', 'Планируйте будущее'],
          en: ['Start something new', 'Set goals', 'Plan the future'],
          es: ['Empieza algo nuevo', 'Define metas', 'Planifica el futuro'],
        },
      },
      9: {
        name: { ru: 'Очищение', en: 'Cleansing', es: 'Limpieza' },
        energy: 'challenging',
        recommendations: {
          ru: [
            'Избегайте конфликтов',
            'Практикуйте прощение',
            'Очищайте пространство',
          ],
          en: ['Avoid conflicts', 'Practice forgiveness', 'Clear your space'],
          es: ['Evita conflictos', 'Practica el perdón', 'Limpia tu espacio'],
        },
      },
      15: {
        name: { ru: 'Полнота', en: 'Fulness', es: 'Plenitud' },
        energy: 'positive',
        recommendations: {
          ru: [
            'Завершайте дела',
            'Празднуйте достижения',
            'Проявляйте щедрость',
          ],
          en: ['Finish tasks', 'Celebrate achievements', 'Be generous'],
          es: ['Termina tareas', 'Celebra logros', 'Sé generoso'],
        },
      },
      23: {
        name: { ru: 'Крокодил', en: 'Crocodile', es: 'Cocodrilo' },
        energy: 'challenging',
        recommendations: {
          ru: [
            'Будьте осторожны',
            'Избегайте рисков',
            'Защищайте свои интересы',
          ],
          en: ['Be cautious', 'Avoid risks', 'Protect your interests'],
          es: ['Ten cuidado', 'Evita riesgos', 'Protege tus intereses'],
        },
      },
      29: {
        name: { ru: 'Тьма', en: 'Darkness', es: 'Oscuridad' },
        energy: 'challenging',
        recommendations: {
          ru: ['Отдыхайте', 'Медитируйте', 'Готовьтесь к новому циклу'],
          en: ['Rest', 'Meditate', 'Prepare for a new cycle'],
          es: ['Descansa', 'Medita', 'Prepárate para un nuevo ciclo'],
        },
      },
    };

    const phaseBucket =
      day <= 5
        ? 'initiate'
        : day <= 11
          ? 'build'
          : day <= 18
            ? 'complete'
            : day <= 24
              ? 'release'
              : 'restore';

    const fallbackName =
      locale === 'en'
        ? `Day ${day}`
        : locale === 'es'
          ? `Día ${day}`
          : `День ${day}`;
    const fallbackMap = {
      ru: {
        initiate: {
          energy: 'positive',
          energyScore: 78,
          summary:
            'День поддерживает запуск, первичный импульс и постановку намерения.',
          recommendations: ['Начинайте новое', 'Фиксируйте цель'],
          bestFor: ['старт задач', 'инициативы', 'настройку планов'],
          avoid: ['хаос', 'резкие обещания без плана'],
        },
        build: {
          energy: 'positive',
          energyScore: 72,
          summary:
            'День подходит для наращивания темпа, рутины и устойчивого движения.',
          recommendations: [
            'Двигайтесь последовательно',
            'Укрепляйте результат',
          ],
          bestFor: ['работу в процессе', 'переговоры', 'дисциплину'],
          avoid: ['ленивое откладывание', 'разброс фокуса'],
        },
        complete: {
          energy: 'neutral',
          energyScore: 61,
          summary:
            'Лучше завершать начатое, собирать результаты и фиксировать выводы.',
          recommendations: ['Доводите дела до конца', 'Подводите итоги'],
          bestFor: ['финализацию', 'проверку', 'сбор обратной связи'],
          avoid: ['лишние новые обязательства', 'суету'],
        },
        release: {
          energy: 'neutral',
          energyScore: 46,
          summary:
            'День тянет к разгрузке, очищению и отказу от лишнего напряжения.',
          recommendations: ['Отпускайте лишнее', 'Упрощайте'],
          bestFor: ['очистку', 'разбор хвостов', 'эмоциональную разгрузку'],
          avoid: ['силовое давление', 'конфликты'],
        },
        restore: {
          energy: 'challenging',
          energyScore: 32,
          summary:
            'Ресурс ниже обычного, лучше замедлиться и готовиться к новому циклу.',
          recommendations: ['Снижайте нагрузку', 'Восстанавливайтесь'],
          bestFor: ['сон', 'рефлексию', 'тихую подготовку'],
          avoid: ['спешку', 'крупные старты'],
        },
      },
      en: {
        initiate: {
          energy: 'positive',
          energyScore: 78,
          summary:
            'The day supports beginnings, first moves, and setting intention.',
          recommendations: ['Start something new', 'Set a clear intention'],
          bestFor: ['launching tasks', 'initiative', 'planning'],
          avoid: ['chaos', 'big promises without structure'],
        },
        build: {
          energy: 'positive',
          energyScore: 72,
          summary:
            'The day favors momentum, discipline, and consistent progress.',
          recommendations: ['Keep moving steadily', 'Strengthen what works'],
          bestFor: ['ongoing work', 'negotiations', 'routine'],
          avoid: ['procrastination', 'scattered focus'],
        },
        complete: {
          energy: 'neutral',
          energyScore: 61,
          summary:
            'This is better for wrapping things up and gathering results.',
          recommendations: ['Finish open loops', 'Review the outcome'],
          bestFor: ['finalizing', 'review', 'feedback'],
          avoid: ['extra commitments', 'rush'],
        },
        release: {
          energy: 'neutral',
          energyScore: 46,
          summary:
            'The day leans toward release, simplification, and emotional cleanup.',
          recommendations: ['Let go of excess', 'Simplify the load'],
          bestFor: ['decluttering', 'cleanup', 'emotional release'],
          avoid: ['pressure', 'drama'],
        },
        restore: {
          energy: 'challenging',
          energyScore: 32,
          summary:
            'Energy is lower than usual, so recovery matters more than pushing.',
          recommendations: ['Lower the load', 'Restore your energy'],
          bestFor: ['sleep', 'reflection', 'quiet preparation'],
          avoid: ['rush', 'major launches'],
        },
      },
      es: {
        initiate: {
          energy: 'positive',
          energyScore: 78,
          summary:
            'El día favorece comienzos, primer impulso y marcar intención.',
          recommendations: ['Empieza algo nuevo', 'Define una intención clara'],
          bestFor: ['inicios', 'iniciativa', 'planificación'],
          avoid: ['caos', 'promesas sin estructura'],
        },
        build: {
          energy: 'positive',
          energyScore: 72,
          summary: 'El día favorece constancia, disciplina y avance sostenido.',
          recommendations: [
            'Avanza con constancia',
            'Refuerza lo que ya funciona',
          ],
          bestFor: ['trabajo en curso', 'negociaciones', 'rutina'],
          avoid: ['procrastinar', 'dispersión'],
        },
        complete: {
          energy: 'neutral',
          energyScore: 61,
          summary:
            'Conviene cerrar asuntos, recoger resultados y sacar conclusiones.',
          recommendations: ['Cierra pendientes', 'Haz balance'],
          bestFor: ['finalizar', 'revisar', 'feedback'],
          avoid: ['compromisos extra', 'prisas'],
        },
        release: {
          energy: 'neutral',
          energyScore: 46,
          summary:
            'El día pide soltar, simplificar y limpiar tensión acumulada.',
          recommendations: ['Suelta lo innecesario', 'Simplifica'],
          bestFor: ['limpieza', 'cierres', 'descarga emocional'],
          avoid: ['presión', 'drama'],
        },
        restore: {
          energy: 'challenging',
          energyScore: 32,
          summary:
            'La energía está más baja, así que conviene recuperarte y bajar el ritmo.',
          recommendations: ['Reduce la carga', 'Recupérate'],
          bestFor: ['descanso', 'reflexión', 'preparación tranquila'],
          avoid: ['prisas', 'grandes inicios'],
        },
      },
    } as const;

    const fallback = fallbackMap[locale][phaseBucket];

    return (
      (lunarDays[day] && {
        name: lunarDays[day].name[locale],
        energy: lunarDays[day].energy,
        recommendations: lunarDays[day].recommendations[locale],
        energyScore:
          lunarDays[day].energy === 'positive'
            ? phaseBucket === 'initiate'
              ? 84
              : 74
            : lunarDays[day].energy === 'challenging'
              ? 28
              : 55,
        focus: phaseBucket,
        summary: fallback.summary,
        bestFor: [...fallback.bestFor],
        avoid: [...fallback.avoid],
      }) || {
        name: fallbackName,
        energy: fallback.energy,
        recommendations: [...fallback.recommendations],
        energyScore: fallback.energyScore,
        focus: phaseBucket,
        summary: fallback.summary,
        bestFor: [...fallback.bestFor],
        avoid: [...fallback.avoid],
      }
    );
  }

  /**
   * Определить, является ли день благоприятным
   */
  private isFavorableDay(moonPhase: MoonPhase, lunarDay: LunarDay): boolean {
    // Простая логика: растущая луна и положительная энергия дня
    const isWaxing = moonPhase.phase > 0 && moonPhase.phase < 0.5;
    const hasPositiveEnergy = lunarDay.energy === 'positive';

    return (isWaxing && !moonPhase.isVoidOfCourse) || hasPositiveEnergy;
  }

  private calculateFavorabilityScore(
    moonPhase: MoonPhase,
    lunarDay: LunarDay,
  ): number {
    let score = lunarDay.energyScore;

    if (moonPhase.isVoidOfCourse) {
      score -= 18;
    }

    if (moonPhase.phase > 0 && moonPhase.phase < 0.5) {
      score += 8;
    } else {
      score -= 4;
    }

    if (moonPhase.illumination >= 90 && moonPhase.illumination <= 100) {
      score += lunarDay.energy === 'positive' ? 8 : -6;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private getDayType(
    favorabilityScore: number,
  ): 'power' | 'supportive' | 'mixed' | 'challenging' {
    if (favorabilityScore >= 80) return 'power';
    if (favorabilityScore >= 60) return 'supportive';
    if (favorabilityScore >= 40) return 'mixed';
    return 'challenging';
  }
}
