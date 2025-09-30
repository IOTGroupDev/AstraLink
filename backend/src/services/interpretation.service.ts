// backend/src/services/interpretation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
    const interpretations: { [key: string]: { [key: string]: string } } = {
      sun: {
        Aries:
          'Солнце в Овне наделяет вас огненной энергией, лидерскими качествами и стремлением к независимости. Вы прирожденный первопроходец.',
        Taurus:
          'Солнце в Тельце дает вам стабильность, практичность и любовь к земным удовольствиям. Вы цените комфорт и красоту.',
        Gemini:
          'Солнце в Близнецах наделяет вас любознательностью, коммуникабельностью и гибким умом. Вы легко адаптируетесь к переменам.',
        Cancer:
          'Солнце в Раке делает вас чувствительным, заботливым и эмоциональным. Семья и дом имеют для вас первостепенное значение.',
        Leo: 'Солнце во Льве дает вам уверенность, творческий потенциал и стремление к признанию. Вы прирожденный лидер и вдохновитель.',
        Virgo:
          'Солнце в Деве наделяет вас аналитическим умом, практичностью и стремлением к совершенству. Вы внимательны к деталям.',
        Libra:
          'Солнце в Весах дает вам стремление к гармонии, справедливости и красоте. Вы прирожденный дипломат и миротворец.',
        Scorpio:
          'Солнце в Скорпионе наделяет вас интенсивностью, страстью и проницательностью. Вы обладаете мощной внутренней силой.',
        Sagittarius:
          'Солнце в Стрельце дает вам оптимизм, свободолюбие и стремление к познанию. Вы философ и искатель приключений.',
        Capricorn:
          'Солнце в Козероге наделяет вас амбициозностью, ответственностью и целеустремленностью. Вы построите успешную карьеру.',
        Aquarius:
          'Солнце в Водолее дает вам оригинальность, независимость и гуманистические идеалы. Вы - новатор и реформатор.',
        Pisces:
          'Солнце в Рыбах наделяет вас чувствительностью, интуицией и творческим воображением. Вы мечтатель и духовный искатель.',
      },
      moon: {
        Aries:
          'Луна в Овне делает вас эмоционально импульсивным и страстным. Вы быстро реагируете на события и не скрываете чувств.',
        Taurus:
          'Луна в Тельце дает эмоциональную стабильность и потребность в комфорте. Вы спокойны и уравновешены.',
        Gemini:
          'Луна в Близнецах наделяет вас эмоциональной гибкостью и любознательностью. Вы нуждаетесь в интеллектуальной стимуляции.',
        Cancer:
          'Луна в Раке усиливает вашу эмоциональность и интуицию. Вы глубоко чувствуете и нуждаетесь в эмоциональной безопасности.',
        Leo: 'Луна во Льве дает вам эмоциональную щедрость и потребность в признании. Вы драматичны и выразительны в чувствах.',
        Virgo:
          'Луна в Деве делает вас эмоционально сдержанным и практичным. Вы выражаете заботу через конкретные действия.',
        Libra:
          'Луна в Весах дает потребность в гармонии и балансе. Вы стремитесь к эмоциональному равновесию в отношениях.',
        Scorpio:
          'Луна в Скорпионе наделяет вас интенсивными и глубокими эмоциями. Вы переживаете все очень сильно.',
        Sagittarius:
          'Луна в Стрельце дает эмоциональный оптимизм и свободолюбие. Вы нуждаетесь в приключениях и новом опыте.',
        Capricorn:
          'Луна в Козероге делает вас эмоционально сдержанным и ответственным. Вы контролируете свои чувства.',
        Aquarius:
          'Луна в Водолее дает эмоциональную независимость и оригинальность. Вы цените свободу и дружбу.',
        Pisces:
          'Луна в Рыбах наделяет вас высокой эмоциональной чувствительностью и эмпатией. Вы интуитивны и мечтательны.',
      },
      // Добавьте интерпретации для других планет
    };

    return (
      interpretations[planet]?.[sign] ||
      `${this.getPlanetName(planet)} в ${sign} влияет на вашу жизнь уникальным образом.`
    );
  }

  /**
   * Интерпретация аспекта
   */
  private interpretAspect(
    planet1: string,
    planet2: string,
    aspect: string,
  ): string {
    const aspectInterpretations: { [key: string]: string } = {
      conjunction: 'объединяет энергии, создавая мощный фокус',
      opposition: 'создает динамическое напряжение, требующее баланса',
      trine: 'образует гармоничный поток энергии, приносящий удачу',
      square: 'генерирует вызов, стимулирующий рост и развитие',
      sextile: 'открывает возможности для творческого сотрудничества',
    };

    const p1Name = this.getPlanetName(planet1);
    const p2Name = this.getPlanetName(planet2);
    const aspectDesc = aspectInterpretations[aspect] || 'взаимодействует с';

    return `${p1Name} ${aspectDesc} ${p2Name}, что влияет на ваш характер и жизненный путь.`;
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
    const names: { [key: string]: string } = {
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
    return names[key] || key;
  }

  private getAspectName(aspect: string): string {
    const names: { [key: string]: string } = {
      conjunction: 'в соединении с',
      opposition: 'в оппозиции к',
      trine: 'в тригоне к',
      square: 'в квадрате к',
      sextile: 'в секстиле к',
    };
    return names[aspect] || aspect;
  }

  private getPlanetKeywords(planet: string, sign: string): string[] {
    // Базовые ключевые слова - упрощенная версия
    return ['энергичный', 'целеустремленный', 'творческий', 'интуитивный'];
  }

  private getPlanetStrengths(planet: string, sign: string): string[] {
    return ['Лидерские качества', 'Креативность', 'Решительность'];
  }

  private getPlanetChallenges(planet: string, sign: string): string[] {
    return ['Импульсивность', 'Нетерпеливость'];
  }

  private getAscendantKeywords(sign: string): string[] {
    return ['привлекательный', 'харизматичный', 'уверенный'];
  }

  private getAscendantStrengths(sign: string): string[] {
    return ['Природное обаяние', 'Уверенность в себе'];
  }

  private getAscendantChallenges(sign: string): string[] {
    return ['Излишняя прямолинейность'];
  }

  private interpretAscendant(sign: string): string {
    const interpretations: { [key: string]: string } = {
      Aries:
        'Асцендент в Овне делает вас энергичным, прямолинейным и инициативным. Вы производите впечатление уверенного лидера.',
      Taurus:
        'Асцендент в Тельце придает вам спокойствие, надежность и практичность. Вы кажетесь стабильным и заземленным.',
      // Добавьте для других знаков
    };
    return (
      interpretations[sign] ||
      `Асцендент в ${sign} формирует ваш внешний образ.`
    );
  }

  private interpretHouse(houseNum: number, sign: string): string {
    const houseThemes: { [key: number]: string } = {
      1: 'личность и самовыражение',
      2: 'финансы и ценности',
      3: 'коммуникация и обучение',
      4: 'дом и семья',
      5: 'творчество и романтика',
      6: 'здоровье и служение',
      7: 'партнерство и брак',
      8: 'трансформация и общие ресурсы',
      9: 'философия и путешествия',
      10: 'карьера и общественное положение',
      11: 'дружба и устремления',
      12: 'подсознание и духовность',
    };

    return `${houseNum}-й дом в ${sign} влияет на сферу ${houseThemes[houseNum]}`;
  }

  private getHouseLifeArea(houseNum: number): string {
    const areas: { [key: number]: string } = {
      1: 'Личность',
      2: 'Финансы',
      3: 'Коммуникация',
      4: 'Дом и семья',
      5: 'Творчество',
      6: 'Здоровье',
      7: 'Партнерство',
      8: 'Трансформация',
      9: 'Путешествия',
      10: 'Карьера',
      11: 'Дружба',
      12: 'Духовность',
    };
    return areas[houseNum] || 'Жизненная сфера';
  }

  private getAspectSignificance(aspect: string, strength: number): string {
    if (strength > 0.8) return 'Очень сильное влияние';
    if (strength > 0.6) return 'Сильное влияние';
    if (strength > 0.4) return 'Умеренное влияние';
    return 'Слабое влияние';
  }
}
