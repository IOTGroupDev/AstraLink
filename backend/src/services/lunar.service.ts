import { Injectable, Logger } from '@nestjs/common';
import { EphemerisService } from './ephemeris.service';

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
}

@Injectable()
export class LunarService {
  private readonly logger = new Logger(LunarService.name);

  constructor(private ephemerisService: EphemerisService) {}

  /**
   * Получить фазу луны на указанную дату
   */
  async getMoonPhase(date: Date, natalChart?: any): Promise<MoonPhase> {
    try {
      this.logger.log(`Расчет фазы луны на ${date.toISOString()}`);

      // Получаем позицию Луны и Солнца через Swiss Ephemeris
      const julianDay = this.ephemerisService.dateToJulianDay(date);
      const planets = await this.ephemerisService.calculatePlanets(julianDay);

      const moonLongitude = planets.moon.longitude;
      const sunLongitude = planets.sun.longitude;

      // Рассчитываем фазу (угол между Луной и Солнцем)
      const phase = this.calculatePhase(moonLongitude, sunLongitude);
      const phaseName = this.getPhaseName(phase);
      const illumination = this.calculateIllumination(phase);

      // Проверяем, не находится ли Луна без курса
      const isVoidOfCourse = this.checkVoidOfCourse(
        planets,
        moonLongitude,
        planets.moon.sign,
      );

      // Определяем дом, если есть натальная карта
      let house: number | undefined;
      if (natalChart?.houses) {
        house = this.getMoonHouse(moonLongitude, natalChart.houses);
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
      );

      return {
        phase,
        phaseName,
        illumination,
        sign: planets.moon.sign,
        degree: planets.moon.degree,
        house,
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
  async getLunarDay(date: Date): Promise<LunarDay> {
    try {
      // Рассчитываем лунный день (от новолуния)
      const lastNewMoon = await this.findLastNewMoon(date);
      const daysSinceNewMoon = Math.floor(
        (date.getTime() - lastNewMoon.getTime()) / (1000 * 60 * 60 * 24),
      );
      const lunarDayNumber = (daysSinceNewMoon % 30) + 1;

      const lunarDayInfo = this.getLunarDayInfo(lunarDayNumber);

      return {
        number: lunarDayNumber,
        name: lunarDayInfo.name,
        energy: lunarDayInfo.energy,
        recommendations: lunarDayInfo.recommendations,
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
  ): Promise<
    Array<{
      date: string;
      moonPhase: MoonPhase;
      lunarDay: LunarDay;
      isFavorable: boolean;
    }>
  > {
    const calendar: Array<{
      date: string;
      moonPhase: MoonPhase;
      lunarDay: LunarDay;
      isFavorable: boolean;
    }> = [];

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day, 12, 0, 0); // Полдень для точности

      const moonPhase = await this.getMoonPhase(date, natalChart);
      const lunarDay = await this.getLunarDay(date);
      const isFavorable = this.isFavorableDay(moonPhase, lunarDay);

      calendar.push({
        date: date.toISOString().split('T')[0],
        moonPhase,
        lunarDay,
        isFavorable,
      });
    }

    return calendar;
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
  private getPhaseName(phase: number): string {
    if (phase < 0.03 || phase > 0.97) return 'Новолуние';
    if (phase >= 0.03 && phase < 0.22) return 'Растущий серп';
    if (phase >= 0.22 && phase < 0.28) return 'Первая четверть';
    if (phase >= 0.28 && phase < 0.47) return 'Растущая луна';
    if (phase >= 0.47 && phase < 0.53) return 'Полнолуние';
    if (phase >= 0.53 && phase < 0.72) return 'Убывающая луна';
    if (phase >= 0.72 && phase < 0.78) return 'Последняя четверть';
    if (phase >= 0.78 && phase <= 0.97) return 'Убывающий серп';
    return 'Новолуние';
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
    moonSign: string,
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
    moonLongitude: number,
    sunLongitude: number,
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
    phaseName: string,
    moonSign: string,
    isVoidOfCourse: boolean,
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
      // Растущая луна (новолуние - первая четверть)
      general =
        'Растущая луна благоприятствует новым начинаниям и росту. Время сажать семена будущих проектов.';
      emotional = 'Энергия растет, настроение улучшается. Время оптимизма.';
      practical =
        'Начинайте новые проекты, заключайте контракты, инвестируйте в рост.';
      avoid = 'Избегайте завершения проектов, крупных трат на непроверенное.';
    } else if (phase >= 0.25 && phase < 0.5) {
      // Растущая луна (первая четверть - полнолуние)
      general =
        'Время активного роста и реализации планов. Энергия на пике подъема.';
      emotional = 'Эмоции усиливаются, стремление к действию растет.';
      practical =
        'Активно работайте над проектами, расширяйте связи, укрепляйте позиции.';
      avoid =
        'Не откладывайте важные дела, не упускайте возможности из-за сомнений.';
    } else if (phase >= 0.5 && phase < 0.75) {
      // Убывающая луна (полнолуние - последняя четверть)
      general =
        'Полнолуние завершено, энергия идет на убыль. Время подведения итогов и освобождения от лишнего.';
      emotional =
        'Эмоции могут быть интенсивными. Время для отпускания и прощения.';
      practical =
        'Завершайте начатое, делайте выводы, освобождайтесь от ненужного.';
      avoid = 'Избегайте начала новых крупных проектов, излишних обязательств.';
    } else {
      // Убывающая луна (последняя четверть - новолуние)
      general =
        'Завершающая фаза цикла. Время для отдыха, рефлексии и подготовки к новому циклу.';
      emotional =
        'Энергия на минимуме. Время для внутренней работы и восстановления.';
      practical =
        'Медитируйте, планируйте будущее, завершайте старые дела, отдыхайте.';
      avoid =
        'Не начинайте важные проекты, не делайте крупных инвестиций, не форсируйте события.';
    }

    // Дополнительные рекомендации если Луна без курса
    if (isVoidOfCourse) {
      avoid +=
        ' Луна без курса - избегайте важных решений и подписания документов.';
    }

    // Добавляем рекомендации по знаку Луны
    const signAdvice = this.getSignRecommendations(moonSign);
    general += ` Луна в ${moonSign}: ${signAdvice}`;

    return { general, emotional, practical, avoid };
  }

  /**
   * Рекомендации по знаку Луны
   */
  private getSignRecommendations(sign: string): string {
    const recommendations: { [key: string]: string } = {
      Aries: 'Время для смелых действий и инициативы. Энергия и решительность.',
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
      Scorpio: 'Глубокие эмоции и трансформация. Время для внутренней работы.',
      Sagittarius:
        'Оптимизм и стремление к новому опыту. Хорошо для путешествий и обучения.',
      Capricorn:
        'Фокус на целях и ответственности. Дисциплина и структура важны.',
      Aquarius:
        'Инновации и независимость. Время для оригинальных идей и дружбы.',
      Pisces: 'Интуиция и творческое воображение. Духовность и сострадание.',
    };

    return recommendations[sign] || 'Влияет на ваше настроение и действия.';
  }

  /**
   * Информация о лунном дне
   */
  private getLunarDayInfo(day: number): {
    name: string;
    energy: string;
    recommendations: string[];
  } {
    // Упрощенная версия - можно расширить
    const lunarDays: {
      [key: number]: {
        name: string;
        energy: string;
        recommendations: string[];
      };
    } = {
      1: {
        name: 'Начало',
        energy: 'positive',
        recommendations: [
          'Начинайте новое',
          'Ставьте цели',
          'Планируйте будущее',
        ],
      },
      9: {
        name: 'Очищение',
        energy: 'challenging',
        recommendations: [
          'Избегайте конфликтов',
          'Практикуйте прощение',
          'Очищайте пространство',
        ],
      },
      15: {
        name: 'Полнота',
        energy: 'positive',
        recommendations: [
          'Завершайте дела',
          'Празднуйте достижения',
          'Проявляйте щедрость',
        ],
      },
      23: {
        name: 'Крокодил',
        energy: 'challenging',
        recommendations: [
          'Будьте осторожны',
          'Избегайте рисков',
          'Защищайте свои интересы',
        ],
      },
      29: {
        name: 'Тьма',
        energy: 'challenging',
        recommendations: [
          'Отдыхайте',
          'Медитируйте',
          'Готовьтесь к новому циклу',
        ],
      },
    };

    return (
      lunarDays[day] || {
        name: `День ${day}`,
        energy: 'neutral',
        recommendations: ['Следуйте интуиции', 'Будьте внимательны'],
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
}
