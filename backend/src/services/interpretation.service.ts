// backend/src/services/interpretation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getPlanetInSignText,
  getKeywords as getATKeywords,
  getStrengths as getATStrengths,
  getChallenges as getATChallenges,
  getAspectName as getATAspectName,
  getHouseSignInterpretation,
  getHouseLifeArea as getATLifeArea,
  getHouseTheme,
  getAscendantText,
  getPlanetNameRu,
  getAspectInterpretation,
  getAscendantMeta,
} from '../modules/shared/astro-text';
import { getEssentialDignity } from '../modules/shared/types';
import type { DignityLevel, PlanetKey, Sign } from '../modules/shared/types';
import type {
  ChartData,
  Planet,
  House,
  ChartAspect,
  PlanetInterpretation,
  AspectInterpretation,
  HouseInterpretation,
  NatalChartInterpretation,
  ChartSummary,
  ChartPatternInterpretation,
} from './interpretation.types';
import {
  detectAllChartPatterns,
  getPatternInterpretation,
  type PlanetPosition,
} from '../shared/astro-calculations';

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Генерация полной интерпретации натальной карты (только при регистрации)
   */
  async generateNatalChartInterpretation(
    userId: string,
    chartData: ChartData,
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
    if (sun && sun.sign) {
      const sunHouse = this.getPlanetHouse(sun.longitude, houses);
      const sunDignity = getEssentialDignity('sun', sun.sign);
      const sunRetro = !!sun.retrograde;

      planetsInterpretation.push({
        planet: locale === 'en' ? 'Sun' : 'Солнце',
        sign: sun.sign,
        house: sunHouse,
        degree: Math.round(sun.longitude % 30),
        interpretation: this.interpretPlanetInSign(
          'sun',
          sun.sign,
          sunHouse,
          sunDignity,
          sunRetro,
          locale,
        ),
        keywords: this.getPlanetKeywords('sun', sun.sign, locale),
        strengths: this.getPlanetStrengths('sun', sun.sign, locale),
        challenges: this.getPlanetChallenges('sun', sun.sign, locale),
        dignity: sunDignity,
        isRetrograde: sunRetro,
        element: this.getSignElement(sun.sign),
        quality: this.getSignQuality(sun.sign),
      });
    }

    // Луна
    const moon = planets.moon;
    if (moon && moon.sign) {
      const moonHouse = this.getPlanetHouse(moon.longitude, houses);
      const moonDignity = getEssentialDignity('moon', moon.sign);
      const moonRetro = !!moon.retrograde;
      planetsInterpretation.push({
        planet: locale === 'en' ? 'Moon' : 'Луна',
        sign: moon.sign,
        house: moonHouse,
        degree: Math.round(moon.longitude % 30),
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
        dignity: moonDignity,
        isRetrograde: moonRetro,
        element: this.getSignElement(moon.sign),
        quality: this.getSignQuality(moon.sign),
      });
    }

    // Остальные планеты
    for (const [planetKey, planetData] of Object.entries(planets)) {
      if (planetKey !== 'sun' && planetKey !== 'moon') {
        const planet = planetData;
        if (!planet.sign) continue; // Skip if no sign data

        const houseNum = this.getPlanetHouse(planet.longitude, houses);
        const dignity = getEssentialDignity(
          planetKey as PlanetKey,
          planet.sign as Sign,
        );
        const retro = !!planet.retrograde;
        planetsInterpretation.push({
          planet: this.getPlanetName(planetKey),
          sign: planet.sign,
          house: houseNum,
          degree: Math.round(planet.longitude % 30),
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
          dignity,
          isRetrograde: retro,
          element: this.getSignElement(planet.sign),
          quality: this.getSignQuality(planet.sign),
        });
      }
    }

    // Интерпретация аспектов
    const aspectsInterpretation: AspectInterpretation[] = aspects.map(
      (aspect) => {
        const name = `${this.getPlanetName(aspect.planetA)} ${this.getAspectName(aspect.aspect, locale)} ${this.getPlanetName(aspect.planetB)}`;

        let focusA = '';
        let focusB = '';
        try {
          const a = planets?.[aspect.planetA];
          const b = planets?.[aspect.planetB];
          const aHouse = a
            ? this.getPlanetHouse(a.longitude, houses)
            : undefined;
          const bHouse = b
            ? this.getPlanetHouse(b.longitude, houses)
            : undefined;
          const areaA = aHouse ? this.getHouseLifeArea(aHouse, locale) : '';
          const areaB = bHouse ? this.getHouseLifeArea(bHouse, locale) : '';
          if (areaA)
            focusA = `${this.getPlanetName(aspect.planetA)} → ${areaA}`;
          if (areaB)
            focusB = `${this.getPlanetName(aspect.planetB)} → ${areaB}`;
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
        const strength = aspect.strength || 0;
        const strengthText =
          strength > 0.8
            ? 'Очень сильный аспект'
            : strength > 0.6
              ? 'Сильный аспект'
              : strength > 0.4
                ? 'Умеренный аспект'
                : 'Слабый аспект';

        return {
          aspect: name,
          interpretation: [base, focus ? `Фокус: ${focus}.` : '']
            .filter(Boolean)
            .join(' '),
          significance: `${strengthText}`,
          orb: aspect.orb || 0,
          strength: Math.round((aspect.strength || 0) * 100),
          planetA: this.getPlanetName(aspect.planetA),
          planetB: this.getPlanetName(aspect.planetB),
          type: this.getAspectName(aspect.aspect, locale),
        };
      },
    );

    // Интерпретация домов
    const housesInterpretation: HouseInterpretation[] = Object.entries(
      houses,
    ).map(([houseNum, houseData]) => {
      const house = houseData;
      const houseNumber = parseInt(houseNum);
      const planetsInHouse = this.getPlanetsInHouse(
        houseNumber,
        planets,
        houses,
      );

      return {
        house: houseNumber,
        sign: house.sign || '',
        interpretation: this.interpretHouse(
          houseNumber,
          house.sign || 'Aries',
          locale,
        ),
        lifeArea: this.getHouseLifeArea(houseNumber, locale),
        keywords: this.getHouseKeywords(
          houseNumber,
          house.sign || 'Aries',
          locale,
        ),
        strengths: this.getHouseStrengths(
          houseNumber,
          house.sign || 'Aries',
          locale,
        ),
        challenges: this.getHouseChallenges(
          houseNumber,
          house.sign || 'Aries',
          locale,
        ),
        planets: planetsInHouse,
        theme: getHouseTheme(houseNumber, house.sign || 'Aries', locale),
        rulingPlanet: this.getHouseRulingPlanet(houseNumber, locale),
      };
    });

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
      element: this.getSignElement(ascSign),
      quality: this.getSignQuality(ascSign),
    };

    // Определение паттернов (Grand Trine, T-Square, Yod)
    const patternInterpretation = this.detectChartPatterns(
      planets,
      chartData,
      locale,
    );

    // Общий обзор
    const overview = this.generateOverview(chartData, locale);

    // Резюме
    const summary = this.generateExpandedSummary(
      planetsInterpretation,
      aspectsInterpretation,
      housesInterpretation,
      chartData,
      locale,
    );

    const interpretation: NatalChartInterpretation = {
      overview,
      sunSign: planetsInterpretation[0],
      moonSign: planetsInterpretation[1],
      ascendant,
      planets: planetsInterpretation,
      aspects: aspectsInterpretation,
      houses: housesInterpretation,
      patterns: patternInterpretation,
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
      getPlanetInSignText(planet as PlanetKey, sign as Sign, locale) ||
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
      aspect as import('../modules/shared/types').AspectType,
      planet1 as PlanetKey,
      planet2 as PlanetKey,
      locale,
    );
  }

  /**
   * Генерация обзора натальной карты
   */
  private generateOverview(chartData: ChartData, locale: 'ru' | 'en'): string {
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
   * Генерация расширенного резюме
   */
  private generateExpandedSummary(
    planets: PlanetInterpretation[],
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    chartData: ChartData,
    locale: 'ru' | 'en',
  ): ChartSummary {
    // Анализируем планеты для определения черт личности
    const personalityTraits: string[] = [];
    const talents: string[] = [];

    planets.forEach((planet) => {
      personalityTraits.push(...planet.keywords.slice(0, 2));
      talents.push(...planet.strengths.slice(0, 1));
    });

    // Доминирующие элементы и качества
    const dominantElements = this.analyzeDominantElements(planets, locale);
    const dominantQualities = this.analyzeDominantQualities(planets, locale);

    // Анализируем аспекты для жизненных тем
    const lifeThemes = this.analyzeLifeThemes(aspects, houses, locale);

    // Кармические уроки на основе сложных аспектов
    const karmaLessons = this.analyzeKarmaLessons(aspects, planets, locale);

    // Расширенные рекомендации
    const recommendations = this.generateDetailedRecommendations(
      planets,
      aspects,
      houses,
      locale,
    );

    // Жизненная цель, отношения, карьера
    const lifePurpose = this.analyzeLifePurpose(planets, houses, locale);
    const relationships = this.analyzeRelationships(aspects, houses, locale);
    const careerPath = this.analyzeCareerPath(planets, houses, locale);
    const spiritualPath = this.analyzeSpiritualPath(planets, houses, locale);
    const healthFocus = this.analyzeHealthFocus(planets, houses, locale);
    const financialApproach = this.analyzeFinancialApproach(
      planets,
      houses,
      locale,
    );

    return {
      personalityTraits: [...new Set(personalityTraits)].slice(0, 8),
      lifeThemes,
      karmaLessons,
      talents: [...new Set(talents)].slice(0, 6),
      recommendations,
      dominantElements,
      dominantQualities,
      lifePurpose,
      relationships,
      careerPath,
      spiritualPath,
      healthFocus,
      financialApproach,
    };
  }

  // Вспомогательные методы

  private getPlanetHouse(
    longitude: number,
    houses: Record<number, House>,
  ): number {
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
    return getPlanetNameRu(key as PlanetKey) || key;
  }

  private getAspectName(aspect: string, locale: 'ru' | 'en'): string {
    return (
      getATAspectName(
        aspect as import('../modules/shared/types').AspectType,
        locale,
      ) || aspect
    );
  }

  private getPlanetKeywords(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATKeywords(planet as PlanetKey, sign as Sign, locale);
  }

  private getPlanetStrengths(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATStrengths(planet as PlanetKey, sign as Sign, locale);
  }

  private getPlanetChallenges(
    planet: string,
    sign: string,
    locale: 'ru' | 'en',
  ): string[] {
    return getATChallenges(planet as PlanetKey, sign as Sign, locale);
  }

  private getAscendantKeywords(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.keywords;
  }

  private getAscendantStrengths(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.strengths;
  }

  private getAscendantChallenges(sign: string, locale: 'ru' | 'en'): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.challenges;
  }

  private interpretAscendant(sign: string, locale: 'ru' | 'en'): string {
    return (
      getAscendantText(sign as Sign, locale) ||
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
      getHouseSignInterpretation(houseNum, sign as Sign, locale) ||
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

  private getPlanetsInHouse(
    houseNum: number,
    planets: Record<string, Planet>,
    houses: Record<number, House>,
  ): string[] {
    const result: string[] = [];
    Object.entries(planets).forEach(([key, planet]) => {
      const planetHouse = this.getPlanetHouse(planet.longitude, houses);
      if (planetHouse === houseNum) {
        result.push(this.getPlanetName(key));
      }
    });
    return result;
  }

  private getHouseKeywords(
    houseNum: number,
    _sign: string,
    _locale: 'ru' | 'en',
  ): string[] {
    // Simplified house keywords based on sign traits
    const basicKeywords: Record<number, string[]> = {
      1: ['самовыражение', 'инициатива'],
      2: ['ценности', 'ресурсы'],
      3: ['общение', 'обучение'],
      4: ['семья', 'дом'],
      5: ['творчество', 'радость'],
      6: ['служение', 'здоровье'],
      7: ['партнерство', 'отношения'],
      8: ['трансформация', 'глубина'],
      9: ['познание', 'расширение'],
      10: ['карьера', 'статус'],
      11: ['сообщество', 'идеалы'],
      12: ['духовность', 'завершение'],
    };
    return basicKeywords[houseNum] || [];
  }

  private getHouseStrengths(
    houseNum: number,
    _sign: string,
    _locale: 'ru' | 'en',
  ): string[] {
    const basicStrengths: Record<number, string[]> = {
      1: ['Лидерство', 'Инициатива'],
      2: ['Надежность', 'Практичность'],
      3: ['Коммуникабельность', 'Обучаемость'],
      4: ['Заботливость', 'Стабильность'],
      5: ['Творчество', 'Радость'],
      6: ['Ответственность', 'Служение'],
      7: ['Дипломатия', 'Гармония'],
      8: ['Проницательность', 'Сила'],
      9: ['Мудрость', 'Оптимизм'],
      10: ['Амбициозность', 'Дисциплина'],
      11: ['Идеализм', 'Дружба'],
      12: ['Интуиция', 'Сострадание'],
    };
    return basicStrengths[houseNum] || [];
  }

  private getHouseChallenges(
    houseNum: number,
    _sign: string,
    _locale: 'ru' | 'en',
  ): string[] {
    const basicChallenges: Record<number, string[]> = {
      1: ['Импульсивность', 'Эгоцентризм'],
      2: ['Жадность', 'Материализм'],
      3: ['Поверхностность', 'Непостоянство'],
      4: ['Зависимость', 'Консерватизм'],
      5: ['Эгоизм', 'Безответственность'],
      6: ['Критичность', 'Переутомление'],
      7: ['Зависимость', 'Компромиссы'],
      8: ['Контроль', 'Одержимость'],
      9: ['Самоуверенность', 'Рассеянность'],
      10: ['Авторитаризм', 'Холодность'],
      11: ['Отстраненность', 'Идеализация'],
      12: ['Иллюзии', 'Изоляция'],
    };
    return basicChallenges[houseNum] || [];
  }

  private getHouseRulingPlanet(houseNum: number, locale: 'ru' | 'en'): string {
    const rulingPlanets: Record<number, string> = {
      1: locale === 'en' ? 'Mars' : 'Марс',
      2: locale === 'en' ? 'Venus' : 'Венера',
      3: locale === 'en' ? 'Mercury' : 'Меркурий',
      4: locale === 'en' ? 'Moon' : 'Луна',
      5: locale === 'en' ? 'Sun' : 'Солнце',
      6: locale === 'en' ? 'Mercury' : 'Меркурий',
      7: locale === 'en' ? 'Venus' : 'Венера',
      8: locale === 'en' ? 'Pluto' : 'Плутон',
      9: locale === 'en' ? 'Jupiter' : 'Юпитер',
      10: locale === 'en' ? 'Saturn' : 'Сатурн',
      11: locale === 'en' ? 'Uranus' : 'Уран',
      12: locale === 'en' ? 'Neptune' : 'Нептун',
    };
    return rulingPlanets[houseNum] || '';
  }

  private analyzeDominantElements(
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en',
  ): string[] {
    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    const signElements: Record<string, keyof typeof elements> = {
      Aries: 'fire',
      Taurus: 'earth',
      Gemini: 'air',
      Cancer: 'water',
      Leo: 'fire',
      Virgo: 'earth',
      Libra: 'air',
      Scorpio: 'water',
      Sagittarius: 'fire',
      Capricorn: 'earth',
      Aquarius: 'air',
      Pisces: 'water',
    };

    planets.forEach((planet) => {
      const element = signElements[planet.sign];
      if (element) elements[element]++;
    });

    const dominant = Object.entries(elements)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([element]) => {
        const names =
          locale === 'en'
            ? { fire: 'Fire', earth: 'Earth', air: 'Air', water: 'Water' }
            : { fire: 'Огонь', earth: 'Земля', air: 'Воздух', water: 'Вода' };
        return names[element as keyof typeof names];
      });

    return dominant;
  }

  private analyzeDominantQualities(
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en',
  ): string[] {
    const qualities = { cardinal: 0, fixed: 0, mutable: 0 };
    const signQualities: Record<string, keyof typeof qualities> = {
      Aries: 'cardinal',
      Taurus: 'fixed',
      Gemini: 'mutable',
      Cancer: 'cardinal',
      Leo: 'fixed',
      Virgo: 'mutable',
      Libra: 'cardinal',
      Scorpio: 'fixed',
      Sagittarius: 'mutable',
      Capricorn: 'cardinal',
      Aquarius: 'fixed',
      Pisces: 'mutable',
    };

    planets.forEach((planet) => {
      const quality = signQualities[planet.sign];
      if (quality) qualities[quality]++;
    });

    const dominant = Object.entries(qualities)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([quality]) => {
        const names =
          locale === 'en'
            ? { cardinal: 'Cardinal', fixed: 'Fixed', mutable: 'Mutable' }
            : {
                cardinal: 'Кардинальный',
                fixed: 'Фиксированный',
                mutable: 'Мутабельный',
              };
        return names[quality as keyof typeof names];
      });

    return dominant;
  }

  private analyzeLifeThemes(
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string[] {
    const themes: string[] = [];

    // Analyze aspects for themes
    aspects.forEach((aspect) => {
      if (aspect.strength > 0.6) {
        if (
          aspect.type.includes('квадрат') ||
          aspect.type.includes('оппозиц')
        ) {
          themes.push(locale === 'en' ? 'Personal Growth' : 'Личный рост');
        }
        if (
          aspect.type.includes('тригон') ||
          aspect.type.includes('секстиль')
        ) {
          themes.push(locale === 'en' ? 'Harmony' : 'Гармония');
        }
      }
    });

    // Analyze houses for themes
    houses.forEach((house) => {
      if (house.planets.length > 1) {
        themes.push(locale === 'en' ? 'Complex Dynamics' : 'Сложная динамика');
      }
    });

    return [...new Set(themes)].slice(0, 6);
  }

  private analyzeKarmaLessons(
    aspects: AspectInterpretation[],
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en',
  ): string[] {
    const lessons: string[] = [];

    // Challenging aspects indicate lessons
    const challengingAspects = aspects.filter(
      (a) =>
        a.strength > 0.5 &&
        (a.type.includes('квадрат') || a.type.includes('оппозиц')),
    );
    if (challengingAspects.length > 3) {
      lessons.push(locale === 'en' ? 'Mastering Balance' : 'Освоение баланса');
    }

    // Retrograde planets indicate inner work
    const retrogradeCount = planets.filter((p) =>
      p.interpretation.includes('Ретроградность'),
    ).length;
    if (retrogradeCount > 2) {
      lessons.push(
        locale === 'en' ? 'Inner Reflection' : 'Внутренняя рефлексия',
      );
    }

    return lessons.length > 0
      ? lessons
      : [
          locale === 'en' ? 'Self-Acceptance' : 'Самопринятие',
          locale === 'en' ? 'Patience' : 'Терпение',
          locale === 'en' ? 'Growth Through Challenge' : 'Рост через вызовы',
        ];
  }

  private generateDetailedRecommendations(
    planets: PlanetInterpretation[],
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string[] {
    const recommendations: string[] = [];

    // Planet-based recommendations
    const strongPlanets = planets.filter((p) => p.strengths.length > 0);
    if (strongPlanets.length > 0) {
      recommendations.push(
        locale === 'en'
          ? 'Leverage your natural strengths for personal and professional growth'
          : 'Используйте свои природные сильные стороны для личного и профессионального роста',
      );
    }

    // Aspect-based recommendations
    const harmoniousAspects = aspects.filter(
      (a) => a.type.includes('тригон') || a.type.includes('секстиль'),
    );
    const challengingAspects = aspects.filter(
      (a) => a.type.includes('квадрат') || a.type.includes('оппозиц'),
    );

    if (harmoniousAspects.length > challengingAspects.length) {
      recommendations.push(
        locale === 'en'
          ? 'Build upon your natural talents and harmonious energies'
          : 'Строите на своих природных талантах и гармоничных энергиях',
      );
    } else {
      recommendations.push(
        locale === 'en'
          ? 'Work on integrating challenging aspects for greater wholeness'
          : 'Работайте над интеграцией сложных аспектов для большей целостности',
      );
    }

    // House-based recommendations
    const activeHouses = houses.filter((h) => h.planets.length > 0);
    if (activeHouses.length > 6) {
      recommendations.push(
        locale === 'en'
          ? 'Focus on balancing multiple life areas'
          : 'Фокусируйтесь на балансе различных жизненных сфер',
      );
    }

    return recommendations.slice(0, 8);
  }

  private analyzeLifePurpose(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    // Analyze sun, moon, and 10th house for life purpose
    const sun = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Sun' : 'Солнце'),
    );
    const tenthHouse = houses.find((h: any) => h.house === 10);

    let purpose =
      locale === 'en'
        ? 'Your life purpose involves '
        : 'Ваша жизненная цель связана с ';

    if (sun) {
      purpose +=
        locale === 'en'
          ? `expressing your ${sun.sign} essence through leadership and creativity`
          : `выражением своей ${sun.sign} сущности через лидерство и творчество`;
    }

    if (tenthHouse && tenthHouse.planets.length > 0) {
      purpose +=
        locale === 'en'
          ? ', contributing to society through your professional calling'
          : ', внесением вклада в общество через профессиональное призвание';
    }

    return purpose;
  }

  private analyzeRelationships(
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    const seventhHouse = houses.find((h: any) => h.house === 7);
    const venusAspects = aspects.filter(
      (a) => a.planetA === 'Venus' || a.planetB === 'Venus',
    );

    let relationships =
      locale === 'en'
        ? 'In relationships, you seek '
        : 'В отношениях вы ищете ';

    if (seventhHouse && seventhHouse.planets.length > 0) {
      relationships +=
        locale === 'en'
          ? 'deep partnership and mutual growth'
          : 'глубокое партнерство и взаимный рост';
    } else {
      relationships +=
        locale === 'en' ? 'harmony and understanding' : 'гармонию и понимание';
    }

    if (venusAspects.length > 0) {
      relationships +=
        locale === 'en'
          ? ', with Venus influencing your approach to love and connection'
          : ', где Венера влияет на ваш подход к любви и связи';
    }

    return relationships;
  }

  private analyzeCareerPath(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    const tenthHouse = houses.find((h: any) => h.house === 10);
    const sixthHouse = houses.find((h: any) => h.house === 6);
    const mars = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Mars' : 'Марс'),
    );
    const saturn = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Saturn' : 'Сатурн'),
    );
    const jupiter = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Jupiter' : 'Юпитер'),
    );

    let career =
      locale === 'en'
        ? 'Your career path involves '
        : 'Ваш карьерный путь включает ';

    if (tenthHouse && tenthHouse.planets.length > 0) {
      career +=
        locale === 'en'
          ? 'leadership and public recognition'
          : 'лидерство и общественное признание';
    } else if (sixthHouse && sixthHouse.planets.length > 0) {
      career +=
        locale === 'en'
          ? 'service and practical contribution'
          : 'служение и практический вклад';
    } else {
      career +=
        locale === 'en'
          ? 'finding meaning through work that aligns with your values'
          : 'нахождение смысла через работу, которая соответствует вашим ценностям';
    }

    if (mars && mars.strengths.length > 0) {
      career +=
        locale === 'en'
          ? ', with Mars providing the drive to achieve your goals'
          : ', где Марс дает импульс для достижения целей';
    }

    if (saturn && saturn.strengths.length > 0) {
      career +=
        locale === 'en'
          ? '. Saturn brings discipline and long-term planning'
          : '. Сатурн привносит дисциплину и долгосрочное планирование';
    }

    if (jupiter && jupiter.strengths.length > 0) {
      career +=
        locale === 'en'
          ? '. Jupiter expands opportunities and brings optimism'
          : '. Юпитер расширяет возможности и привносит оптимизм';
    }

    return career;
  }

  private analyzeSpiritualPath(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    const twelfthHouse = houses.find((h: any) => h.house === 12);
    const ninthHouse = houses.find((h: any) => h.house === 9);
    const neptune = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Neptune' : 'Нептун'),
    );
    const pluto = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Pluto' : 'Плутон'),
    );

    let spiritual =
      locale === 'en'
        ? 'Your spiritual path involves '
        : 'Ваш духовный путь включает ';

    if (neptune && neptune.strengths.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'deep intuition and connection to the divine'
          : 'глубокую интуицию и связь с божественным';
    } else if (pluto && pluto.strengths.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'transformation and rebirth through spiritual practices'
          : 'трансформацию и возрождение через духовные практики';
    } else if (twelfthHouse && twelfthHouse.planets.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'exploring the subconscious and universal consciousness'
          : 'исследование подсознания и универсального сознания';
    } else if (ninthHouse && ninthHouse.planets.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'seeking wisdom through philosophy and higher learning'
          : 'поиск мудрости через философию и высшее обучение';
    } else {
      spiritual +=
        locale === 'en'
          ? 'personal growth through meditation and self-reflection'
          : 'личностный рост через медитацию и саморефлексию';
    }

    return spiritual;
  }

  private analyzeHealthFocus(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    const sixthHouse = houses.find((h: any) => h.house === 6);
    const firstHouse = houses.find((h: any) => h.house === 1);
    const moon = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Moon' : 'Луна'),
    );
    const mars = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Mars' : 'Марс'),
    );

    let health =
      locale === 'en'
        ? 'Your health focus involves '
        : 'Ваш фокус на здоровье включает ';

    if (sixthHouse && sixthHouse.planets.length > 0) {
      health +=
        locale === 'en'
          ? 'daily routines and preventive care'
          : 'ежедневные рутины и профилактический уход';
    } else if (moon && moon.strengths.length > 0) {
      health +=
        locale === 'en'
          ? 'emotional well-being and stress management'
          : 'эмоциональное благополучие и управление стрессом';
    } else if (mars && mars.strengths.length > 0) {
      health +=
        locale === 'en'
          ? 'physical activity and maintaining vitality'
          : 'физическую активность и поддержание жизнеспособности';
    } else if (firstHouse && firstHouse.planets.length > 0) {
      health +=
        locale === 'en'
          ? 'overall vitality and immune system support'
          : 'общую жизнеспособность и поддержку иммунной системы';
    } else {
      health +=
        locale === 'en'
          ? 'balanced lifestyle with attention to body and mind'
          : 'сбалансированный образ жизни с вниманием к телу и разуму';
    }

    return health;
  }

  private analyzeFinancialApproach(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en',
  ): string {
    const secondHouse = houses.find((h: any) => h.house === 2);
    const eighthHouse = houses.find((h: any) => h.house === 8);
    const venus = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Venus' : 'Венера'),
    );
    const jupiter = planets.find(
      (p) => p.planet === (locale === 'en' ? 'Jupiter' : 'Юпитер'),
    );

    let finance =
      locale === 'en'
        ? 'Your financial approach involves '
        : 'Ваш финансовый подход включает ';

    if (venus && venus.strengths.length > 0) {
      finance +=
        locale === 'en'
          ? 'appreciating value and investing in quality'
          : 'оценку ценности и инвестиции в качество';
    } else if (jupiter && jupiter.strengths.length > 0) {
      finance +=
        locale === 'en'
          ? 'optimistic growth and expanding resources'
          : 'оптимистичный рост и расширение ресурсов';
    } else if (secondHouse && secondHouse.planets.length > 0) {
      finance +=
        locale === 'en'
          ? 'building security through steady accumulation'
          : 'построение безопасности через стабильное накопление';
    } else if (eighthHouse && eighthHouse.planets.length > 0) {
      finance +=
        locale === 'en'
          ? 'joint resources and strategic investments'
          : 'совместные ресурсы и стратегические инвестиции';
    } else {
      finance +=
        locale === 'en'
          ? 'practical money management and long-term planning'
          : 'практичное управление деньгами и долгосрочное планирование';
    }

    return finance;
  }

  /**
   * Detect chart patterns (Grand Trine, T-Square, Yod)
   */
  private detectChartPatterns(
    planets: Record<string, Planet>,
    chartData: ChartData,
    locale: 'ru' | 'en',
  ): ChartPatternInterpretation[] {
    // Convert planets to PlanetPosition format for pattern detection
    const planetPositions: PlanetPosition[] = Object.entries(planets)
      .filter(([_, planet]) => planet && typeof planet.longitude === 'number')
      .map(([key, planet]) => ({
        planet: key,
        longitude: planet.longitude,
        sign: planet.sign,
      }));

    // Detect all patterns
    const detected = detectAllChartPatterns(planetPositions);

    // Convert to interpretation format
    const patterns: ChartPatternInterpretation[] = [];

    // Add Grand Trines
    detected.grandTrines.forEach((pattern) => {
      patterns.push({
        type: pattern.type,
        planets: pattern.planets.map((p) => this.getPlanetName(p)),
        element: pattern.element,
        description: pattern.description,
        interpretation: getPatternInterpretation(pattern, locale),
        strength: pattern.strength,
      });
    });

    // Add T-Squares
    detected.tSquares.forEach((pattern) => {
      patterns.push({
        type: pattern.type,
        planets: pattern.planets.map((p) => this.getPlanetName(p)),
        description: pattern.description,
        interpretation: getPatternInterpretation(pattern, locale),
        strength: pattern.strength,
      });
    });

    // Add Yods
    detected.yods.forEach((pattern) => {
      patterns.push({
        type: pattern.type,
        planets: pattern.planets.map((p) => this.getPlanetName(p)),
        description: pattern.description,
        interpretation: getPatternInterpretation(pattern, locale),
        strength: pattern.strength,
      });
    });

    return patterns;
  }

  /**
   * Get zodiac sign element (fire, earth, air, water)
   */
  private getSignElement(sign: string): 'fire' | 'earth' | 'air' | 'water' | undefined {
    const elements: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
      Aries: 'fire',
      Taurus: 'earth',
      Gemini: 'air',
      Cancer: 'water',
      Leo: 'fire',
      Virgo: 'earth',
      Libra: 'air',
      Scorpio: 'water',
      Sagittarius: 'fire',
      Capricorn: 'earth',
      Aquarius: 'air',
      Pisces: 'water',
    };
    return elements[sign];
  }

  /**
   * Get zodiac sign quality (cardinal, fixed, mutable)
   */
  private getSignQuality(sign: string): 'cardinal' | 'fixed' | 'mutable' | undefined {
    const qualities: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
      Aries: 'cardinal',
      Taurus: 'fixed',
      Gemini: 'mutable',
      Cancer: 'cardinal',
      Leo: 'fixed',
      Virgo: 'mutable',
      Libra: 'cardinal',
      Scorpio: 'fixed',
      Sagittarius: 'mutable',
      Capricorn: 'cardinal',
      Aquarius: 'fixed',
      Pisces: 'mutable',
    };
    return qualities[sign];
  }
}
