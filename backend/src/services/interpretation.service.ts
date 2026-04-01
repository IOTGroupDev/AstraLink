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
import {
  getEssentialDignity,
  PLANET_RULERSHIPS,
} from '../modules/shared/types';
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
import { isDayBirth } from '../shared/astro-calculations';

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
        rulingPlanet: this.getHouseRulingPlanet(house.sign || 'Aries', locale),
      };
    });

    // Асцендент (1-й дом)
    const ascendantSource = chartData.ascendant;
    const ascSign =
      ascendantSource?.sign ||
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
      degree:
        ascendantSource?.degree ??
        ((houses[1]?.cusp as number | undefined) ?? 0) % 30,
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
    const asc = chartData.ascendant || chartData.houses?.[1];
    const sunSign = (sun?.sign || 'Aries') as Sign;
    const moonSign = (moon?.sign || 'Cancer') as Sign;
    const ascSign = (asc?.sign || 'Libra') as Sign;
    const sunText = getPlanetInSignText('sun', sunSign, locale);
    const moonText = getPlanetInSignText('moon', moonSign, locale);
    const ascText = getAscendantText(ascSign, locale);

    const synthesizedPlanets: PlanetInterpretation[] = Object.entries(
      chartData.planets || {},
    ).flatMap(([key, planet]) => {
      if (!planet?.sign) return [];

      const sign = planet.sign;

      return [
        {
          planet: this.getPlanetName(key, locale),
          sign,
          house: 0,
          degree: Math.round(planet.longitude % 30),
          interpretation: '',
          keywords: this.getPlanetKeywords(key, sign, locale),
          strengths: this.getPlanetStrengths(key, sign, locale),
          challenges: this.getPlanetChallenges(key, sign, locale),
          element: this.getSignElement(sign),
          quality: this.getSignQuality(sign),
        },
      ];
    });

    const dominantElement =
      this.analyzeDominantElements(synthesizedPlanets, locale).join(', ') ||
      (locale === 'en'
        ? 'balanced elements'
        : locale === 'es'
          ? 'elementos equilibrados'
          : 'сбалансированных стихий');
    const dominantQuality =
      this.analyzeDominantQualities(synthesizedPlanets, locale).join(', ') ||
      (locale === 'en'
        ? 'balanced qualities'
        : locale === 'es'
          ? 'cualidades equilibradas'
          : 'сбалансированных качеств');

    if (locale === 'en') {
      return `Your natal chart is built around a distinct Big Three: Sun in ${sunSign}, Moon in ${moonSign}, and Ascendant in ${ascSign}. This combination describes your core identity, your emotional nature, and the way you enter the world.

${sunText}
${moonText}
${ascText}

Together these positions create a layered personality structure: the Sun defines conscious direction and self-expression, the Moon shows emotional needs and instinctive reactions, and the Ascendant turns all of this into visible behavior, first impressions, and personal style. The chart background is colored by ${dominantElement} and ${dominantQuality}, so your temperament carries both core and supporting tones.

The strongest development path in this chart is to align what you want, what you feel, and how you act. When your Sun, Moon, and Ascendant work in one direction, your choices become clearer, relationships become more coherent, and your life path gains momentum.`;
    }
    if (locale === 'es') {
      return `Tu carta natal se organiza alrededor de una Gran Tríada muy clara: Sol en ${sunSign}, Luna en ${moonSign} y Ascendente en ${ascSign}. Esta combinación describe tu identidad central, tu mundo emocional y la manera en que entras en relación con el entorno.

${sunText}
${moonText}
${ascText}

Juntas, estas posiciones forman una estructura compleja: el Sol marca la dirección consciente y la autoexpresión, la Luna revela necesidades afectivas y reacciones internas, y el Ascendente convierte todo eso en presencia visible, comportamiento y estilo personal. El trasfondo de la carta está teñido por ${dominantElement} y ${dominantQuality}, así que tu temperamento tiene varias capas.

La tarea clave de esta carta es unir deseo, emoción y acción. Cuando Sol, Luna y Ascendente cooperan, tus decisiones se vuelven más claras, tus relaciones más coherentes y tu camino vital más sólido.`;
    }

    return `Ваша натальная карта строится вокруг ярко выраженной большой тройки: Солнце в ${sunSign}, Луна в ${moonSign} и Асцендент в ${ascSign}. Именно эта связка показывает ваш внутренний стержень, эмоциональную природу и тот образ, через который вы входите в контакт с миром.

${sunText}
${moonText}
${ascText}

Вместе эти положения создают многослойную структуру личности: Солнце описывает волю, осознанные цели и способ самореализации, Луна отвечает за чувства, привязанности и внутреннее ощущение безопасности, а Асцендент переводит всё это в манеру поведения, первое впечатление и жизненный стиль. Фон карты окрашен влиянием ${dominantElement} и ${dominantQuality}, поэтому ваш характер нельзя свести к одному-единственному архетипу.

Ключевая задача этой карты — согласовать желания, чувства и действия. Когда энергия Солнца, Луны и Асцендента работает в одном направлении, вы точнее понимаете себя, увереннее строите отношения и быстрее находите собственную траекторию развития.`;
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
    const chartRuler = this.analyzeChartRuler(chartData, locale);
    const sect = this.analyzeSect(chartData, locale);
    const lunarNodes = this.analyzeLunarNodes(chartData, locale);
    const dispositors = this.analyzeDispositors(chartData, locale);
    const keyHouseRulers = this.analyzeKeyHouseRulers(chartData, locale);
    const thematicFocus = this.analyzeThematicFocus(chartData, locale);
    const strongestAspects = this.getStrongestAspectHighlights(aspects, locale);
    const uniqueFeatures = this.analyzeUniqueChartFeatures(
      chartData,
      planets,
      aspects,
      houses,
      locale,
    );

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
      uniqueFeatures,
      dominantElements,
      dominantQualities,
      chartRuler: chartRuler ?? undefined,
      sect: sect ?? undefined,
      lunarNodes: lunarNodes ?? undefined,
      dispositors: dispositors ?? undefined,
      keyHouseRulers,
      thematicFocus,
      strongestAspects,
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
    sign: string,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const rulerKey = this.getSignRuler(sign);
    return this.getPlanetName(rulerKey, locale);
  }

  private getSignRuler(sign: string): PlanetKey {
    const rulingPlanets: Record<string, PlanetKey> = {
      Aries: 'mars',
      Taurus: 'venus',
      Gemini: 'mercury',
      Cancer: 'moon',
      Leo: 'sun',
      Virgo: 'mercury',
      Libra: 'venus',
      Scorpio: 'pluto',
      Sagittarius: 'jupiter',
      Capricorn: 'saturn',
      Aquarius: 'uranus',
      Pisces: 'neptune',
    };
    return rulingPlanets[sign] || 'sun';
  }

  private analyzeChartRuler(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): {
    ruler: string;
    sign: string;
    house: number;
    interpretation: string;
  } | null {
    const ascSign = chartData.ascendant?.sign || chartData.houses?.[1]?.sign;
    const houses = chartData.houses || {};
    const planets = chartData.planets || {};

    if (!ascSign) return null;

    const rulerKey = this.getSignRuler(ascSign);
    const rulerPlanet = planets[rulerKey];
    if (!rulerPlanet) return null;

    const rulerHouse =
      typeof rulerPlanet.house === 'number'
        ? rulerPlanet.house
        : this.getPlanetHouse(rulerPlanet.longitude, houses);
    const rulerSign = rulerPlanet.sign || ascSign;
    const localizedRuler = this.getPlanetName(rulerKey, locale);

    const interpretation =
      locale === 'en'
        ? `Chart ruler: ${localizedRuler} in ${rulerSign}, house ${rulerHouse}. This shows where your initiative, identity, and personal style naturally seek expression.`
        : locale === 'es'
          ? `Regente de la carta: ${localizedRuler} en ${rulerSign}, casa ${rulerHouse}. Esto muestra dónde tu iniciativa, identidad y estilo personal buscan expresarse con naturalidad.`
          : `Управитель карты: ${localizedRuler} в знаке ${rulerSign}, в ${rulerHouse}-м доме. Это показывает, через какую сферу жизни естественно раскрываются ваша инициатива, личный стиль и жизненный вектор.`;

    return {
      ruler: localizedRuler,
      sign: rulerSign,
      house: rulerHouse,
      interpretation,
    };
  }

  private analyzeKeyHouseRulers(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): Array<{
    house: number;
    sign: string;
    ruler: string;
    rulerSign: string;
    rulerHouse: number;
    interpretation: string;
  }> {
    const houses = chartData.houses || {};
    const planets = chartData.planets || {};
    const keyHouses = [1, 4, 7, 10];

    return keyHouses
      .map((houseNum) => {
        const houseSign = houses[houseNum]?.sign;
        if (!houseSign) return null;

        const rulerKey = this.getSignRuler(houseSign);
        const rulerPlanet = planets[rulerKey];
        if (!rulerPlanet) return null;

        const rulerHouse =
          typeof rulerPlanet.house === 'number'
            ? rulerPlanet.house
            : this.getPlanetHouse(rulerPlanet.longitude, houses);
        const rulerSign = rulerPlanet.sign || houseSign;
        const ruler = this.getPlanetName(rulerKey, locale);
        const interpretation =
          locale === 'en'
            ? `House ${houseNum} begins in ${houseSign}; its ruler is ${ruler} in ${rulerSign}, house ${rulerHouse}. This links the themes of this house with the life area of house ${rulerHouse}.`
            : locale === 'es'
              ? `La casa ${houseNum} comienza en ${houseSign}; su regente es ${ruler} en ${rulerSign}, casa ${rulerHouse}. Esto conecta los temas de esta casa con la esfera vital de la casa ${rulerHouse}.`
              : `${houseNum}-й дом начинается в знаке ${houseSign}; его управитель ${ruler} стоит в знаке ${rulerSign} и в ${rulerHouse}-м доме. Это связывает темы этого дома со сферой жизни ${rulerHouse}-го дома.`;

        return {
          house: houseNum,
          sign: houseSign,
          ruler,
          rulerSign,
          rulerHouse,
          interpretation,
        };
      })
      .filter(Boolean) as Array<{
      house: number;
      sign: string;
      ruler: string;
      rulerSign: string;
      rulerHouse: number;
      interpretation: string;
    }>;
  }

  private analyzeLunarNodes(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): {
    northNode?: {
      sign: string;
      house: number;
      interpretation: string;
    };
    southNode?: {
      sign: string;
      house: number;
      interpretation: string;
    };
    axisInterpretation: string;
  } | null {
    const planets = chartData.planets || {};
    const houses = chartData.houses || {};
    const northNode = planets.north_node || planets.northNode;
    const southNode = planets.south_node || planets.southNode;

    if (!northNode && !southNode) return null;

    const northHouse =
      northNode &&
      (typeof northNode.house === 'number'
        ? northNode.house
        : this.getPlanetHouse(northNode.longitude, houses));
    const southHouse =
      southNode &&
      (typeof southNode.house === 'number'
        ? southNode.house
        : this.getPlanetHouse(southNode.longitude, houses));

    const northInterpretation =
      northNode?.sign && typeof northHouse === 'number'
        ? locale === 'en'
          ? `North Node in ${northNode.sign}, house ${northHouse}, shows the direction of growth, discomfort, and long-term development.`
          : locale === 'es'
            ? `El Nodo Norte en ${northNode.sign}, casa ${northHouse}, muestra la dirección de crecimiento, incomodidad fértil y desarrollo a largo plazo.`
            : `Северный узел в ${northNode.sign}, в ${northHouse}-м доме, показывает направление роста, зоны продуктивного дискомфорта и долгосрочного развития.`
        : '';

    const southInterpretation =
      southNode?.sign && typeof southHouse === 'number'
        ? locale === 'en'
          ? `South Node in ${southNode.sign}, house ${southHouse}, reflects familiar patterns, inherited strengths, and habits that are easy to fall back on.`
          : locale === 'es'
            ? `El Nodo Sur en ${southNode.sign}, casa ${southHouse}, refleja patrones familiares, talentos heredados y hábitos a los que es fácil volver.`
            : `Южный узел в ${southNode.sign}, в ${southHouse}-м доме, отражает привычные сценарии, врожденные навыки и формы поведения, в которые легко скатиться.`
        : '';

    const axisInterpretation =
      northNode?.sign && southNode?.sign
        ? locale === 'en'
          ? `The nodal axis moves from ${southNode.sign}${typeof southHouse === 'number' ? `, house ${southHouse}` : ''} toward ${northNode.sign}${typeof northHouse === 'number' ? `, house ${northHouse}` : ''}: growth comes through leaving automatic competence behind and choosing conscious development.`
          : locale === 'es'
            ? `El eje nodal va de ${southNode.sign}${typeof southHouse === 'number' ? `, casa ${southHouse}` : ''} hacia ${northNode.sign}${typeof northHouse === 'number' ? `, casa ${northHouse}` : ''}: el crecimiento llega al dejar atrás la competencia automática y elegir un desarrollo más consciente.`
            : `Ось узлов идет от ${southNode.sign}${typeof southHouse === 'number' ? `, ${southHouse}-й дом` : ''} к ${northNode.sign}${typeof northHouse === 'number' ? `, ${northHouse}-й дом` : ''}: рост приходит через выход из автоматических навыков в сторону более осознанного развития.`
        : locale === 'en'
          ? 'The nodal axis indicates a shift from familiar patterns toward conscious growth.'
          : locale === 'es'
            ? 'El eje nodal indica un paso de patrones familiares hacia un crecimiento más consciente.'
            : 'Ось узлов указывает на переход от привычных сценариев к более осознанному росту.';

    return {
      northNode:
        northNode?.sign && typeof northHouse === 'number'
          ? {
              sign: northNode.sign,
              house: northHouse,
              interpretation: northInterpretation,
            }
          : undefined,
      southNode:
        southNode?.sign && typeof southHouse === 'number'
          ? {
              sign: southNode.sign,
              house: southHouse,
              interpretation: southInterpretation,
            }
          : undefined,
      axisInterpretation,
    };
  }

  private analyzeDispositors(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): {
    finalDispositor?: {
      planet: string;
      sign: string;
      house: number;
      interpretation: string;
    };
    dominantDispositor?: {
      planet: string;
      sign: string;
      house: number;
      chainCount: number;
      interpretation: string;
    };
    mutualReceptions?: Array<{
      planets: [string, string];
      interpretation: string;
    }>;
    chainSummary: string;
  } | null {
    const planets = chartData.planets || {};
    const houses = chartData.houses || {};
    const keys = Object.keys(planets).filter((key) =>
      [
        'sun',
        'moon',
        'mercury',
        'venus',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
        'pluto',
      ].includes(key),
    );

    if (keys.length === 0) return null;

    const chainEnds = new Map<string, number>();
    for (const key of keys) {
      const end = this.resolveDispositorEnd(key, planets, 0);
      if (!end) continue;
      chainEnds.set(end, (chainEnds.get(end) || 0) + 1);
    }

    const dominantEnd = Array.from(chainEnds.entries()).sort(
      (a, b) => b[1] - a[1],
    )[0];
    const mutualReceptions = this.findMutualReceptions(planets, locale);

    if (!dominantEnd) {
      return {
        chainSummary:
          locale === 'en'
            ? 'No clear dispositorship center is visible.'
            : locale === 'es'
              ? 'No se ve un centro dispositor claro.'
              : 'Явный центр диспозиторной цепочки не выявлен.',
      };
    }

    const [finalKey, count] = dominantEnd;
    const finalPlanet = planets[finalKey];
    if (!finalPlanet?.sign) {
      return {
        mutualReceptions,
        chainSummary:
          locale === 'en'
            ? 'A dispositor center is implied, but the final placement is incomplete.'
            : locale === 'es'
              ? 'Se intuye un centro dispositor, pero la posición final está incompleta.'
              : 'Центр диспозиторной цепочки намечен, но финальное положение определено не полностью.',
      };
    }

    const finalHouse =
      typeof finalPlanet.house === 'number'
        ? finalPlanet.house
        : this.getPlanetHouse(finalPlanet.longitude, houses);
    const localizedPlanet = this.getPlanetName(finalKey, locale);
    const finalDispositorKey = this.resolveFinalDispositorKey(planets);
    const interpretation =
      locale === 'en'
        ? `${localizedPlanet} acts as the main dispositor focus in ${finalPlanet.sign}, house ${finalHouse}. Many chart themes ultimately report to this planet, so it becomes a strategic center of motivation and expression.`
        : locale === 'es'
          ? `${localizedPlanet} funciona como foco dispositor principal en ${finalPlanet.sign}, casa ${finalHouse}. Muchos temas de la carta terminan reportando a este planeta, por lo que se convierte en un centro estratégico de motivación y expresión.`
          : `${localizedPlanet} выступает главным диспозиторным центром в ${finalPlanet.sign}, в ${finalHouse}-м доме. Многие темы карты в итоге сходятся к этой планете, поэтому она становится стратегическим центром мотивации и самовыражения.`;

    const chainSummary =
      locale === 'en'
        ? `${count} major planetary chains converge on ${localizedPlanet}, which suggests an internal center of gravity in the chart.`
        : locale === 'es'
          ? `${count} cadenas planetarias principales convergen en ${localizedPlanet}, lo que sugiere un centro interno de gravedad en la carta.`
          : `${count} основных планетарных цепочек сходятся к ${localizedPlanet}, что указывает на внутренний центр тяжести карты.`;

    const finalDispositor =
      finalDispositorKey && planets[finalDispositorKey]?.sign
        ? (() => {
            const planet = planets[finalDispositorKey];
            const house =
              typeof planet.house === 'number'
                ? planet.house
                : this.getPlanetHouse(planet.longitude, houses);
            const planetName = this.getPlanetName(finalDispositorKey, locale);
            const text =
              locale === 'en'
                ? `${planetName} is in its own rulership, so the dispositorship chain can terminate here and give the chart a clear internal command point.`
                : locale === 'es'
                  ? `${planetName} está en su propio domicilio, por lo que la cadena dispositora puede cerrarse aquí y dar a la carta un punto interno claro de mando.`
                  : `${planetName} находится в собственном знаке управления, поэтому диспозиторная цепочка может завершаться на нем и формировать ясный внутренний центр управления картой.`;
            return {
              planet: planetName,
              sign: planet.sign ?? finalPlanet.sign ?? '',
              house,
              interpretation: text,
            };
          })()
        : undefined;

    return {
      finalDispositor,
      dominantDispositor: {
        planet: localizedPlanet,
        sign: finalPlanet.sign,
        house: finalHouse,
        chainCount: count,
        interpretation,
      },
      mutualReceptions,
      chainSummary,
    };
  }

  private analyzeSect(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): { type: 'day' | 'night'; interpretation: string } | null {
    const sunLongitude = chartData.planets?.sun?.longitude;
    const ascLongitude =
      chartData.ascendant?.longitude ?? chartData.houses?.[1]?.cusp;
    if (typeof sunLongitude !== 'number' || typeof ascLongitude !== 'number') {
      return null;
    }

    const dayChart = isDayBirth(sunLongitude, ascLongitude);
    return {
      type: dayChart ? 'day' : 'night',
      interpretation: dayChart
        ? locale === 'en'
          ? 'This is a day chart: solar, outward, and visibility-driven factors tend to work more directly.'
          : locale === 'es'
            ? 'Esta es una carta diurna: los factores solares, externos y vinculados a la visibilidad tienden a funcionar de forma más directa.'
            : 'Это дневная карта: солнечные, внешние и социально заметные факторы обычно проявляются здесь прямее и увереннее.'
        : locale === 'en'
          ? 'This is a night chart: lunar, internal, relational, and subjective factors tend to carry more weight.'
          : locale === 'es'
            ? 'Esta es una carta nocturna: los factores lunares, internos, vinculares y subjetivos suelen tener más peso.'
            : 'Это ночная карта: лунные, внутренние, эмоциональные и субъективные факторы обычно имеют здесь больший вес.',
    };
  }

  private resolveFinalDispositorKey(
    planets: Record<string, any>,
  ): string | null {
    const classicalKeys = [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
    ];

    for (const key of classicalKeys) {
      const sign = planets[key]?.sign as Sign | undefined;
      if (!sign) continue;
      if (PLANET_RULERSHIPS[sign] === key) {
        return key;
      }
    }

    return null;
  }

  private findMutualReceptions(
    planets: Record<string, any>,
    locale: 'ru' | 'en' | 'es',
  ): Array<{
    planets: [string, string];
    interpretation: string;
  }> {
    const supportedKeys = [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
    ];
    const receptions: Array<{
      planets: [string, string];
      interpretation: string;
    }> = [];

    for (let i = 0; i < supportedKeys.length; i += 1) {
      for (let j = i + 1; j < supportedKeys.length; j += 1) {
        const keyA = supportedKeys[i];
        const keyB = supportedKeys[j];
        const signA = planets[keyA]?.sign as Sign | undefined;
        const signB = planets[keyB]?.sign as Sign | undefined;
        if (!signA || !signB) continue;

        const rulerOfA = PLANET_RULERSHIPS[signA];
        const rulerOfB = PLANET_RULERSHIPS[signB];
        if (rulerOfA !== keyB || rulerOfB !== keyA) continue;

        const nameA = this.getPlanetName(keyA, locale);
        const nameB = this.getPlanetName(keyB, locale);
        const interpretation =
          locale === 'en'
            ? `${nameA} and ${nameB} are in mutual reception. They reinforce one another and create a closed exchange between their topics.`
            : locale === 'es'
              ? `${nameA} y ${nameB} están en recepción mutua. Se refuerzan entre sí y crean un intercambio cerrado entre sus temas.`
              : `${nameA} и ${nameB} находятся во взаимной рецепции. Они усиливают друг друга и создают замкнутый обмен между своими темами.`;

        receptions.push({
          planets: [nameA, nameB],
          interpretation,
        });
      }
    }

    return receptions;
  }

  private resolveDispositorEnd(
    planetKey: string,
    planets: Record<string, any>,
    depth: number,
    visited: Set<string> = new Set(),
  ): string | null {
    if (depth > 12 || visited.has(planetKey)) return planetKey;
    const planet = planets[planetKey];
    if (!planet?.sign) return null;

    const rulerKey = this.getSignRuler(planet.sign);
    if (rulerKey === planetKey) return planetKey;

    visited.add(planetKey);
    if (!planets[rulerKey]) return planetKey;

    return this.resolveDispositorEnd(rulerKey, planets, depth + 1, visited);
  }

  private analyzeUniqueChartFeatures(
    chartData: ChartData,
    planets: PlanetInterpretation[],
    aspects: AspectInterpretation[],
    houses: HouseInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): string[] {
    const features: string[] = [];
    const rawPlanets = chartData.planets || {};
    const rawHouses = chartData.houses || {};

    const houseCounts = new Map<number, string[]>();
    for (const [key, planet] of Object.entries(rawPlanets)) {
      if (typeof planet?.longitude !== 'number') continue;
      const house =
        typeof planet.house === 'number'
          ? planet.house
          : this.getPlanetHouse(planet.longitude, rawHouses);
      const current = houseCounts.get(house) || [];
      current.push(this.getPlanetName(key, locale));
      houseCounts.set(house, current);
    }

    const stellium = Array.from(houseCounts.entries()).find(
      ([, housePlanets]) => housePlanets.length >= 3,
    );
    if (stellium) {
      const [houseNum, housePlanets] = stellium;
      features.push(
        locale === 'en'
          ? `A stellium-like concentration appears in house ${houseNum}: ${housePlanets.join(', ')}. This makes that life area unusually central.`
          : locale === 'es'
            ? `Hay una concentración tipo stellium en la casa ${houseNum}: ${housePlanets.join(', ')}. Esto vuelve esa esfera de vida especialmente central.`
            : `В карте есть концентрация по типу стеллиума в ${houseNum}-м доме: ${housePlanets.join(', ')}. Это делает данную сферу жизни особенно центральной.`,
      );
    }

    const angularCount = Array.from(houseCounts.entries())
      .filter(([houseNum]) => [1, 4, 7, 10].includes(houseNum))
      .reduce((sum, [, housePlanets]) => sum + housePlanets.length, 0);
    if (angularCount >= 3) {
      features.push(
        locale === 'en'
          ? 'The chart is strongly angular: key planets cluster around houses 1, 4, 7, and 10, making life events more visible and decisive.'
          : locale === 'es'
            ? 'La carta tiene un fuerte énfasis angular: varios planetas se concentran en las casas 1, 4, 7 y 10, haciendo la vida más visible y decisiva.'
            : 'Карта имеет выраженный угловой акцент: важные планеты сосредоточены вокруг 1, 4, 7 и 10 домов, поэтому события жизни проявляются ярче и прямее.',
      );
    }

    const elementCounts = {
      fire: planets.filter((p) => p.element === 'fire').length,
      earth: planets.filter((p) => p.element === 'earth').length,
      air: planets.filter((p) => p.element === 'air').length,
      water: planets.filter((p) => p.element === 'water').length,
    };
    const missingElements = Object.entries(elementCounts)
      .filter(([, count]) => count === 0)
      .map(([element]) => element);
    if (missingElements.length > 0) {
      const elementLabels = missingElements.map((element) =>
        locale === 'en'
          ? element
          : locale === 'es'
            ? {
                fire: 'fuego',
                earth: 'tierra',
                air: 'aire',
                water: 'agua',
              }[element] || element
            : {
                fire: 'огонь',
                earth: 'земля',
                air: 'воздух',
                water: 'вода',
              }[element] || element,
      );
      features.push(
        locale === 'en'
          ? `One element is underrepresented or absent: ${elementLabels.join(', ')}. This often points to a quality that must be developed consciously.`
          : locale === 'es'
            ? `Hay un elemento débil o ausente: ${elementLabels.join(', ')}. A menudo esto señala una cualidad que necesita desarrollarse de forma consciente.`
            : `В карте ослаблена или отсутствует одна из стихий: ${elementLabels.join(', ')}. Обычно это указывает на качество, которое приходится развивать осознанно.`,
      );
    }

    const rawAspects = chartData.aspects || [];
    const challengingAspects = rawAspects.filter((a) =>
      ['square', 'opposition'].includes(String(a.aspect).toLowerCase()),
    ).length;
    const harmoniousAspects = rawAspects.filter((a) =>
      ['trine', 'sextile', 'conjunction'].includes(
        String(a.aspect).toLowerCase(),
      ),
    ).length;
    if (challengingAspects >= 3 && harmoniousAspects >= 3) {
      features.push(
        locale === 'en'
          ? 'The chart combines both supportive and tense aspect patterns, so growth comes through balancing ease with pressure rather than relying on only one mode.'
          : locale === 'es'
            ? 'La carta combina patrones armónicos y tensos, así que el crecimiento llega al equilibrar facilidad y presión, no solo apoyándose en un solo modo.'
            : 'В карте одновременно выражены поддерживающие и напряженные аспектные рисунки, поэтому рост идет через баланс между естественностью и внутренним напряжением.',
      );
    }

    const loadedHouses = houses.filter((house) => house.planets.length >= 2);
    if (loadedHouses.length > 0) {
      features.push(
        locale === 'en'
          ? `The most loaded houses are ${loadedHouses
              .slice(0, 2)
              .map((house) => house.house)
              .join(', ')}, which concentrates repeated life lessons there.`
          : locale === 'es'
            ? `Las casas más cargadas son ${loadedHouses
                .slice(0, 2)
                .map((house) => house.house)
                .join(
                  ', ',
                )}, lo que concentra allí lecciones repetidas de vida.`
            : `Наиболее нагруженные дома: ${loadedHouses
                .slice(0, 2)
                .map((house) => house.house)
                .join(
                  ', ',
                )}. Это означает, что именно там будут концентрироваться повторяющиеся жизненные сюжеты.`,
      );
    }

    return [...new Set(features)].slice(0, 5);
  }

  private analyzeThematicFocus(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): {
    relationships?: string;
    career?: string;
    finances?: string;
  } {
    return {
      relationships: this.describeHouseRulerFlow(chartData, 7, locale),
      career: this.describeHouseRulerFlow(chartData, 10, locale),
      finances: this.describeMoneyAxis(chartData, locale),
    };
  }

  private describeHouseRulerFlow(
    chartData: ChartData,
    houseNum: number,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const houses = chartData.houses || {};
    const planets = chartData.planets || {};
    const houseSign = houses[houseNum]?.sign;
    if (!houseSign) return '';

    const rulerKey = this.getSignRuler(houseSign);
    const rulerPlanet = planets[rulerKey];
    if (!rulerPlanet?.sign) return '';

    const rulerHouse =
      typeof rulerPlanet.house === 'number'
        ? rulerPlanet.house
        : this.getPlanetHouse(rulerPlanet.longitude, houses);
    const rulerName = this.getPlanetName(rulerKey, locale);

    if (locale === 'en') {
      return `House ${houseNum} starts in ${houseSign}, and its ruler ${rulerName} is placed in house ${rulerHouse}. This means the topics of house ${houseNum} tend to unfold through the sphere of house ${rulerHouse}.`;
    }
    if (locale === 'es') {
      return `La casa ${houseNum} comienza en ${houseSign}, y su regente ${rulerName} está en la casa ${rulerHouse}. Esto significa que los temas de la casa ${houseNum} suelen desplegarse a través de la esfera de la casa ${rulerHouse}.`;
    }
    return `${houseNum}-й дом начинается в знаке ${houseSign}, а его управитель ${rulerName} расположен в ${rulerHouse}-м доме. Это означает, что темы ${houseNum}-го дома обычно реализуются через сферу ${rulerHouse}-го дома.`;
  }

  private describeMoneyAxis(
    chartData: ChartData,
    locale: 'ru' | 'en' | 'es',
  ): string {
    const second = this.describeHouseRulerFlow(chartData, 2, locale);
    const eighth = this.describeHouseRulerFlow(chartData, 8, locale);
    if (!second && !eighth) return '';

    if (locale === 'en') {
      return [second, eighth]
        .filter(Boolean)
        .join(' ')
        .concat(
          ' Taken together, this shows how personal resources and shared resources interact in the chart.',
        );
    }
    if (locale === 'es') {
      return [second, eighth]
        .filter(Boolean)
        .join(' ')
        .concat(
          ' En conjunto, esto muestra cómo interactúan en la carta los recursos propios y los compartidos.',
        );
    }
    return [second, eighth]
      .filter(Boolean)
      .join(' ')
      .concat(
        ' Вместе это показывает, как в карте взаимодействуют личные ресурсы и совместные или зависимые финансовые сюжеты.',
      );
  }

  private getStrongestAspectHighlights(
    aspects: AspectInterpretation[],
    locale: 'ru' | 'en' | 'es',
  ): Array<{
    title: string;
    interpretation: string;
  }> {
    return [...aspects]
      .sort((a, b) => {
        const strengthDiff = (b.strength || 0) - (a.strength || 0);
        if (strengthDiff !== 0) return strengthDiff;
        return (a.orb || 99) - (b.orb || 99);
      })
      .slice(0, 3)
      .map((aspect) => ({
        title:
          locale === 'en'
            ? `${aspect.planetA} ${aspect.type} ${aspect.planetB}`
            : locale === 'es'
              ? `${aspect.planetA} ${aspect.type} ${aspect.planetB}`
              : `${aspect.planetA} ${aspect.type} ${aspect.planetB}`,
        interpretation:
          locale === 'en'
            ? `${aspect.interpretation} This is one of the tightest and most influential aspects in the chart.`
            : locale === 'es'
              ? `${aspect.interpretation} Este es uno de los aspectos más cerrados e influyentes de la carta.`
              : `${aspect.interpretation} Это один из самых точных и влиятельных аспектов карты.`,
      }));
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
