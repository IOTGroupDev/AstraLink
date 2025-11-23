/**
 * Personal Code Service
 * Generates personalized numerical codes based on natal chart + numerology
 * Combines Swiss Ephemeris data with numerological principles
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ChartRepository } from '@/repositories/chart.repository';
import { AIService } from '@/services/ai.service';

/**
 * Subscription tiers
 */
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  MAX = 'max',
}

/**
 * Check if tier has AI access
 */
export function hasAIAccess(tier: SubscriptionTier): boolean {
  return tier === SubscriptionTier.PREMIUM || tier === SubscriptionTier.MAX;
}

/**
 * Code purposes (what the code is for)
 */
export enum CodePurpose {
  LUCK = 'luck', // Удача и везение
  HEALTH = 'health', // Здоровье и витальность
  WEALTH = 'wealth', // Финансы и богатство
  LOVE = 'love', // Любовь и отношения
  CAREER = 'career', // Карьера и успех
  CREATIVITY = 'creativity', // Творчество
  PROTECTION = 'protection', // Защита
  INTUITION = 'intuition', // Интуиция
  HARMONY = 'harmony', // Гармония
  ENERGY = 'energy', // Энергия и сила
}

/**
 * Breakdown of each digit in the code
 */
export interface CodeDigitBreakdown {
  digit: number;
  position: number;
  source: string; // "Sun 127.5°", "Moon in House 4"
  astrologyMeaning: string;
  numerologyMeaning: string;
  influence: string;
}

/**
 * Complete result of code generation
 */
export interface PersonalCodeResult {
  code: string;
  purpose: CodePurpose;
  digitCount: number;
  breakdown: CodeDigitBreakdown[];
  interpretation: {
    summary: string;
    detailed: string;
    howToUse: string[];
    whenToUse: string;
    energyLevel: number; // 0-100
    compatibility: string;
    vibration: string; // "Высокая", "Средняя", "Гармоничная"
  };
  numerology: {
    totalSum: number; // Sum of all digits
    reducedNumber: number; // Reduced to 1-9
    masterNumber?: number; // 11, 22, 33 if present
    meaning: string;
  };
  generatedAt: string;
  generatedBy: 'algorithm' | 'ai';
  subscriptionTier: SubscriptionTier;
}

@Injectable()
export class PersonalCodeService {
  private readonly logger = new Logger(PersonalCodeService.name);

  constructor(
    private chartRepository: ChartRepository,
    private aiService: AIService,
  ) {}

  /**
   * Recursively extract planets from nested data structure
   */
  private extractChartData(data: any): {
    planets: Record<string, any>;
    houses: any[];
    aspects: any[];
  } {
    // Direct access
    if (data.planets && typeof data.planets === 'object') {
      return {
        planets: data.planets,
        houses: data.houses || [],
        aspects: data.aspects || [],
      };
    }

    // Check nested 'data' property
    if (data.data && typeof data.data === 'object') {
      return this.extractChartData(data.data);
    }

    // Not found
    return {
      planets: {},
      houses: [],
      aspects: [],
    };
  }

  /**
   * Generate personal code
   */
  async generatePersonalCode(
    userId: string,
    purpose: CodePurpose,
    digitCount: number = 4,
    subscriptionTier: SubscriptionTier = SubscriptionTier.FREE,
  ): Promise<PersonalCodeResult> {
    // Validate
    if (digitCount < 3 || digitCount > 9) {
      throw new BadRequestException('Количество цифр должно быть от 3 до 9');
    }

    // Get natal chart
    const chart = await this.chartRepository.findByUserId(userId);
    if (!chart) {
      throw new BadRequestException(
        'Натальная карта не найдена. Создайте карту в профиле.',
      );
    }

    // Debug: Log chart structure
    this.logger.debug(
      `Chart data keys: ${JSON.stringify(Object.keys(chart.data || {}))}`,
    );

    // Use recursive extraction to handle any nesting level
    const extracted = this.extractChartData(chart.data);
    const planets = extracted.planets;
    const houses = extracted.houses;
    const aspects = extracted.aspects;

    this.logger.debug(
      `Extracted planets: ${JSON.stringify(Object.keys(planets))}`,
    );

    // Validate that we have planets
    if (!planets || Object.keys(planets).length === 0) {
      // Try to help debug
      const debugInfo = {
        chartDataKeys: Object.keys(chart.data || {}),
        hasData: !!chart.data?.data,
        dataKeys: chart.data?.data ? Object.keys(chart.data.data) : [],
      };

      this.logger.error(
        `No planets found. Debug info: ${JSON.stringify(debugInfo, null, 2)}`,
      );

      throw new BadRequestException(
        'Натальная карта не содержит данных о планетах. Пересоздайте карту в профиле.',
      );
    }

    this.logger.debug(`Found ${Object.keys(planets).length} planets`);

    // Generate code algorithmically
    const codeData = this.calculateCodeFromChart(
      planets,
      houses,
      aspects,
      purpose,
      digitCount,
    );

    // Calculate numerology
    const numerology = this.calculateNumerology(codeData.code);

    // Generate interpretation
    const interpretation = await this.generateInterpretation(
      codeData,
      purpose,
      numerology,
      { planets, houses, aspects }, // Pass extracted data
      subscriptionTier,
    );

    return {
      code: codeData.code,
      purpose,
      digitCount,
      breakdown: codeData.breakdown,
      interpretation,
      numerology,
      generatedAt: new Date().toISOString(),
      generatedBy: hasAIAccess(subscriptionTier) ? 'ai' : 'algorithm',
      subscriptionTier,
    };
  }

  /**
   * Calculate code from natal chart
   * Uses planetary positions, house cusps, and aspects
   */
  private calculateCodeFromChart(
    planets: Record<string, any>,
    houses: any[],
    aspects: any[],
    purpose: CodePurpose,
    digitCount: number,
  ): {
    code: string;
    breakdown: CodeDigitBreakdown[];
  } {
    const breakdown: CodeDigitBreakdown[] = [];

    // Purpose configuration - which planets/houses to use
    const config = this.getPurposeConfiguration(purpose);

    // 1. Primary planet (most important for this purpose)
    const primaryPlanet = planets[config.primaryPlanet];
    if (primaryPlanet && primaryPlanet.longitude != null) {
      const digit = this.planetToDigit(primaryPlanet, 'primary');
      breakdown.push({
        digit,
        position: 1,
        source: `${this.translatePlanet(config.primaryPlanet)} (${Math.floor(primaryPlanet.longitude)}°)`,
        astrologyMeaning: this.getPlanetMeaning(config.primaryPlanet, purpose),
        numerologyMeaning: this.getDigitMeaning(digit),
        influence: 'Основная энергия',
      });
    }

    // 2. Secondary planet
    if (breakdown.length < digitCount && config.secondaryPlanet) {
      const secondaryPlanet = planets[config.secondaryPlanet];
      if (secondaryPlanet && secondaryPlanet.longitude != null) {
        const digit = this.planetToDigit(secondaryPlanet, 'secondary');
        breakdown.push({
          digit,
          position: 2,
          source: `${this.translatePlanet(config.secondaryPlanet)} (${Math.floor(secondaryPlanet.longitude)}°)`,
          astrologyMeaning: this.getPlanetMeaning(
            config.secondaryPlanet,
            purpose,
          ),
          numerologyMeaning: this.getDigitMeaning(digit),
          influence: 'Поддерживающая энергия',
        });
      }
    }

    // 3. Relevant houses
    for (const houseNum of config.houses) {
      if (breakdown.length >= digitCount) break;

      const house = houses[houseNum - 1];
      if (house?.cusp) {
        const digit = this.degreeToDigit(house.cusp);
        breakdown.push({
          digit,
          position: breakdown.length + 1,
          source: `${houseNum}-й дом (${house.sign})`,
          astrologyMeaning: this.getHouseMeaning(houseNum, purpose),
          numerologyMeaning: this.getDigitMeaning(digit),
          influence: 'Сфера проявления',
        });
      }
    }

    // 4. Supporting planets if needed
    if (breakdown.length < digitCount && config.supportingPlanets) {
      for (const planetName of config.supportingPlanets) {
        if (breakdown.length >= digitCount) break;
        const planet = planets[planetName];
        if (planet && planet.longitude != null) {
          const digit = this.planetToDigit(planet, 'supporting');
          breakdown.push({
            digit,
            position: breakdown.length + 1,
            source: `${this.translatePlanet(planetName)} (${Math.floor(planet.longitude)}°)`,
            astrologyMeaning: this.getPlanetMeaning(planetName, purpose),
            numerologyMeaning: this.getDigitMeaning(digit),
            influence: 'Дополнительная энергия',
          });
        }
      }
    }

    // 5. Use strongest aspects if still need more digits
    if (breakdown.length < digitCount) {
      const strongAspects = aspects
        .filter((a: any) => a.strength > 0.7)
        .slice(0, digitCount - breakdown.length);

      for (const aspect of strongAspects) {
        const digit = Math.floor(Math.abs(aspect.orb)) % 9 || 1;
        breakdown.push({
          digit,
          position: breakdown.length + 1,
          source: `Аспект ${aspect.type} (${aspect.orb.toFixed(1)}°)`,
          astrologyMeaning: `Связь между ${aspect.planetA} и ${aspect.planetB}`,
          numerologyMeaning: this.getDigitMeaning(digit),
          influence: 'Динамика энергий',
        });
      }
    }

    // Ensure we have exactly digitCount digits
    while (breakdown.length < digitCount) {
      const digit = (breakdown.length % 9) + 1;
      breakdown.push({
        digit,
        position: breakdown.length + 1,
        source: 'Гармонизация',
        astrologyMeaning: 'Балансирующая энергия',
        numerologyMeaning: this.getDigitMeaning(digit),
        influence: 'Завершение кода',
      });
    }

    const code = breakdown
      .slice(0, digitCount)
      .map((b) => b.digit)
      .join('');

    return { code, breakdown: breakdown.slice(0, digitCount) };
  }

  /**
   * Get purpose-specific configuration
   */
  private getPurposeConfiguration(purpose: CodePurpose): {
    primaryPlanet: string;
    secondaryPlanet?: string;
    supportingPlanets?: string[];
    houses: number[];
  } {
    const configs = {
      [CodePurpose.LUCK]: {
        primaryPlanet: 'jupiter',
        secondaryPlanet: 'sun',
        supportingPlanets: ['venus', 'mercury'],
        houses: [1, 5, 9, 11],
      },
      [CodePurpose.HEALTH]: {
        primaryPlanet: 'sun',
        secondaryPlanet: 'moon',
        supportingPlanets: ['mars', 'venus'],
        houses: [1, 6],
      },
      [CodePurpose.WEALTH]: {
        primaryPlanet: 'jupiter',
        secondaryPlanet: 'venus',
        supportingPlanets: ['sun', 'pluto'],
        houses: [2, 8, 10, 11],
      },
      [CodePurpose.LOVE]: {
        primaryPlanet: 'venus',
        secondaryPlanet: 'moon',
        supportingPlanets: ['mars', 'neptune'],
        houses: [5, 7],
      },
      [CodePurpose.CAREER]: {
        primaryPlanet: 'saturn',
        secondaryPlanet: 'sun',
        supportingPlanets: ['mars', 'jupiter'],
        houses: [10, 6, 2],
      },
      [CodePurpose.CREATIVITY]: {
        primaryPlanet: 'venus',
        secondaryPlanet: 'neptune',
        supportingPlanets: ['sun', 'mercury'],
        houses: [5, 3, 12],
      },
      [CodePurpose.PROTECTION]: {
        primaryPlanet: 'saturn',
        secondaryPlanet: 'mars',
        supportingPlanets: ['pluto', 'jupiter'],
        houses: [4, 8, 12],
      },
      [CodePurpose.INTUITION]: {
        primaryPlanet: 'neptune',
        secondaryPlanet: 'moon',
        supportingPlanets: ['uranus', 'pluto'],
        houses: [8, 9, 12],
      },
      [CodePurpose.HARMONY]: {
        primaryPlanet: 'venus',
        secondaryPlanet: 'jupiter',
        supportingPlanets: ['moon', 'neptune'],
        houses: [4, 7, 11],
      },
      [CodePurpose.ENERGY]: {
        primaryPlanet: 'mars',
        secondaryPlanet: 'sun',
        supportingPlanets: ['jupiter', 'uranus'],
        houses: [1, 5, 9],
      },
    };

    return configs[purpose];
  }

  /**
   * Convert planet position to digit (1-9)
   */
  private planetToDigit(planet: any, importance: string): number {
    let degree = Math.abs(planet.longitude);

    // Add retrograde influence
    if (planet.isRetrograde) {
      degree += 180;
    }

    // Primary planets use full degree
    // Secondary/supporting use modulo to create variety
    if (importance === 'primary') {
      return this.degreeToDigit(degree);
    } else if (importance === 'secondary') {
      return this.degreeToDigit(degree * 1.5);
    } else {
      return this.degreeToDigit(degree * 0.7);
    }
  }

  /**
   * Convert degree to single digit (1-9)
   */
  private degreeToDigit(degree: number): number {
    let num = Math.floor(Math.abs(degree));

    // Reduce to single digit
    while (num > 9) {
      const digits = num.toString().split('').map(Number);
      num = digits.reduce((sum, d) => sum + d, 0);
    }

    return num === 0 ? 9 : num;
  }

  /**
   * Calculate numerology from code
   */
  private calculateNumerology(code: string): PersonalCodeResult['numerology'] {
    const digits = code.split('').map(Number);
    const totalSum = digits.reduce((sum, d) => sum + d, 0);

    // Reduce to single digit (but keep master numbers)
    let reducedNumber = totalSum;
    let masterNumber: number | undefined;

    // Check for master numbers before reducing
    if (totalSum === 11 || totalSum === 22 || totalSum === 33) {
      masterNumber = totalSum;
    }

    // Reduce to 1-9
    while (reducedNumber > 9) {
      const temp = reducedNumber
        .toString()
        .split('')
        .map(Number)
        .reduce((sum, d) => sum + d, 0);
      reducedNumber = temp;
    }

    return {
      totalSum,
      reducedNumber,
      masterNumber,
      meaning: this.getNumberMeaning(reducedNumber, masterNumber),
    };
  }

  /**
   * Generate interpretation
   */
  private async generateInterpretation(
    codeData: { code: string; breakdown: CodeDigitBreakdown[] },
    purpose: CodePurpose,
    numerology: PersonalCodeResult['numerology'],
    chartData: { planets: any; houses: any[]; aspects: any[] },
    tier: SubscriptionTier,
  ): Promise<PersonalCodeResult['interpretation']> {
    const isPremium = hasAIAccess(tier);

    // Base interpretation (algorithmic)
    const summary = this.getBasicSummary(codeData.code, purpose, numerology);
    const howToUse = this.getUsageInstructions(purpose);
    const whenToUse = this.getWhenToUse(purpose);
    const energyLevel = this.calculateEnergyLevel(
      codeData.breakdown,
      numerology,
    );
    const compatibility = this.getCompatibility(codeData.breakdown);
    const vibration = this.getVibration(energyLevel);

    // AI-enhanced for Premium/Max
    if (isPremium && this.aiService.isAvailable()) {
      try {
        const aiDetailed = await this.generateAIInterpretation(
          codeData,
          purpose,
          numerology,
          chartData,
        );

        return {
          summary,
          detailed: aiDetailed,
          howToUse,
          whenToUse,
          energyLevel,
          compatibility,
          vibration,
        };
      } catch (error) {
        this.logger.error('AI interpretation failed:', error);
        // Fallback to algorithmic
      }
    }

    // Algorithmic detailed interpretation
    const detailed = this.getAlgorithmicDetailed(codeData, purpose, numerology);

    return {
      summary,
      detailed,
      howToUse,
      whenToUse,
      energyLevel,
      compatibility,
      vibration,
    };
  }

  /**
   * Generate AI interpretation (Premium/Max)
   */
  private async generateAIInterpretation(
    codeData: { code: string; breakdown: CodeDigitBreakdown[] },
    purpose: CodePurpose,
    numerology: PersonalCodeResult['numerology'],
    chartData: any,
  ): Promise<string> {
    const purposeTranslations = {
      luck: 'удачи и везения',
      health: 'здоровья и витальности',
      wealth: 'финансового успеха и богатства',
      love: 'любви и гармоничных отношений',
      career: 'карьерного успеха',
      creativity: 'творчества и самовыражения',
      protection: 'защиты и безопасности',
      intuition: 'интуиции и духовного роста',
      harmony: 'гармонии и баланса',
      energy: 'энергии и жизненной силы',
    };

    const breakdownText = codeData.breakdown
      .map(
        (b) =>
          `${b.digit} - ${b.source}: ${b.astrologyMeaning} (${b.numerologyMeaning})`,
      )
      .join('\n');

    const prompt = `Ты профессиональный астролог и нумеролог. Проанализируй персональный числовой код для ${purposeTranslations[purpose]}.

КОД: ${codeData.code}

АСТРОЛОГИЧЕСКАЯ ОСНОВА:
${breakdownText}

НУМЕРОЛОГИЯ:
- Сумма цифр: ${numerology.totalSum}
- Итоговое число: ${numerology.reducedNumber}${numerology.masterNumber ? ` (Мастер-число: ${numerology.masterNumber})` : ''}
- Значение: ${numerology.meaning}

НАТАЛЬНАЯ КАРТА:
- Солнце: ${chartData.planets?.sun?.sign || 'неизвестно'}
- Луна: ${chartData.planets?.moon?.sign || 'неизвестно'}
- Асцендент: ${chartData.houses?.[0]?.sign || 'неизвестно'}

Создай детальную интерпретацию (200-250 слов):
1. Объясни, как этот код работает для ${purposeTranslations[purpose]}
2. Какие астрологические и нумерологические принципы стоят за ним
3. Как каждая цифра вносит свой вклад
4. Какие энергии активируются при использовании кода
5. Особенности и уникальность этого кода для данного человека

Пиши понятно, вдохновляюще и практично.`;

    const response = await this.aiService.generateText(prompt, {
      temperature: 0.8,
      maxTokens: 600,
    });

    return response.trim();
  }

  /**
   * Algorithmic detailed interpretation
   */
  private getAlgorithmicDetailed(
    codeData: { code: string; breakdown: CodeDigitBreakdown[] },
    purpose: CodePurpose,
    numerology: PersonalCodeResult['numerology'],
  ): string {
    const purposeDescriptions = {
      luck: 'усиливает вашу удачу и притягивает благоприятные возможности',
      health: 'гармонизирует энергетику тела и укрепляет жизненную силу',
      wealth: 'открывает денежные потоки и привлекает финансовое изобилие',
      love: 'настраивает на частоту любви и гармоничных отношений',
      career: 'активирует профессиональный успех и карьерный рост',
      creativity: 'раскрывает творческий потенциал и вдохновение',
      protection: 'создаёт защитное энергетическое поле',
      intuition: 'усиливает интуицию и духовное восприятие',
      harmony: 'приводит в баланс все сферы жизни',
      energy: 'повышает витальность и жизненную энергию',
    };

    let text = `Ваш персональный код ${codeData.code} ${purposeDescriptions[purpose]}. `;

    text += `Этот код создан на основе вашей натальной карты и содержит ${codeData.breakdown.length} цифр, каждая из которых несёт особую энергию.\n\n`;

    // Explain key digits
    const primary = codeData.breakdown[0];
    text += `Первая цифра ${primary.digit} (${primary.source}) задаёт основную вибрацию: ${primary.astrologyMeaning}. `;

    if (numerology.masterNumber) {
      text += `\n\nСумма всех цифр даёт мастер-число ${numerology.masterNumber}, что усиливает духовный потенциал кода. `;
    }

    text += `Итоговое нумерологическое число ${numerology.reducedNumber} ${this.getReducedNumberInterpretation(numerology.reducedNumber, purpose)}.`;

    return text;
  }

  // Helper methods for translations and meanings

  private translatePlanet(planet: string): string {
    const map: Record<string, string> = {
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
    return map[planet] || planet;
  }

  private getPlanetMeaning(planet: string, purpose: CodePurpose): string {
    // Simplified - expand as needed
    return `Энергия планеты ${this.translatePlanet(planet)}`;
  }

  private getHouseMeaning(house: number, purpose: CodePurpose): string {
    return `Энергия ${house}-го дома`;
  }

  private getDigitMeaning(digit: number): string {
    const meanings: Record<number, string> = {
      1: 'Лидерство, начинания, сила',
      2: 'Партнёрство, баланс, гармония',
      3: 'Творчество, радость, самовыражение',
      4: 'Стабильность, структура, основа',
      5: 'Свобода, изменения, динамика',
      6: 'Любовь, забота, ответственность',
      7: 'Духовность, мудрость, анализ',
      8: 'Власть, изобилие, материальный успех',
      9: 'Завершение, сострадание, универсальность',
    };
    return meanings[digit] || 'Универсальная энергия';
  }

  private getNumberMeaning(reduced: number, master?: number): string {
    if (master === 11) return 'Мастер-число духовного просветления';
    if (master === 22) return 'Мастер-число материализации';
    if (master === 33) return 'Мастер-число служения';

    const meanings: Record<number, string> = {
      1: 'Независимость и лидерство',
      2: 'Сотрудничество и дипломатия',
      3: 'Творчество и самовыражение',
      4: 'Стабильность и порядок',
      5: 'Свобода и приключения',
      6: 'Гармония и служение',
      7: 'Духовность и познание',
      8: 'Материальное изобилие',
      9: 'Завершение цикла и мудрость',
    };
    return meanings[reduced] || 'Универсальная энергия';
  }

  private getReducedNumberInterpretation(
    num: number,
    purpose: CodePurpose,
  ): string {
    return `завершает энергетическую формулу, создавая мощный резонанс для вашей цели`;
  }

  private getBasicSummary(
    code: string,
    purpose: CodePurpose,
    numerology: PersonalCodeResult['numerology'],
  ): string {
    const purposeNames = {
      luck: 'удачи',
      health: 'здоровья',
      wealth: 'богатства',
      love: 'любви',
      career: 'карьеры',
      creativity: 'творчества',
      protection: 'защиты',
      intuition: 'интуиции',
      harmony: 'гармонии',
      energy: 'энергии',
    };

    return `Персональный код ${code} для ${purposeNames[purpose]}, рассчитанный на основе вашей натальной карты. Итоговое число: ${numerology.reducedNumber}${numerology.masterNumber ? ` (Мастер-число ${numerology.masterNumber})` : ''}.`;
  }

  private getUsageInstructions(purpose: CodePurpose): string[] {
    const useCases: Record<CodePurpose, string[]> = {
      luck: [
        '4 цифры → PIN-код банковской карты для привлечения денег',
        '6 цифр → Пароль для важных аккаунтов (социальные сети)',
        '7 цифр → Последние цифры номера телефона при выборе SIM',
        'Произносите код перед важными решениями',
        'Используйте как пароль Wi-Fi дома для удачи в семье',
        'Записывайте на лотерейных билетах',
      ],
      health: [
        '4 цифры → PIN для фитнес-приложения или умных весов',
        '6 цифр → Пароль медицинских приложений',
        'Ставьте напоминание в телефоне на это время (например, 15:37)',
        'Используйте как количество повторений в упражнениях',
        'Пишите на бутылке с водой перед употреблением',
        'Медитируйте на код перед сном',
      ],
      wealth: [
        '4 цифры → PIN-код основной банковской карты',
        '6 цифр → Пароль для банковских приложений',
        '7 цифр → Сумма первой инвестиции (×1000 руб)',
        'Переводите себе эту сумму каждый день (копилка изобилия)',
        'Используйте в названии сберегательных счетов',
        'Записывайте на конвертах с деньгами',
      ],
      love: [
        '4 цифры → Время свидания (например, 18:27)',
        '6 цифр → Пароль совместного аккаунта с партнером',
        'Дарите подарки на эту сумму',
        'Отправляйте сообщения в это время дня',
        'Используйте как количество дней между важными встречами',
        'Записывайте в совместном календаре событий',
      ],
      career: [
        '4 цифры → PIN для рабочего компьютера',
        '6 цифр → Пароль профессиональных сетей (LinkedIn)',
        '7 цифр → Желаемая зарплата (×1000 руб) для визуализации',
        'Ставьте будильник на это время для продуктивного утра',
        'Используйте в названии карьерных целей',
        'Произносите перед собеседованиями и переговорами',
      ],
      creativity: [
        '5 цифр → Количество слов для ежедневного письма',
        '4 цифры → Время начала творческой сессии',
        'Делайте столько набросков/идей в день',
        'Используйте как название творческих проектов',
        'Записывайте в дневнике идей',
        'Медитируйте на код перед творчеством',
      ],
      protection: [
        '6 цифр → Пароль домашней сигнализации',
        '4 цифры → PIN для домофона',
        'Используйте для замка багажа при путешествиях',
        'Записывайте на защитных амулетах',
        'Произносите перед выходом из дома',
        'Визуализируйте защитный кокон с этим кодом',
      ],
      intuition: [
        '4 цифры → Время для ежедневной медитации',
        'Записывайте в дневнике снов',
        'Используйте для нумерации инсайтов',
        'Медитируйте на код перед важными решениями',
        'Ставьте напоминание для интуитивных практик',
        'Используйте в названии духовных целей',
      ],
      harmony: [
        '4 цифры → Время семейного ужина',
        '5 цифр → Количество минут для практик баланса',
        'Используйте как интервал между работой и отдыхом',
        'Повторяйте при стрессе для центрирования',
        'Записывайте в дневнике благодарности',
        'Используйте для семейных ритуалов',
      ],
      energy: [
        '4 цифры → Время утреннего подъема для бодрости',
        '5 цифр → Количество шагов/калорий в день',
        'Используйте как количество вдохов в энергетических практиках',
        'Произносите при упадке сил',
        'Визуализируйте код как источник энергии',
        'Пишите на спортивной одежде/бутылках',
      ],
    };

    return useCases[purpose];
  }

  private getWhenToUse(purpose: CodePurpose): string {
    const times: Record<CodePurpose, string> = {
      luck: 'Утром перед важными делами, в моменты выбора',
      health: 'Утром натощак, перед тренировками, при недомогании',
      wealth: 'Перед финансовыми операциями, в дни выплат',
      love: 'Вечером перед сном, перед встречами',
      career: 'Перед работой, в начале недели, перед важными встречами',
      creativity: 'В творческом процессе, при вдохновении',
      protection: 'Утром и вечером, перед выходом в публичные места',
      intuition: 'В медитации, перед важными решениями',
      harmony: 'В любое время при дисбалансе',
      energy: 'Утром для заряда, днём при усталости',
    };
    return times[purpose];
  }

  private calculateEnergyLevel(
    breakdown: CodeDigitBreakdown[],
    numerology: PersonalCodeResult['numerology'],
  ): number {
    // Base on digit sum and master numbers
    let level = (numerology.totalSum / breakdown.length) * 10;

    if (numerology.masterNumber) {
      level += 20;
    }

    // High digits (7-9) add energy
    const highDigits = breakdown.filter((b) => b.digit >= 7).length;
    level += highDigits * 5;

    return Math.min(100, Math.max(0, Math.round(level)));
  }

  private getCompatibility(breakdown: CodeDigitBreakdown[]): string {
    const sources = breakdown.map((b) => b.source);
    const hasPrimaryPlanet = sources.some(
      (s) => s.includes('Солнце') || s.includes('Луна') || s.includes('Юпитер'),
    );

    if (hasPrimaryPlanet) {
      return 'Высокая совместимость с вашей натальной картой. Код резонирует с ключевыми планетами.';
    } else {
      return 'Хорошая совместимость. Код активирует важные дома и аспекты вашей карты.';
    }
  }

  private getVibration(energyLevel: number): string {
    if (energyLevel >= 80) return 'Очень высокая';
    if (energyLevel >= 60) return 'Высокая';
    if (energyLevel >= 40) return 'Средняя';
    if (energyLevel >= 20) return 'Умеренная';
    return 'Спокойная';
  }
}
