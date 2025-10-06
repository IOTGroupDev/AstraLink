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
        planet: 'Солнце',
        sign: sun.sign,
        house: this.getPlanetHouse(sun.longitude, houses),
        degree: sun.degree,
        interpretation: this.interpretPlanetInSign('sun', sun.sign),
        keywords: this.getPlanetKeywords('sun', sun.sign),
        strengths: this.getPlanetStrengths('sun', sun.sign),
        challenges: this.getPlanetChallenges('sun', sun.sign),
      });
    }

    // Луна
    const moon = planets.moon;
    if (moon) {
      planetsInterpretation.push({
        planet: 'Луна',
        sign: moon.sign,
        house: this.getPlanetHouse(moon.longitude, houses),
        degree: moon.degree,
        interpretation: this.interpretPlanetInSign('moon', moon.sign),
        keywords: this.getPlanetKeywords('moon', moon.sign),
        strengths: this.getPlanetStrengths('moon', moon.sign),
        challenges: this.getPlanetChallenges('moon', moon.sign),
      });
    }

    // Остальные планеты
    for (const [planetKey, planetData] of Object.entries(planets)) {
      if (planetKey !== 'sun' && planetKey !== 'moon') {
        const planet: any = planetData;
        planetsInterpretation.push({
          planet: this.getPlanetName(planetKey),
          sign: planet.sign,
          house: this.getPlanetHouse(planet.longitude, houses),
          degree: planet.degree,
          interpretation: this.interpretPlanetInSign(planetKey, planet.sign),
          keywords: this.getPlanetKeywords(planetKey, planet.sign),
          strengths: this.getPlanetStrengths(planetKey, planet.sign),
          challenges: this.getPlanetChallenges(planetKey, planet.sign),
        });
      }
    }

    // Интерпретация аспектов
    const aspectsInterpretation = aspects.map((aspect: any) => ({
      aspect: `${this.getPlanetName(aspect.planetA)} ${this.getAspectName(aspect.aspect)} ${this.getPlanetName(aspect.planetB)}`,
      interpretation: this.interpretAspect(
        aspect.planetA,
        aspect.planetB,
        aspect.aspect,
      ),
      significance: this.getAspectSignificance(aspect.aspect, aspect.strength),
    }));

    // Интерпретация домов
    const housesInterpretation = Object.entries(houses).map(
      ([houseNum, houseData]: [string, any]) => ({
        house: parseInt(houseNum),
        sign: houseData.sign,
        interpretation: this.interpretHouse(parseInt(houseNum), houseData.sign),
        lifeArea: this.getHouseLifeArea(parseInt(houseNum)),
      }),
    );

    // Асцендент (1-й дом)
    const ascendant: PlanetInterpretation = {
      planet: 'Асцендент',
      sign: houses[1]?.sign || 'Овен',
      house: 1,
      degree: houses[1]?.cusp || 0,
      interpretation: this.interpretAscendant(houses[1]?.sign || 'Овен'),
      keywords: this.getAscendantKeywords(houses[1]?.sign || 'Овен'),
      strengths: this.getAscendantStrengths(houses[1]?.sign || 'Овен'),
      challenges: this.getAscendantChallenges(houses[1]?.sign || 'Овен'),
    };

    // Общий обзор
    const overview = this.generateOverview(chartData);

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
  private interpretPlanetInSign(planet: string, sign: string): string {
    return (
      getPlanetInSignText(planet as any, sign as any, 'ru') ||
      `${this.getPlanetName(planet)} в ${sign} влияет на вашу жизнь уникальным образом.`
    );
  }

  /**
   * Интерпретация аспекта через словари (пары планет + фолбэк)
   */
  private interpretAspect(
    planet1: string,
    planet2: string,
    aspect: string,
  ): string {
    return getAspectInterpretation(aspect as any, planet1 as any, planet2 as any, 'ru');
  }

  /**
   * Генерация обзора натальной карты
   */
  private generateOverview(chartData: any): string {
    const sun = chartData.planets?.sun;
    const moon = chartData.planets?.moon;
    const asc = chartData.houses?.[1];

    return `Ваша натальная карта показывает уникальное сочетание космических энергий в момент вашего рождения. 
    Солнце в ${sun?.sign || 'неизвестном знаке'} определяет вашу основную жизненную силу и самовыражение. 
    Луна в ${moon?.sign || 'неизвестном знаке'} раскрывает вашу эмоциональную природу и внутренний мир. 
    Асцендент в ${asc?.sign || 'неизвестном знаке'} показывает, как вы представляетесь миру и взаимодействуете с окружающими. 
    Вместе эти элементы создают уникальный портрет вашей личности и жизненного пути.`;
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

  private getAspectName(aspect: string): string {
    return getATAspectName(aspect as any, 'ru') || aspect;
  }

  private getPlanetKeywords(planet: string, sign: string): string[] {
    return getATKeywords(planet as any, sign as any, 'ru');
  }

  private getPlanetStrengths(planet: string, sign: string): string[] {
    return getATStrengths(planet as any, sign as any, 'ru');
  }

  private getPlanetChallenges(planet: string, sign: string): string[] {
    return getATChallenges(planet as any, sign as any, 'ru');
  }

  private getAscendantKeywords(sign: string): string[] {
    const meta = getAscendantMeta(sign as any, 'ru');
    return meta.keywords;
  }

  private getAscendantStrengths(sign: string): string[] {
    const meta = getAscendantMeta(sign as any, 'ru');
    return meta.strengths;
  }

  private getAscendantChallenges(sign: string): string[] {
    const meta = getAscendantMeta(sign as any, 'ru');
    return meta.challenges;
  }

  private interpretAscendant(sign: string): string {
    return getAscendantText(sign as any, 'ru') || `Асцендент в ${sign} формирует ваш внешний образ.`;
  }

  private interpretHouse(houseNum: number, sign: string): string {
    return getATHouseTheme(houseNum, sign as any, 'ru') || `${houseNum}-й дом в ${sign} влияет на важную жизненную сферу.`;
  }

  private getHouseLifeArea(houseNum: number): string {
    return getATLifeArea(houseNum, 'ru') || 'Жизненная сфера';
  }

  private getAspectSignificance(aspect: string, strength: number): string {
    if (strength > 0.8) return 'Очень сильное влияние';
    if (strength > 0.6) return 'Сильное влияние';
    if (strength > 0.4) return 'Умеренное влияние';
    return 'Слабое влияние';
  }
}
