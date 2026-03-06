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
  getPlanetNameLocalized,
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
    locale: 'ru' | 'en' | 'es' = 'ru',
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
        planet: this.getPlanetName('sun', locale),
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
        planet: this.getPlanetName('moon', locale),
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
          planet: this.getPlanetName(planetKey, locale),
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
        const name = `${this.getPlanetName(aspect.planetA, locale)} ${this.getAspectName(aspect.aspect, locale)} ${this.getPlanetName(aspect.planetB, locale)}`;

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
            focusA = `${this.getPlanetName(aspect.planetA, locale)} → ${areaA}`;
          if (areaB)
            focusB = `${this.getPlanetName(aspect.planetB, locale)} → ${areaB}`;
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
            ? locale === 'en'
              ? 'Very strong aspect'
              : locale === 'es'
                ? 'Aspecto muy fuerte'
                : 'Очень сильный аспект'
            : strength > 0.6
              ? locale === 'en'
                ? 'Strong aspect'
                : locale === 'es'
                  ? 'Aspecto fuerte'
                  : 'Сильный аспект'
              : strength > 0.4
                ? locale === 'en'
                  ? 'Moderate aspect'
                  : locale === 'es'
                    ? 'Aspecto moderado'
                    : 'Умеренный аспект'
                : locale === 'en'
                  ? 'Weak aspect'
                  : locale === 'es'
                    ? 'Aspecto débil'
                    : 'Слабый аспект';

        const focusLabel =
          locale === 'en' ? 'Focus' : locale === 'es' ? 'Enfoque' : 'Фокус';

        return {
          aspect: name,
          interpretation: [base, focus ? `${focusLabel}: ${focus}.` : '']
            .filter(Boolean)
            .join(' '),
          significance: `${strengthText}`,
          orb: aspect.orb || 0,
          strength: Math.round((aspect.strength || 0) * 100),
          planetA: this.getPlanetName(aspect.planetA, locale),
          planetB: this.getPlanetName(aspect.planetB, locale),
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
        locale,
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
    const ascSign =
      houses[1]?.sign ||
      (locale === 'en' ? 'Aries' : locale === 'es' ? 'Aries' : 'Овен');
    const ascendant: PlanetInterpretation = {
      planet:
        locale === 'en'
          ? 'Ascendant'
          : locale === 'es'
            ? 'Ascendente'
            : 'Асцендент',
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
    locale: 'ru' | 'en' | 'es',
  ): string {
    const base =
      getPlanetInSignText(planet as PlanetKey, sign as Sign, locale) ||
      (locale === 'en'
        ? `${this.getPlanetName(planet)} in ${sign} influences your life uniquely.`
        : locale === 'es'
          ? `${this.getPlanetName(planet)} en ${sign} influye de manera única en tu vida.`
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
        : locale === 'es'
          ? {
              ruler: 'en domicilio',
              exalted: 'exaltado',
              triplicity: 'en triplicidad',
              neutral: 'posición equilibrada',
              detriment: 'en detrimento',
              fall: 'en caída',
            }
          : {
              ruler: 'в домициле',
              exalted: 'в экзальтации',
              triplicity: 'в триплицитете',
              neutral: 'нейтральное положение',
              detriment: 'в изгнании',
              fall: 'в падении',
            };

    const areaText =
      locale === 'en'
        ? ` Focus: ${area}.`
        : locale === 'es'
          ? ` Área: ${area}.`
          : ` Сфера: ${area}.`;
    const dignityText =
      locale === 'en'
        ? ` Dignity: ${dignityMap[dignity]}.`
        : locale === 'es'
          ? ` Dignidad: ${dignityMap[dignity]}.`
          : ` Достоинство: ${dignityMap[dignity]}.`;
    const retroText = isRetrograde
      ? locale === 'en'
        ? ' Retrograde — expression is more inward and reflective.'
        : locale === 'es'
          ? ' Retrógrado — la expresión es más interna y reflexiva.'
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
    locale: 'ru' | 'en' | 'es',
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
  private generateOverview(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): string {
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
    if (locale === 'es') {
      return `Tu carta natal muestra una configuración única de energías cósmicas en el momento de tu nacimiento.
Sol en ${sun?.sign || 'un signo desconocido'} moldea la vitalidad y la autoexpresión.
Luna en ${moon?.sign || 'un signo desconocido'} revela la naturaleza emocional y el mundo interior.
Ascendente en ${asc?.sign || 'un signo desconocido'} refleja cómo te presentas al mundo.
En conjunto, forman un retrato coherente de tu personalidad y camino de vida.`;
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
    locale: 'ru' | 'en' | 'es',
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

  private getPlanetName(
    key: string,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    return getPlanetNameLocalized(key as PlanetKey, locale) || key;
  }

  private getAspectName(aspect: string, locale: 'ru' | 'en' | 'es'): string {
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
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    return getATKeywords(planet as PlanetKey, sign as Sign, locale);
  }

  private getPlanetStrengths(
    planet: string,
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    return getATStrengths(planet as PlanetKey, sign as Sign, locale);
  }

  private getPlanetChallenges(
    planet: string,
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    return getATChallenges(planet as PlanetKey, sign as Sign, locale);
  }

  private getAscendantKeywords(
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.keywords;
  }

  private getAscendantStrengths(
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.strengths;
  }

  private getAscendantChallenges(
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const meta = getAscendantMeta(sign as Sign, locale);
    return meta.challenges;
  }

  private interpretAscendant(sign: string, locale: 'ru' | 'en' | 'es'): string {
    return (
      getAscendantText(sign as Sign, locale) ||
      (locale === 'en'
        ? `Ascendant in ${sign} shapes your outer image.`
        : locale === 'es'
          ? `El ascendente en ${sign} moldea tu imagen exterior.`
          : `Асцендент в ${sign} формирует ваш внешний образ.`)
    );
  }

  private interpretHouse(
    houseNum: number,
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string {
    return (
      getHouseSignInterpretation(houseNum, sign as Sign, locale) ||
      (locale === 'en'
        ? `${houseNum} house in ${sign} influences an important life area.`
        : locale === 'es'
          ? `${houseNum} casa en ${sign} influye en un área importante de la vida.`
          : `${houseNum}-й дом в ${sign} влияет на важную жизненную сферу.`)
    );
  }

  private getHouseLifeArea(
    houseNum: number,
    locale: 'ru' | 'en' | 'es',
  ): string {
    return (
      getATLifeArea(houseNum, locale) ||
      (locale === 'en'
        ? 'Life area'
        : locale === 'es'
          ? 'Área de vida'
          : 'Жизненная сфера')
    );
  }

  private getAspectSignificance(
    aspect: string,
    strength: number,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string {
    if (strength > 0.8)
      return locale === 'en'
        ? 'Very strong influence'
        : locale === 'es'
          ? 'Influencia muy fuerte'
          : 'Очень сильное влияние';
    if (strength > 0.6)
      return locale === 'en'
        ? 'Strong influence'
        : locale === 'es'
          ? 'Influencia fuerte'
          : 'Сильное влияние';
    if (strength > 0.4)
      return locale === 'en'
        ? 'Moderate influence'
        : locale === 'es'
          ? 'Influencia moderada'
          : 'Умеренное влияние';
    return locale === 'en'
      ? 'Weak influence'
      : locale === 'es'
        ? 'Influencia débil'
        : 'Слабое влияние';
  }

  private getPlanetsInHouse(
    houseNum: number,
    planets: Record<string, Planet>,
    houses: Record<number, House>,
    locale: 'ru' | 'en' | 'es' = 'ru',
  ): string[] {
    const result: string[] = [];
    Object.entries(planets).forEach(([key, planet]) => {
      const planetHouse = this.getPlanetHouse(planet.longitude, houses);
      if (planetHouse === houseNum) {
        result.push(this.getPlanetName(key, locale));
      }
    });
    return result;
  }

  private getHouseKeywords(
    houseNum: number,
    _sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const basicKeywords: Record<
      'ru' | 'en' | 'es',
      Record<number, string[]>
    > = {
      ru: {
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
      },
      en: {
        1: ['self-expression', 'initiative'],
        2: ['values', 'resources'],
        3: ['communication', 'learning'],
        4: ['family', 'home'],
        5: ['creativity', 'joy'],
        6: ['service', 'health'],
        7: ['partnership', 'relationships'],
        8: ['transformation', 'depth'],
        9: ['knowledge', 'expansion'],
        10: ['career', 'status'],
        11: ['community', 'ideals'],
        12: ['spirituality', 'completion'],
      },
      es: {
        1: ['autoexpresión', 'iniciativa'],
        2: ['valores', 'recursos'],
        3: ['comunicación', 'aprendizaje'],
        4: ['familia', 'hogar'],
        5: ['creatividad', 'alegría'],
        6: ['servicio', 'salud'],
        7: ['pareja', 'relaciones'],
        8: ['transformación', 'profundidad'],
        9: ['conocimiento', 'expansión'],
        10: ['carrera', 'estatus'],
        11: ['comunidad', 'ideales'],
        12: ['espiritualidad', 'cierre'],
      },
    };
    return basicKeywords[locale][houseNum] || [];
  }

  private getHouseStrengths(
    houseNum: number,
    _sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const basicStrengths: Record<
      'ru' | 'en' | 'es',
      Record<number, string[]>
    > = {
      ru: {
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
      },
      en: {
        1: ['Leadership', 'Initiative'],
        2: ['Reliability', 'Practicality'],
        3: ['Sociability', 'Learnability'],
        4: ['Care', 'Stability'],
        5: ['Creativity', 'Joy'],
        6: ['Responsibility', 'Service'],
        7: ['Diplomacy', 'Harmony'],
        8: ['Insight', 'Strength'],
        9: ['Wisdom', 'Optimism'],
        10: ['Ambition', 'Discipline'],
        11: ['Idealism', 'Friendship'],
        12: ['Intuition', 'Compassion'],
      },
      es: {
        1: ['Liderazgo', 'Iniciativa'],
        2: ['Fiabilidad', 'Practicidad'],
        3: ['Sociabilidad', 'Aprendizaje'],
        4: ['Cuidado', 'Estabilidad'],
        5: ['Creatividad', 'Alegría'],
        6: ['Responsabilidad', 'Servicio'],
        7: ['Diplomacia', 'Armonía'],
        8: ['Perspicacia', 'Fuerza'],
        9: ['Sabiduría', 'Optimismo'],
        10: ['Ambición', 'Disciplina'],
        11: ['Idealismo', 'Amistad'],
        12: ['Intuición', 'Compasión'],
      },
    };
    return basicStrengths[locale][houseNum] || [];
  }

  private getHouseChallenges(
    houseNum: number,
    _sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const basicChallenges: Record<
      'ru' | 'en' | 'es',
      Record<number, string[]>
    > = {
      ru: {
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
      },
      en: {
        1: ['Impulsiveness', 'Egocentrism'],
        2: ['Greed', 'Materialism'],
        3: ['Superficiality', 'Inconsistency'],
        4: ['Dependency', 'Conservatism'],
        5: ['Selfishness', 'Irresponsibility'],
        6: ['Criticality', 'Overwork'],
        7: ['Dependency', 'Compromises'],
        8: ['Control', 'Obsession'],
        9: ['Overconfidence', 'Scattering'],
        10: ['Authoritarianism', 'Coldness'],
        11: ['Detachment', 'Idealization'],
        12: ['Illusions', 'Isolation'],
      },
      es: {
        1: ['Impulsividad', 'Egocentrismo'],
        2: ['Avaricia', 'Materialismo'],
        3: ['Superficialidad', 'Inconstancia'],
        4: ['Dependencia', 'Conservadurismo'],
        5: ['Egoísmo', 'Irresponsabilidad'],
        6: ['Crítica', 'Sobretrabajo'],
        7: ['Dependencia', 'Compromisos'],
        8: ['Control', 'Obsesión'],
        9: ['Exceso de confianza', 'Dispersión'],
        10: ['Autoritarismo', 'Frialdad'],
        11: ['Distanciamiento', 'Idealización'],
        12: ['Ilusiones', 'Aislamiento'],
      },
    };
    return basicChallenges[locale][houseNum] || [];
  }

  private getHouseRulingPlanet(
    houseNum: number,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const rulingPlanets: Record<number, string> = {
      1: locale === 'en' ? 'Mars' : locale === 'es' ? 'Marte' : 'Марс',
      2: locale === 'en' ? 'Venus' : locale === 'es' ? 'Venus' : 'Венера',
      3:
        locale === 'en' ? 'Mercury' : locale === 'es' ? 'Mercurio' : 'Меркурий',
      4: locale === 'en' ? 'Moon' : locale === 'es' ? 'Luna' : 'Луна',
      5: locale === 'en' ? 'Sun' : locale === 'es' ? 'Sol' : 'Солнце',
      6:
        locale === 'en' ? 'Mercury' : locale === 'es' ? 'Mercurio' : 'Меркурий',
      7: locale === 'en' ? 'Venus' : locale === 'es' ? 'Venus' : 'Венера',
      8: locale === 'en' ? 'Pluto' : locale === 'es' ? 'Plutón' : 'Плутон',
      9: locale === 'en' ? 'Jupiter' : locale === 'es' ? 'Júpiter' : 'Юпитер',
      10: locale === 'en' ? 'Saturn' : locale === 'es' ? 'Saturno' : 'Сатурн',
      11: locale === 'en' ? 'Uranus' : locale === 'es' ? 'Urano' : 'Уран',
      12: locale === 'en' ? 'Neptune' : locale === 'es' ? 'Neptuno' : 'Нептун',
    };
    return rulingPlanets[houseNum] || '';
  }

  private analyzeDominantElements(
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en' | 'es',
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
            : locale === 'es'
              ? { fire: 'Fuego', earth: 'Tierra', air: 'Aire', water: 'Agua' }
              : { fire: 'Огонь', earth: 'Земля', air: 'Воздух', water: 'Вода' };
        return names[element as keyof typeof names];
      });

    return dominant;
  }

  private analyzeDominantQualities(
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en' | 'es',
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
            : locale === 'es'
              ? { cardinal: 'Cardinal', fixed: 'Fijo', mutable: 'Mutable' }
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
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const themes: string[] = [];
    const aspectText = (type: string) => type.toLowerCase();

    const isChallenging = (type: string) => {
      const t = aspectText(type);
      return (
        t.includes('квадрат') ||
        t.includes('оппозиц') ||
        t.includes('square') ||
        t.includes('opposition') ||
        t.includes('cuadr') ||
        t.includes('oposic')
      );
    };

    const isHarmonious = (type: string) => {
      const t = aspectText(type);
      return (
        t.includes('тригон') ||
        t.includes('секстиль') ||
        t.includes('trine') ||
        t.includes('sextile') ||
        t.includes('tríg') ||
        t.includes('sextil')
      );
    };

    // Analyze aspects for themes
    aspects.forEach((aspect) => {
      if (aspect.strength > 0.6) {
        if (isChallenging(aspect.type)) {
          themes.push(
            locale === 'en'
              ? 'Personal Growth'
              : locale === 'es'
                ? 'Crecimiento personal'
                : 'Личный рост',
          );
        }
        if (isHarmonious(aspect.type)) {
          themes.push(
            locale === 'en'
              ? 'Harmony'
              : locale === 'es'
                ? 'Armonía'
                : 'Гармония',
          );
        }
      }
    });

    // Analyze houses for themes
    houses.forEach((house) => {
      if (house.planets.length > 1) {
        themes.push(
          locale === 'en'
            ? 'Complex Dynamics'
            : locale === 'es'
              ? 'Dinámica compleja'
              : 'Сложная динамика',
        );
      }
    });

    return [...new Set(themes)].slice(0, 6);
  }

  private analyzeKarmaLessons(
    aspects: AspectInterpretation[],
    planets: PlanetInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const lessons: string[] = [];
    const aspectText = (type: string) => type.toLowerCase();
    const isChallenging = (type: string) => {
      const t = aspectText(type);
      return (
        t.includes('квадрат') ||
        t.includes('оппозиц') ||
        t.includes('square') ||
        t.includes('opposition') ||
        t.includes('cuadr') ||
        t.includes('oposic')
      );
    };

    // Challenging aspects indicate lessons
    const challengingAspects = aspects.filter(
      (a) => a.strength > 0.5 && isChallenging(a.type),
    );
    if (challengingAspects.length > 3) {
      lessons.push(
        locale === 'en'
          ? 'Mastering Balance'
          : locale === 'es'
            ? 'Dominar el equilibrio'
            : 'Освоение баланса',
      );
    }

    // Retrograde planets indicate inner work
    const retroMarker =
      locale === 'en'
        ? 'Retrograde'
        : locale === 'es'
          ? 'Retrógrado'
          : 'Ретроградность';
    const retrogradeCount = planets.filter((p) =>
      p.interpretation.includes(retroMarker),
    ).length;
    if (retrogradeCount > 2) {
      lessons.push(
        locale === 'en'
          ? 'Inner Reflection'
          : locale === 'es'
            ? 'Reflexión interna'
            : 'Внутренняя рефлексия',
      );
    }

    return lessons.length > 0
      ? lessons
      : [
          locale === 'en'
            ? 'Self-Acceptance'
            : locale === 'es'
              ? 'Autoaceptación'
              : 'Самопринятие',
          locale === 'en'
            ? 'Patience'
            : locale === 'es'
              ? 'Paciencia'
              : 'Терпение',
          locale === 'en'
            ? 'Growth Through Challenge'
            : locale === 'es'
              ? 'Crecimiento a través de los desafíos'
              : 'Рост через вызовы',
        ];
  }

  private generateDetailedRecommendations(
    planets: PlanetInterpretation[],
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const recommendations: string[] = [];

    // Planet-based recommendations
    const strongPlanets = planets.filter((p) => p.strengths.length > 0);
    if (strongPlanets.length > 0) {
      recommendations.push(
        locale === 'en'
          ? 'Leverage your natural strengths for personal and professional growth'
          : locale === 'es'
            ? 'Aprovecha tus fortalezas naturales para el crecimiento personal y profesional'
            : 'Используйте свои природные сильные стороны для личного и профессионального роста',
      );
    }

    // Aspect-based recommendations
    const isHarmonious = (type: string) => {
      const t = type.toLowerCase();
      return (
        t.includes('тригон') ||
        t.includes('секстиль') ||
        t.includes('trine') ||
        t.includes('sextile') ||
        t.includes('tríg') ||
        t.includes('sextil')
      );
    };
    const isChallenging = (type: string) => {
      const t = type.toLowerCase();
      return (
        t.includes('квадрат') ||
        t.includes('оппозиц') ||
        t.includes('square') ||
        t.includes('opposition') ||
        t.includes('cuadr') ||
        t.includes('oposic')
      );
    };

    const harmoniousAspects = aspects.filter((a) => isHarmonious(a.type));
    const challengingAspects = aspects.filter((a) => isChallenging(a.type));

    if (harmoniousAspects.length > challengingAspects.length) {
      recommendations.push(
        locale === 'en'
          ? 'Build upon your natural talents and harmonious energies'
          : locale === 'es'
            ? 'Construye sobre tus talentos naturales y energías armoniosas'
            : 'Строите на своих природных талантах и гармоничных энергиях',
      );
    } else {
      recommendations.push(
        locale === 'en'
          ? 'Work on integrating challenging aspects for greater wholeness'
          : locale === 'es'
            ? 'Trabaja en integrar los aspectos desafiantes para mayor plenitud'
            : 'Работайте над интеграцией сложных аспектов для большей целостности',
      );
    }

    // House-based recommendations
    const activeHouses = houses.filter((h) => h.planets.length > 0);
    if (activeHouses.length > 6) {
      recommendations.push(
        locale === 'en'
          ? 'Focus on balancing multiple life areas'
          : locale === 'es'
            ? 'Enfócate en equilibrar múltiples áreas de la vida'
            : 'Фокусируйтесь на балансе различных жизненных сфер',
      );
    }

    return recommendations.slice(0, 8);
  }

  private analyzeLifePurpose(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    // Analyze sun, moon, and 10th house for life purpose
    const sunName = this.getPlanetName('sun', locale);
    const sun = planets.find((p) => p.planet === sunName);
    const tenthHouse = houses.find((h: any) => h.house === 10);

    let purpose =
      locale === 'en'
        ? 'Your life purpose involves '
        : locale === 'es'
          ? 'Tu propósito de vida implica '
          : 'Ваша жизненная цель связана с ';

    if (sun) {
      purpose +=
        locale === 'en'
          ? `expressing your ${sun.sign} essence through leadership and creativity`
          : locale === 'es'
            ? `expresar tu esencia de ${sun.sign} mediante liderazgo y creatividad`
            : `выражением своей ${sun.sign} сущности через лидерство и творчество`;
    }

    if (tenthHouse && tenthHouse.planets.length > 0) {
      purpose +=
        locale === 'en'
          ? ', contributing to society through your professional calling'
          : locale === 'es'
            ? ', aportando a la sociedad a través de tu vocación profesional'
            : ', внесением вклада в общество через профессиональное призвание';
    }

    return purpose;
  }

  private analyzeRelationships(
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    const seventhHouse = houses.find((h: any) => h.house === 7);
    const venusName = this.getPlanetName('venus', locale);
    const venusAspects = aspects.filter(
      (a) => a.planetA === venusName || a.planetB === venusName,
    );

    let relationships =
      locale === 'en'
        ? 'In relationships, you seek '
        : locale === 'es'
          ? 'En las relaciones, buscas '
          : 'В отношениях вы ищете ';

    if (seventhHouse && seventhHouse.planets.length > 0) {
      relationships +=
        locale === 'en'
          ? 'deep partnership and mutual growth'
          : locale === 'es'
            ? 'una pareja profunda y crecimiento mutuo'
            : 'глубокое партнерство и взаимный рост';
    } else {
      relationships +=
        locale === 'en'
          ? 'harmony and understanding'
          : locale === 'es'
            ? 'armonía y comprensión'
            : 'гармонию и понимание';
    }

    if (venusAspects.length > 0) {
      relationships +=
        locale === 'en'
          ? ', with Venus influencing your approach to love and connection'
          : locale === 'es'
            ? ', con Venus influyendo en tu enfoque del amor y la conexión'
            : ', где Венера влияет на ваш подход к любви и связи';
    }

    return relationships;
  }

  private analyzeCareerPath(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    const tenthHouse = houses.find((h: any) => h.house === 10);
    const sixthHouse = houses.find((h: any) => h.house === 6);
    const marsName = this.getPlanetName('mars', locale);
    const saturnName = this.getPlanetName('saturn', locale);
    const jupiterName = this.getPlanetName('jupiter', locale);
    const mars = planets.find((p) => p.planet === marsName);
    const saturn = planets.find((p) => p.planet === saturnName);
    const jupiter = planets.find((p) => p.planet === jupiterName);

    let career =
      locale === 'en'
        ? 'Your career path involves '
        : locale === 'es'
          ? 'Tu camino profesional implica '
          : 'Ваш карьерный путь включает ';

    if (tenthHouse && tenthHouse.planets.length > 0) {
      career +=
        locale === 'en'
          ? 'leadership and public recognition'
          : locale === 'es'
            ? 'liderazgo y reconocimiento público'
            : 'лидерство и общественное признание';
    } else if (sixthHouse && sixthHouse.planets.length > 0) {
      career +=
        locale === 'en'
          ? 'service and practical contribution'
          : locale === 'es'
            ? 'servicio y contribución práctica'
            : 'служение и практический вклад';
    } else {
      career +=
        locale === 'en'
          ? 'finding meaning through work that aligns with your values'
          : locale === 'es'
            ? 'encontrar sentido a través de un trabajo alineado con tus valores'
            : 'нахождение смысла через работу, которая соответствует вашим ценностям';
    }

    if (mars && mars.strengths.length > 0) {
      career +=
        locale === 'en'
          ? ', with Mars providing the drive to achieve your goals'
          : locale === 'es'
            ? ', con Marte aportando el impulso para alcanzar tus metas'
            : ', где Марс дает импульс для достижения целей';
    }

    if (saturn && saturn.strengths.length > 0) {
      career +=
        locale === 'en'
          ? '. Saturn brings discipline and long-term planning'
          : locale === 'es'
            ? '. Saturno aporta disciplina y planificación a largo plazo'
            : '. Сатурн привносит дисциплину и долгосрочное планирование';
    }

    if (jupiter && jupiter.strengths.length > 0) {
      career +=
        locale === 'en'
          ? '. Jupiter expands opportunities and brings optimism'
          : locale === 'es'
            ? '. Júpiter amplía oportunidades y aporta optimismo'
            : '. Юпитер расширяет возможности и привносит оптимизм';
    }

    return career;
  }

  private analyzeSpiritualPath(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    const twelfthHouse = houses.find((h: any) => h.house === 12);
    const ninthHouse = houses.find((h: any) => h.house === 9);
    const neptuneName = this.getPlanetName('neptune', locale);
    const plutoName = this.getPlanetName('pluto', locale);
    const neptune = planets.find((p) => p.planet === neptuneName);
    const pluto = planets.find((p) => p.planet === plutoName);

    let spiritual =
      locale === 'en'
        ? 'Your spiritual path involves '
        : locale === 'es'
          ? 'Tu camino espiritual implica '
          : 'Ваш духовный путь включает ';

    if (neptune && neptune.strengths.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'deep intuition and connection to the divine'
          : locale === 'es'
            ? 'profunda intuición y conexión con lo divino'
            : 'глубокую интуицию и связь с божественным';
    } else if (pluto && pluto.strengths.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'transformation and rebirth through spiritual practices'
          : locale === 'es'
            ? 'transformación y renacimiento a través de prácticas espirituales'
            : 'трансформацию и возрождение через духовные практики';
    } else if (twelfthHouse && twelfthHouse.planets.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'exploring the subconscious and universal consciousness'
          : locale === 'es'
            ? 'explorar el subconsciente y la conciencia universal'
            : 'исследование подсознания и универсального сознания';
    } else if (ninthHouse && ninthHouse.planets.length > 0) {
      spiritual +=
        locale === 'en'
          ? 'seeking wisdom through philosophy and higher learning'
          : locale === 'es'
            ? 'buscar sabiduría mediante la filosofía y el aprendizaje superior'
            : 'поиск мудрости через философию и высшее обучение';
    } else {
      spiritual +=
        locale === 'en'
          ? 'personal growth through meditation and self-reflection'
          : locale === 'es'
            ? 'crecimiento personal mediante meditación y autorreflexión'
            : 'личностный рост через медитацию и саморефлексию';
    }

    return spiritual;
  }

  private analyzeHealthFocus(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    const sixthHouse = houses.find((h: any) => h.house === 6);
    const firstHouse = houses.find((h: any) => h.house === 1);
    const moonName = this.getPlanetName('moon', locale);
    const marsName = this.getPlanetName('mars', locale);
    const moon = planets.find((p) => p.planet === moonName);
    const mars = planets.find((p) => p.planet === marsName);

    let health =
      locale === 'en'
        ? 'Your health focus involves '
        : locale === 'es'
          ? 'Tu enfoque de salud implica '
          : 'Ваш фокус на здоровье включает ';

    if (sixthHouse && sixthHouse.planets.length > 0) {
      health +=
        locale === 'en'
          ? 'daily routines and preventive care'
          : locale === 'es'
            ? 'rutinas diarias y cuidado preventivo'
            : 'ежедневные рутины и профилактический уход';
    } else if (moon && moon.strengths.length > 0) {
      health +=
        locale === 'en'
          ? 'emotional well-being and stress management'
          : locale === 'es'
            ? 'bienestar emocional y manejo del estrés'
            : 'эмоциональное благополучие и управление стрессом';
    } else if (mars && mars.strengths.length > 0) {
      health +=
        locale === 'en'
          ? 'physical activity and maintaining vitality'
          : locale === 'es'
            ? 'actividad física y mantenimiento de la vitalidad'
            : 'физическую активность и поддержание жизнеспособности';
    } else if (firstHouse && firstHouse.planets.length > 0) {
      health +=
        locale === 'en'
          ? 'overall vitality and immune system support'
          : locale === 'es'
            ? 'vitalidad general y apoyo del sistema inmunológico'
            : 'общую жизнеспособность и поддержку иммунной системы';
    } else {
      health +=
        locale === 'en'
          ? 'balanced lifestyle with attention to body and mind'
          : locale === 'es'
            ? 'un estilo de vida equilibrado con atención al cuerpo y la mente'
            : 'сбалансированный образ жизни с вниманием к телу и разуму';
    }

    return health;
  }

  private analyzeFinancialApproach(
    planets: PlanetInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string {
    const secondHouse = houses.find((h: any) => h.house === 2);
    const eighthHouse = houses.find((h: any) => h.house === 8);
    const venusName = this.getPlanetName('venus', locale);
    const jupiterName = this.getPlanetName('jupiter', locale);
    const venus = planets.find((p) => p.planet === venusName);
    const jupiter = planets.find((p) => p.planet === jupiterName);

    let finance =
      locale === 'en'
        ? 'Your financial approach involves '
        : locale === 'es'
          ? 'Tu enfoque financiero implica '
          : 'Ваш финансовый подход включает ';

    if (venus && venus.strengths.length > 0) {
      finance +=
        locale === 'en'
          ? 'appreciating value and investing in quality'
          : locale === 'es'
            ? 'apreciar el valor e invertir en calidad'
            : 'оценку ценности и инвестиции в качество';
    } else if (jupiter && jupiter.strengths.length > 0) {
      finance +=
        locale === 'en'
          ? 'optimistic growth and expanding resources'
          : locale === 'es'
            ? 'crecimiento optimista y expansión de recursos'
            : 'оптимистичный рост и расширение ресурсов';
    } else if (secondHouse && secondHouse.planets.length > 0) {
      finance +=
        locale === 'en'
          ? 'building security through steady accumulation'
          : locale === 'es'
            ? 'construir seguridad mediante una acumulación constante'
            : 'построение безопасности через стабильное накопление';
    } else if (eighthHouse && eighthHouse.planets.length > 0) {
      finance +=
        locale === 'en'
          ? 'joint resources and strategic investments'
          : locale === 'es'
            ? 'recursos compartidos e inversiones estratégicas'
            : 'совместные ресурсы и стратегические инвестиции';
    } else {
      finance +=
        locale === 'en'
          ? 'practical money management and long-term planning'
          : locale === 'es'
            ? 'gestión práctica del dinero y planificación a largo plazo'
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
    locale: 'ru' | 'en' | 'es',
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
        planets: pattern.planets.map((p) => this.getPlanetName(p, locale)),
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
        planets: pattern.planets.map((p) => this.getPlanetName(p, locale)),
        description: pattern.description,
        interpretation: getPatternInterpretation(pattern, locale),
        strength: pattern.strength,
      });
    });

    // Add Yods
    detected.yods.forEach((pattern) => {
      patterns.push({
        type: pattern.type,
        planets: pattern.planets.map((p) => this.getPlanetName(p, locale)),
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
  private getSignElement(
    sign: string,
  ): 'fire' | 'earth' | 'air' | 'water' | undefined {
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
  private getSignQuality(
    sign: string,
  ): 'cardinal' | 'fixed' | 'mutable' | undefined {
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
