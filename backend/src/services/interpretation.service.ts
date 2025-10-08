// backend/src/services/interpretation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getPlanetInSignText,
  getKeywords as getATKeywords,
  getStrengths as getATStrengths,
  getChallenges as getATChallenges,
  getAspectName as getATAspectName,
  getHouseTheme as getATHouseTheme,
  getHouseLifeArea as getATLifeArea,
  getAscendantText,
  getPlanetNameRu,
  getAspectInterpretation,
  getAscendantMeta,
} from '@/modules/shared/astro-text';
import { getEssentialDignity } from '@/modules/shared/types';
import type { DignityLevel } from '@/modules/shared/types';

export interface PlanetInterpretation {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  interpretation: string;
  keywords: string[];
  strengths: string[];
  challenges: string[];
}

export interface NatalChartInterpretation {
  overview: string;
  sunSign: PlanetInterpretation;
  moonSign: PlanetInterpretation;
  ascendant: PlanetInterpretation;
  planets: PlanetInterpretation[];
  aspects: {
    aspect: string;
    interpretation: string;
    significance: string;
  }[];
  houses: {
    house: number;
    sign: string;
    interpretation: string;
    lifeArea: string;
  }[];
  summary: {
    personalityTraits: string[];
    lifeThemes: string[];
    karmaLessons: string[];
    talents: string[];
    recommendations: string[];
  };
}

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Генерация полной интерпретации натальной карты (только при регистрации)
   */
  async generateNatalChartInterpretation(
    userId: string,
    chartData: any,
    locale: 'ru' | 'en' = 'ru',
  ): Promise<NatalChartInterpretation> {
    this.logger.log(`Генерация интерпретации натальной карты для ${userId}`);

    const planets = chartData.planets || {};
    const houses = chartData.houses || {};
    const aspects = chartData.aspects || [];

    // Интерпретация планет
    const planetsInterpretation: PlanetInterpretation[] = [];

    // Солнце
    const sun = planets.sun;
    if (sun) {
      planetsInterpretation.push({
        planet: locale === 'en' ? 'Sun' : 'Солнце',
        sign: sun.sign,
        house: this.getPlanetHouse(sun.longitude, houses),
        degree: sun.degree,
        interpretation: this.interpretPlanetInSign(
          'sun',
          sun.sign,
          this.getPlanetHouse(sun.longitude, houses),
          getEssentialDignity('sun', sun.sign),
          !!sun.isRetrograde,
          locale,
        ),
        keywords: this.getPlanetKeywords('sun', sun.sign, locale),
        strengths: this.getPlanetStrengths('sun', sun.sign, locale),
        challenges: this.getPlanetChallenges('sun', sun.sign, locale),
      });
    }

    // Луна
    const moon = planets.moon;
    if (moon) {
      const moonHouse = this.getPlanetHouse(moon.longitude, houses);
      const moonDignity = getEssentialDignity('moon', moon.sign);
      const moonRetro = !!moon.isRetrograde;
      planetsInterpretation.push({
        planet: locale === 'en' ? 'Moon' : 'Луна',
        sign: moon.sign,
        house: moonHouse,
        degree: moon.degree,
        interpretation: this.interpretPlanetInSign(
          'moon',
          moon.sign,
          moonHouse,
          moonDignity,
          moonRetro,
          locale,
        ),
        keywords: this.getPlanetKeywords('moon', moon.sign, locale),
        strengths: this.getPlanetStrengths('moon', moon.sign, locale),
        challenges: this.getPlanetChallenges('moon', moon.sign, locale),
      });
    }

    // Остальные планеты
    for (const [planetKey, planetData] of Object.entries(planets)) {
      if (planetKey !== 'sun' && planetKey !== 'moon') {
        const planet: any = planetData;
        const houseNum = this.getPlanetHouse(planet.longitude, houses);
        const dignity = getEssentialDignity(planetKey as any, planet.sign);
        const retro = !!planet.isRetrograde;
        planetsInterpretation.push({
          planet: this.getPlanetName(planetKey),
          sign: planet.sign,
          house: houseNum,
          degree: planet.degree,
          interpretation: this.interpretPlanetInSign(
            planetKey,
            planet.sign,
            houseNum,
            dignity,
            retro,
            locale,
          ),
          keywords: this.getPlanetKeywords(planetKey, planet.sign, locale),
          strengths: this.getPlanetStrengths(planetKey, planet.sign, locale),
          challenges: this.getPlanetChallenges(planetKey, planet.sign, locale),
        });
      }
    }

    // Интерпретация аспектов
    const aspectsInterpretation = aspects.map((aspect: any) => {
      const name = `${this.getPlanetName(aspect.planetA)} ${this.getAspectName(aspect.aspect, locale)} ${this.getPlanetName(aspect.planetB)}`;

      let focusA = '';
      let focusB = '';
      try {
        const a = planets?.[aspect.planetA];
        const b = planets?.[aspect.planetB];
        const aHouse = a ? this.getPlanetHouse(a.longitude, houses) : undefined;
        const bHouse = b ? this.getPlanetHouse(b.longitude, houses) : undefined;
        const areaA = aHouse ? this.getHouseLifeArea(aHouse, locale) : '';
        const areaB = bHouse ? this.getHouseLifeArea(bHouse, locale) : '';
        if (areaA) focusA = `${this.getPlanetName(aspect.planetA)} → ${areaA}`;
        if (areaB) focusB = `${this.getPlanetName(aspect.planetB)} → ${areaB}`;
      } catch (_e) {
        // ignore focus derivation errors
      }

      const base = this.interpretAspect(
        aspect.planetA,
        aspect.planetB,
        aspect.aspect,
        locale,
      );
      const focus = [focusA, focusB].filter(Boolean).join('; ');
      const strength =
        aspect.strength > 0.8
          ? 'Очень сильный аспект'
          : aspect.strength > 0.6
            ? 'Сильный аспект'
            : aspect.strength > 0.4
              ? 'Умеренный аспект'
              : 'Слабый аспект';

      return {
        aspect: name,
        interpretation: [base, focus ? `Фокус: ${focus}.` : '']
          .filter(Boolean)
          .join(' '),
        significance: `${strength}`,
      };
    });

    // Интерпретация домов
    const housesInterpretation = Object.entries(houses).map(
      ([houseNum, houseData]: [string, any]) => ({
        house: parseInt(houseNum),
        sign: houseData.sign,
        interpretation: this.interpretHouse(
          parseInt(houseNum),
          houseData.sign,
          locale,
        ),
        lifeArea: this.getHouseLifeArea(parseInt(houseNum), locale),
      }),
    );

    // Асцендент (1-й дом)
    const ascSign = houses[1]?.sign || (locale === 'en' ? 'Aries' : 'Овен');
    const ascendant: PlanetInterpretation = {
      planet: locale === 'en' ? 'Ascendant' : 'Асцендент',
      sign: ascSign,
      house: 1,
      degree: houses[1]?.cusp || 0,
      interpretation: this.interpretAscendant(ascSign, locale),
      keywords: this.getAscendantKeywords(ascSign, locale),
      strengths: this.getAscendantStrengths(ascSign, locale),
      challenges: this.getAscendantChallenges(ascSign, locale),
    };

    // Общий обзор
    const overview = this.generateOverview(chartData, locale);

    // Резюме
    const summary = this.generateSummary(
      planetsInterpretation,
      aspectsInterpretation,
      housesInterpretation,
    );

    const interpretation: NatalChartInterpretation = {
      overview,
      sunSign: planetsInterpretation[0],
      moonSign: planetsInterpretation[1],
      ascendant,
      planets: planetsInterpretation,
      aspects: aspectsInterpretation,
      houses: housesInterpretation,
      summary,
    };

    // Сохраняем интерпретацию в базу данных
    await this.saveInterpretation(userId, interpretation);

    return interpretation;
  }

  /**
   * Получение сохраненной интерпретации
   */
  async getStoredInterpretation(
    userId: string,
  ): Promise<NatalChartInterpretation | null> {
    const chart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!chart || !chart.data) {
      return null;
    }

    const chartData = chart.data as any;
    return chartData.interpretation || null;
  }

  /**
   * Сохранение интерпретации
   */
  private async saveInterpretation(
    userId: string,
    interpretation: NatalChartInterpretation,
  ): Promise<void> {
    const chart = await this.prisma.chart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (chart) {
      const updatedData = {
        ...(chart.data as any),
        interpretation,
        interpretationVersion: 'v3',
      };

      await this.prisma.chart.update({
        where: { id: chart.id },
        data: { data: updatedData },
      });
    }
  }

  /**
   * Интерпретация планеты в знаке
   */
  private interpretPlanetInSign(
    planet: string,
    sign: string,
    houseNum: number,
    dignity: DignityLevel,
    isRetrograde: boolean,
    locale: 'ru' | 'en',
  ): string {
    const base =
      getPlanetInSignText(planet as any, sign as any, locale) ||
      (locale === 'en'
        ? `${this.getPlanetName(planet)} in ${sign} influences your life uniquely.`
        : `${this.getPlanetName(planet)} в ${sign} влияет на вашу жизнь уникальным образом.`);

    const area = this.getHouseLifeArea(houseNum, locale);
    const dignityMap =
      locale === 'en'
        ? {
            ruler: 'in rulership',
            exalted: 'exalted',
            triplicity: 'in triplicity',
            neutral: 'balanced position',
            detriment: 'in detriment',
            fall: 'in fall',
          }
        : {
            ruler: 'в домициле',
            exalted: 'в экзальтации',
            triplicity: 'в триплицитете',
            neutral: 'нейтральное положение',
            detriment: 'в изгнании',
            fall: 'в падении',
          };

    const areaText = locale === 'en' ? ` Focus: ${area}.` : ` Сфера: ${area}.`;
    const dignityText =
      locale === 'en'
        ? ` Dignity: ${dignityMap[dignity]}.`
        : ` Достоинство: ${dignityMap[dignity]}.`;
    const retroText = isRetrograde
      ? locale === 'en'
        ? ' Retrograde — expression is more inward and reflective.'
        : ' Ретроградность — выражение более интровертное и рефлексивное.'
      : '';

    return `${base} ${areaText}${dignityText}${retroText}`.trim();
  }

  /**
   * Интерпретация аспекта через словари (пары планет + фолбэк)
   */
  private interpretAspect(
    planet1: string,
    planet2: string,
    aspect: string,
    locale: 'ru' | 'en',
  ): string {
    return getAspectInterpretation(
      aspect as any,
      planet1 as any,
      planet2 as any,
      locale,
    );
  }

  /**
   * Генерация обзора натальной карты
   */
  private generateOverview(chartData: any, locale: 'ru' | 'en'): string {
    const sun = chartData.planets?.sun;
    const moon = chartData.planets?.moon;
    const asc = chartData.houses?.[1];

    if (locale === 'en') {
      return `Your natal chart shows a unique configuration of cosmic energies at birth.
Sun in ${sun?.sign || 'an unknown sign'} shapes core vitality and self-expression.
Moon in ${moon?.sign || 'an unknown sign'} reveals emotional nature and inner world.
Ascendant in ${asc?.sign || 'an unknown sign'} reflects how you meet the world.
Together, these form a coherent portrait of your personality and life path.`;
    }

    return `Ваша натальная карта показывает уникальное сочетание космических энергий в момент вашего рождения.
Солнце в ${sun?.sign || 'неизвестном знаке'} определяет жизненную силу и самовыражение.
Луна в ${moon?.sign || 'неизвестном знаке'} раскрывает эмоциональную природу и внутренний мир.
Асцендент в ${asc?.sign || 'неизвестном знаке'} отражает то, как вы встречаете мир.
Вместе эти элементы создают цельный портрет вашей личности и жизненного пути.`;
  }

  /**
   * Генерация резюме
   */
  private generateSummary(
    planets: PlanetInterpretation[],
    aspects: any[],
    houses: any[],
  ): {
    personalityTraits: string[];
    lifeThemes: string[];
    karmaLessons: string[];
    talents: string[];
    recommendations: string[];
  } {
    // Анализируем планеты для определения черт личности
    const personalityTraits: string[] = [];
    const talents: string[] = [];

    planets.forEach((planet) => {
      personalityTraits.push(...planet.keywords.slice(0, 2));
      talents.push(...planet.strengths.slice(0, 1));
    });

    // Анализируем аспекты для жизненных тем
    const lifeThemes = [
      'Самопознание и личностный рост',
      'Отношения и партнерство',
      'Карьера и призвание',
      'Духовное развитие',
    ];

    // Кармические уроки на основе сложных аспектов
    const karmaLessons = [
      'Развитие терпения и выдержки',
      'Обретение внутреннего баланса',
      'Принятие ответственности за свою жизнь',
      'Трансформация через сложности',
    ];

    // Рекомендации
    const recommendations = [
      'Используйте свои природные таланты для достижения целей',
      'Работайте над гармонизацией противоречивых энергий в карте',
      'Развивайте осознанность в сферах, где у вас есть вызовы',
      'Доверяйте своей интуиции при принятии важных решений',
      'Практикуйте самопринятие и любовь к себе',
    ];

    return {
      personalityTraits: [...new Set(personalityTraits)].slice(0, 5),
      lifeThemes,
      karmaLessons,
      talents: [...new Set(talents)].slice(0, 5),
      recommendations,
    };
  }

  // Вспомогательные методы

  private getPlanetHouse(longitude: number, houses: any): number {
    for (let i = 1; i <= 12; i++) {
      const currentCusp = houses[i]?.cusp || 0;
      const nextCusp = houses[i === 12 ? 1 : i + 1]?.cusp || 0;

      if (currentCusp <= nextCusp) {
        if (longitude >= currentCusp && longitude < nextCusp) return i;
      } else {
        if (longitude >= currentCusp || longitude < nextCusp) return i;
      }
    }
    return 1;
  }

  private getPlanetName(key: string): string {
    return getPlanetNameRu(key as any) || key;
  }

  private getAspectName(aspect: string, locale: 'ru' | 'en'): string {
    return getATAspectName(aspect as any, locale) || aspect;
  }

  private getPlanetKeywords(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATKeywords(planet as any, sign as any, locale);
  }

  private getPlanetStrengths(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATStrengths(planet as any, sign as any, locale);
  }

  private getPlanetChallenges(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATChallenges(planet as any, sign as any, locale);
  }

  private getAscendantKeywords(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as any, locale);
    return meta.keywords;
  }

  private getAscendantStrengths(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as any, locale);
    return meta.strengths;
  }

  private getAscendantChallenges(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as any, locale);
    return meta.challenges;
  }

  private interpretAscendant(sign: string, locale: 'ru' | 'en'): string {
    return (
      getAscendantText(sign as any, locale) ||
      (locale === 'en'
        ? `Ascendant in ${sign} shapes your outer image.`
        : `Асцендент в ${sign} формирует ваш внешний образ.`)
    );
  }

  private interpretHouse(
    houseNum: number,
    sign: string,
    locale: 'ru' | 'en',
  ): string {
    return (
      getATHouseTheme(houseNum, sign as any, locale) ||
      (locale === 'en'
        ? `${houseNum} house in ${sign} influences an important life area.`
        : `${houseNum}-й дом в ${sign} влияет на важную жизненную сферу.`)
    );
  }

  private getHouseLifeArea(houseNum: number, locale: 'ru' | 'en'): string {
    return (
      getATLifeArea(houseNum, locale) ||
      (locale === 'en' ? 'Life area' : 'Жизненная сфера')
    );
  }

  private getAspectSignificance(aspect: string, strength: number): string {
    if (strength > 0.8) return 'Очень сильное влияние';
    if (strength > 0.6) return 'Сильное влияние';
    if (strength > 0.4) return 'Умеренное влияние';
    return 'Слабое влияние';
  }
}
