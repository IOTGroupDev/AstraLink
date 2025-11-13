/**
 * AI Service (Refactored with Strategy Pattern)
 * Facade for AI providers using dependency injection
 *
 * ARCHITECTURE:
 * - Strategy Pattern: ClaudeProvider, OpenAIProvider, DeepSeekProvider
 * - Dependency Injection: Providers injected via constructor
 * - Separation of Concerns: Business logic vs API calls
 * - Fallback Support: Automatic provider switching on failures
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClaudeProvider } from './ai/providers/claude.provider';
import { OpenAIProvider } from './ai/providers/openai.provider';
import { DeepSeekProvider } from './ai/providers/deepseek.provider';
import { IAIProvider } from './ai/interfaces/ai-provider.interface';
import { AIProvider, AIGenerationContext, HoroscopeResponse } from './ai/interfaces/ai-types';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private providers: Map<AIProvider, IAIProvider>;
  private primaryProvider: AIProvider = 'none';

  constructor(
    private configService: ConfigService,
    private claudeProvider: ClaudeProvider,
    private openaiProvider: OpenAIProvider,
    private deepseekProvider: DeepSeekProvider,
  ) {
    this.providers = new Map();
    this.initializeProviders();
  }

  /**
   * Initialize provider map and determine primary provider
   */
  private initializeProviders(): void {
    // Register all providers
    this.providers.set('claude', this.claudeProvider);
    this.providers.set('openai', this.openaiProvider);
    this.providers.set('deepseek', this.deepseekProvider);

    // Get provider preference from config
    const providerPreference = this.configService.get<string>('AI_PROVIDER_PREFERENCE') || 'auto';

    // Set primary provider based on preference and availability
    if (providerPreference === 'claude' && this.claudeProvider.isAvailable()) {
      this.primaryProvider = 'claude';
      this.logger.log('🎯 Primary provider: Claude (configured preference)');
    } else if (providerPreference === 'openai' && this.openaiProvider.isAvailable()) {
      this.primaryProvider = 'openai';
      this.logger.log('🎯 Primary provider: OpenAI (configured preference)');
    } else if (providerPreference === 'deepseek' && this.deepseekProvider.isAvailable()) {
      this.primaryProvider = 'deepseek';
      this.logger.log('🎯 Primary provider: DeepSeek (configured preference)');
    } else {
      // Auto-select first available provider (prefer Claude > OpenAI > DeepSeek)
      if (this.claudeProvider.isAvailable()) {
        this.primaryProvider = 'claude';
        this.logger.log('🎯 Primary provider: Claude (auto-selected)');
      } else if (this.openaiProvider.isAvailable()) {
        this.primaryProvider = 'openai';
        this.logger.log('🎯 Primary provider: OpenAI (auto-selected)');
      } else if (this.deepseekProvider.isAvailable()) {
        this.primaryProvider = 'deepseek';
        this.logger.log('🎯 Primary provider: DeepSeek (auto-selected)');
      } else {
        this.logger.warn('⚠️  No AI providers available');
      }
    }

    // Log available providers
    const availableCount = this.getAvailableProviders().length;
    if (availableCount > 1) {
      this.logger.log(
        `✅ Multiple AI providers available (${availableCount}): ${this.getAvailableProviders().join(', ')}`,
      );
      this.logger.log('🔄 Automatic fallback enabled');
    }
  }

  /**
   * Generate personalized horoscope with automatic fallback (PREMIUM ONLY)
   */
  async generateHoroscope(context: AIGenerationContext): Promise<HoroscopeResponse> {
    if (!this.isAvailable()) {
      throw new Error('AI service unavailable - requires API key for Claude, OpenAI or DeepSeek');
    }

    this.logger.log(`🤖 Generating PREMIUM horoscope via ${this.primaryProvider.toUpperCase()}`);

    const prompt = this.buildHoroscopePrompt(context);
    let response: string;

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      response = await provider.generate(prompt);
      return this.parseAIResponse(response);
    } catch (error) {
      this.logger.error(`❌ Generation error via ${this.primaryProvider}:`, error);

      // 🔄 Automatic fallback to alternative providers
      const availableProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      for (const fallbackProvider of availableProviders) {
        this.logger.log(`🔄 Attempting fallback to ${fallbackProvider.toUpperCase()}...`);
        try {
          const provider = this.providers.get(fallbackProvider);
          if (!provider) continue;

          response = await provider.generate(prompt);
          return this.parseAIResponse(response);
        } catch (fallbackError) {
          this.logger.error(`❌ Fallback to ${fallbackProvider} also failed:`, fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Generate detailed natal chart interpretation with automatic fallback (PREMIUM ONLY)
   */
  async generateChartInterpretation(context: {
    planets: any;
    houses: any;
    aspects: any[];
    userProfile?: any;
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI service unavailable');
    }

    this.logger.log(
      `🤖 Generating PREMIUM interpretation via ${this.primaryProvider.toUpperCase()}`,
    );

    const prompt = this.buildInterpretationPrompt(context);

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      return await provider.generate(prompt);
    } catch (error) {
      this.logger.error(`❌ Interpretation error via ${this.primaryProvider}:`, error);

      // 🔄 Automatic fallback
      const availableProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      for (const fallbackProvider of availableProviders) {
        this.logger.log(`🔄 Attempting fallback to ${fallbackProvider.toUpperCase()}...`);
        try {
          const provider = this.providers.get(fallbackProvider);
          if (!provider) continue;

          return await provider.generate(prompt);
        } catch (fallbackError) {
          this.logger.error(`❌ Fallback to ${fallbackProvider} also failed:`, fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Stream horoscope generation
   */
  async *generateHoroscopeStream(
    context: AIGenerationContext,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error('AI service unavailable');
    }

    this.logger.log(`🌊 Streaming horoscope via ${this.primaryProvider.toUpperCase()}`);

    const prompt = this.buildHoroscopePrompt(context);

    try {
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      yield* provider.stream(prompt);
    } catch (error) {
      this.logger.error(`❌ Streaming error via ${this.primaryProvider}:`, error);

      // Try one fallback for streaming (no multiple retries for streaming)
      const fallbackProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      if (fallbackProviders.length > 0) {
        const fallbackProvider = fallbackProviders[0];
        this.logger.log(`🔄 Streaming fallback to ${fallbackProvider.toUpperCase()}`);

        const provider = this.providers.get(fallbackProvider);
        if (provider) {
          yield* provider.stream(prompt);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Generate horoscope with specific provider (no fallback)
   */
  async generateHoroscopeWithProvider(
    context: AIGenerationContext,
    preferredProvider?: AIProvider,
  ): Promise<HoroscopeResponse> {
    // Validate preferred provider
    if (preferredProvider && !this.isProviderAvailable(preferredProvider)) {
      throw new Error(
        `Provider ${preferredProvider} unavailable. Available: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    const targetProvider = preferredProvider || this.primaryProvider;

    this.logger.log(
      `🤖 Generating horoscope via ${targetProvider.toUpperCase()} (${preferredProvider ? 'user-selected' : 'default'})`,
    );

    const prompt = this.buildHoroscopePrompt(context);

    const provider = this.providers.get(targetProvider);
    if (!provider) {
      throw new Error('No AI provider available');
    }

    const response = await provider.generate(prompt);
    return this.parseAIResponse(response);
  }

  /**
   * Stream horoscope generation with specific provider (no fallback)
   */
  async *generateHoroscopeStreamWithProvider(
    context: AIGenerationContext,
    preferredProvider?: AIProvider,
  ): AsyncGenerator<string, void, unknown> {
    if (preferredProvider && !this.isProviderAvailable(preferredProvider)) {
      throw new Error(
        `Provider ${preferredProvider} unavailable. Available: ${this.getAvailableProviders().join(', ')}`,
      );
    }

    const targetProvider = preferredProvider || this.primaryProvider;

    this.logger.log(
      `🌊 Streaming via ${targetProvider.toUpperCase()} (${preferredProvider ? 'user-selected' : 'default'})`,
    );

    const prompt = this.buildHoroscopePrompt(context);

    const provider = this.providers.get(targetProvider);
    if (!provider) {
      throw new Error('No AI provider available');
    }

    yield* provider.stream(prompt);
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return this.primaryProvider !== 'none';
  }

  /**
   * Get current primary provider
   */
  getCurrentProvider(): AIProvider {
    return this.primaryProvider;
  }

  /**
   * Get list of all available providers
   */
  getAvailableProviders(): AIProvider[] {
    const available: AIProvider[] = [];
    if (this.claudeProvider.isAvailable()) available.push('claude');
    if (this.openaiProvider.isAvailable()) available.push('openai');
    if (this.deepseekProvider.isAvailable()) available.push('deepseek');
    return available;
  }

  /**
   * Check if specific provider is available
   */
  isProviderAvailable(provider: AIProvider): boolean {
    if (provider === 'none') return false;
    const p = this.providers.get(provider);
    return p ? p.isAvailable() : false;
  }

  /**
   * Get current provider (alias for getCurrentProvider)
   */
  getProvider(): AIProvider {
    return this.getCurrentProvider();
  }

  // ============================================================
  // PROMPT BUILDING & PARSING (Business Logic)
  // ============================================================

  /**
   * Build horoscope generation prompt
   */
  private buildHoroscopePrompt(context: AIGenerationContext): string {
    const periodText =
      {
        day: 'на сегодня',
        tomorrow: 'на завтра',
        week: 'на эту неделю',
        month: 'на этот месяц',
      }[context.period] || 'на сегодня';

    const transitDescription = this.formatTransits(context.transits);

    return `Создайте персонализированный PREMIUM гороскоп ${periodText} для человека со следующей натальной картой:

НАТАЛЬНАЯ КАРТА:
- Солнце: ${context.sunSign}
- Луна: ${context.moonSign}
- Асцендент: ${context.ascendant}
- Ключевые аспекты: ${this.formatAspects(context.aspects)}

ТЕКУЩИЕ ТРАНЗИТЫ:
${transitDescription}

ПЕРИОД: ${context.period}

КРИТИЧЕСКИ ВАЖНО: Ответьте ТОЛЬКО валидным JSON объектом без дополнительного текста.

Формат JSON:
{
  "general": "Общий прогноз (3-4 предложения с глубоким анализом)",
  "love": "Любовь и отношения (3-4 предложения с конкретными рекомендациями)",
  "career": "Карьера и бизнес (3-4 предложения с практичными советами)",
  "health": "Здоровье и энергия (2-3 предложения)",
  "finance": "Финансы и материальное (3-4 предложения с инвестиционными советами)",
  "advice": "Главный совет (2-3 предложения)",
  "challenges": ["детальный вызов 1", "детальный вызов 2", "детальный вызов 3"],
  "opportunities": ["конкретная возможность 1", "конкретная возможность 2", "конкретная возможность 3"]
}

Требования к контенту:
- Это PREMIUM анализ - будьте максимально детальны и персонализированы
- Учитывайте взаимодействие транзитов с натальными планетами
- Будьте конкретны и практичны
- Давайте реалистичные, применимые советы
- Сохраняйте позитивный но честный тон
- Вызовы формулируйте как возможности для роста
- Каждый раздел должен быть уникальным и содержательным`;
  }

  /**
   * Build chart interpretation prompt
   */
  private buildInterpretationPrompt(context: {
    planets: any;
    houses: any;
    aspects: any[];
    userProfile?: any;
  }): string {
    const planetsDesc = this.formatPlanets(context.planets);
    const housesDesc = this.formatHouses(context.houses);
    const aspectsDesc = this.formatAspects(context.aspects);

    return `Создайте глубокую психологическую интерпретацию натальной карты.

ПЛАНЕТЫ:
${planetsDesc}

ДОМА:
${housesDesc}

АСПЕКТЫ:
${aspectsDesc}

Создайте детальную интерпретацию (3-5 абзацев), охватывающую:
1. Ключевые черты личности
2. Таланты и сильные стороны
3. Вызовы и области роста
4. Жизненные темы и паттерны
5. Рекомендации для развития

Стиль: Психологический, поддерживающий, практичный. Фокус на возможностях, а не ограничениях.`;
  }

  /**
   * Parse AI response to HoroscopeResponse object
   */
  private parseAIResponse(response: string): HoroscopeResponse {
    try {
      const cleaned = response.trim();
      const parsed = JSON.parse(cleaned);

      // Validate required fields
      const requiredFields = [
        'general',
        'love',
        'career',
        'health',
        'finance',
        'advice',
        'challenges',
        'opportunities',
      ];

      for (const field of requiredFields) {
        if (!parsed[field]) {
          this.logger.warn(`Missing field in AI response: ${field}`);
        }
      }

      return parsed;
    } catch (error) {
      this.logger.error('JSON parsing failed, attempting text parsing:', error);

      // Fallback to regex extraction if JSON parsing fails
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (regexError) {
        this.logger.error('Regex extraction also failed:', regexError);
      }

      // Final fallback to text parsing
      return this.parseTextResponse(response);
    }
  }

  /**
   * Parse text response as fallback
   */
  private parseTextResponse(response: string): HoroscopeResponse {
    const sections: HoroscopeResponse = {
      general: '',
      love: '',
      career: '',
      health: '',
      finance: '',
      advice: '',
      challenges: [],
      opportunities: [],
    };

    // Simple keyword-based parsing
    const generalMatch = response.match(/общ[ий|ее].*?(?=любовь|карьер|$)/is);
    if (generalMatch) sections.general = generalMatch[0].trim();

    const loveMatch = response.match(/любовь.*?(?=карьер|здоровье|$)/is);
    if (loveMatch) sections.love = loveMatch[0].trim();

    const careerMatch = response.match(/карьер.*?(?=здоровье|финансы|$)/is);
    if (careerMatch) sections.career = careerMatch[0].trim();

    const healthMatch = response.match(/здоровье.*?(?=финансы|совет|$)/is);
    if (healthMatch) sections.health = healthMatch[0].trim();

    const financeMatch = response.match(/финансы.*?(?=совет|вызов|$)/is);
    if (financeMatch) sections.finance = financeMatch[0].trim();

    const adviceMatch = response.match(/совет.*?(?=вызов|возможност|$)/is);
    if (adviceMatch) sections.advice = adviceMatch[0].trim();

    return sections;
  }

  /**
   * Format transits for prompt
   */
  private formatTransits(transits: any[]): string {
    if (!transits || transits.length === 0) {
      return 'Нет значимых транзитов';
    }

    return transits
      .slice(0, 5)
      .map((t) => {
        return `- ${this.getPlanetName(t.transitPlanet)} ${this.getAspectName(t.aspect)} натальный ${this.getPlanetName(t.natalPlanet)} (сила: ${Math.round(t.strength * 100)}%)`;
      })
      .join('\n');
  }

  /**
   * Format aspects for prompt
   */
  private formatAspects(aspects: any[]): string {
    if (!aspects || aspects.length === 0) {
      return 'Нет основных аспектов';
    }

    return aspects
      .slice(0, 5)
      .map((a) => {
        return `${this.getPlanetName(a.planetA)} ${this.getAspectName(a.aspect)} ${this.getPlanetName(a.planetB)}`;
      })
      .join(', ');
  }

  /**
   * Format planets for prompt
   */
  private formatPlanets(planets: any): string {
    if (!planets) return 'Данные о планетах отсутствуют';

    const planetList = [
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
    ];

    return planetList
      .map((key) => {
        const planet = planets[key];
        if (!planet) return null;
        return `${this.getPlanetName(key)}: ${planet.sign || 'неизвестно'}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Format houses for prompt
   */
  private formatHouses(houses: any): string {
    if (!houses) return 'Данные о домах отсутствуют';

    // Format first 12 houses
    return Object.entries(houses)
      .slice(0, 12)
      .map(([key, house]: [string, any]) => {
        return `Дом ${key}: ${house.sign || 'неизвестно'}`;
      })
      .join(', ');
  }

  /**
   * Get planet display name
   */
  private getPlanetName(planet: string): string {
    const names: Record<string, string> = {
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
      northNode: 'Северный Узел',
      southNode: 'Южный Узел',
      chiron: 'Хирон',
    };
    return names[planet] || planet;
  }

  /**
   * Get aspect display name
   */
  private getAspectName(aspect: string): string {
    const names: Record<string, string> = {
      conjunction: 'соединение с',
      opposition: 'оппозиция к',
      trine: 'трин к',
      square: 'квадрат к',
      sextile: 'секстиль к',
    };
    return names[aspect] || aspect;
  }
}
