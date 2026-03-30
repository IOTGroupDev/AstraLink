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
import {
  AIProvider,
  AIGenerationContext,
  AILocale,
  HoroscopeResponse,
} from './ai/interfaces/ai-types';

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
    const providerPreference =
      this.configService.get<string>('AI_PROVIDER_PREFERENCE') || 'auto';

    // Set primary provider based on preference and availability
    if (providerPreference === 'claude' && this.claudeProvider.isAvailable()) {
      this.primaryProvider = 'claude';
      this.logger.log('🎯 Primary provider: Claude (configured preference)');
    } else if (
      providerPreference === 'openai' &&
      this.openaiProvider.isAvailable()
    ) {
      this.primaryProvider = 'openai';
      this.logger.log('🎯 Primary provider: OpenAI (configured preference)');
    } else if (
      providerPreference === 'deepseek' &&
      this.deepseekProvider.isAvailable()
    ) {
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
  async generateHoroscope(
    context: AIGenerationContext,
  ): Promise<HoroscopeResponse> {
    if (!this.isAvailable()) {
      throw new Error(
        'AI service unavailable - requires API key for Claude, OpenAI or DeepSeek',
      );
    }

    this.logger.log(
      `🤖 Generating PREMIUM horoscope via ${this.primaryProvider.toUpperCase()}`,
    );

    const locale = context.locale ?? 'ru';
    const prompt = this.buildHoroscopePrompt(
      context,
      locale,
      this.primaryProvider,
    );
    let response: string;

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      response = await provider.generate(prompt, undefined, locale);
      return this.parseAIResponse(response, locale);
    } catch (error) {
      this.logger.error(
        `❌ Generation error via ${this.primaryProvider}:`,
        error,
      );

      // 🔄 Automatic fallback to alternative providers
      const availableProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      for (const fallbackProvider of availableProviders) {
        this.logger.log(
          `🔄 Attempting fallback to ${fallbackProvider.toUpperCase()}...`,
        );
        try {
          const provider = this.providers.get(fallbackProvider);
          if (!provider) continue;

          const fallbackPrompt = this.buildHoroscopePrompt(
            context,
            locale,
            fallbackProvider,
          );
          response = await provider.generate(fallbackPrompt, undefined, locale);
          return this.parseAIResponse(response, locale);
        } catch (fallbackError) {
          this.logger.error(
            `❌ Fallback to ${fallbackProvider} also failed:`,
            fallbackError,
          );
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
    locale?: AILocale;
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI service unavailable');
    }

    this.logger.log(
      `🤖 Generating PREMIUM interpretation via ${this.primaryProvider.toUpperCase()}`,
    );

    const locale = context.locale ?? 'ru';
    const prompt = this.buildInterpretationPrompt(context, locale);

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      return await provider.generate(prompt, undefined, locale);
    } catch (error) {
      this.logger.error(
        `❌ Interpretation error via ${this.primaryProvider}:`,
        error,
      );

      // 🔄 Automatic fallback
      const availableProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      for (const fallbackProvider of availableProviders) {
        this.logger.log(
          `🔄 Attempting fallback to ${fallbackProvider.toUpperCase()}...`,
        );
        try {
          const provider = this.providers.get(fallbackProvider);
          if (!provider) continue;

          return await provider.generate(prompt, undefined, locale);
        } catch (fallbackError) {
          this.logger.error(
            `❌ Fallback to ${fallbackProvider} also failed:`,
            fallbackError,
          );
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

    this.logger.log(
      `🌊 Streaming horoscope via ${this.primaryProvider.toUpperCase()}`,
    );

    const locale = context.locale ?? 'ru';
    const prompt = this.buildHoroscopePrompt(
      context,
      locale,
      this.primaryProvider,
    );

    try {
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      yield* provider.stream(prompt, locale);
    } catch (error) {
      this.logger.error(
        `❌ Streaming error via ${this.primaryProvider}:`,
        error,
      );

      // Try one fallback for streaming (no multiple retries for streaming)
      const fallbackProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      if (fallbackProviders.length > 0) {
        const fallbackProvider = fallbackProviders[0];
        this.logger.log(
          `🔄 Streaming fallback to ${fallbackProvider.toUpperCase()}`,
        );

        const provider = this.providers.get(fallbackProvider);
        if (provider) {
          const fallbackPrompt = this.buildHoroscopePrompt(
            context,
            locale,
            fallbackProvider,
          );
          yield* provider.stream(fallbackPrompt, locale);
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

    const locale = context.locale ?? 'ru';
    const prompt = this.buildHoroscopePrompt(context, locale, targetProvider);

    const provider = this.providers.get(targetProvider);
    if (!provider) {
      throw new Error('No AI provider available');
    }

    const response = await provider.generate(prompt, undefined, locale);
    return this.parseAIResponse(response, locale);
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

    const locale = context.locale ?? 'ru';
    const prompt = this.buildHoroscopePrompt(context, locale, targetProvider);

    const provider = this.providers.get(targetProvider);
    if (!provider) {
      throw new Error('No AI provider available');
    }

    yield* provider.stream(prompt, locale);
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
  private buildHoroscopePrompt(
    context: AIGenerationContext,
    locale: AILocale = 'ru',
    provider?: AIProvider,
  ): string {
    const periodText =
      locale === 'en'
        ? {
            day: 'for today',
            tomorrow: 'for tomorrow',
            week: 'for this week',
            month: 'for this month',
          }[context.period] || 'for today'
        : locale === 'es'
          ? {
              day: 'para hoy',
              tomorrow: 'para mañana',
              week: 'para esta semana',
              month: 'para este mes',
            }[context.period] || 'para hoy'
          : {
              day: 'на сегодня',
              tomorrow: 'на завтра',
              week: 'на эту неделю',
              month: 'на этот месяц',
            }[context.period] || 'на сегодня';

    const transitDescription = this.formatTransits(context.transits, locale);
    const isDeepSeek = provider === 'deepseek';

    if (locale === 'en') {
      return isDeepSeek
        ? `Create a deeply personalized PREMIUM horoscope ${periodText} for a person with the following natal chart:

NATAL CHART:
- Sun: ${context.sunSign}
- Moon: ${context.moonSign}
- Ascendant: ${context.ascendant}
- Key aspects: ${this.formatAspects(context.aspects, locale)}

CURRENT TRANSITS:
${transitDescription}

PERIOD: ${context.period}

CRITICALLY IMPORTANT: Respond with ONLY a valid JSON object and no extra text.
LANGUAGE: English only.

JSON format:
{
  "general": "Overall forecast (6-8 sentences, rich and specific)",
  "love": "Love and relationships (5-6 sentences with concrete recommendations)",
  "career": "Career and business (5-6 sentences with practical advice)",
  "health": "Health and energy (5-6 sentences)",
  "finance": "Finance and material matters (5-6 sentences with grounded guidance)",
  "advice": "Main advice (4-5 sentences)",
  "challenges": ["detailed challenge 1-2 sentences", "detailed challenge 1-2 sentences", "detailed challenge 1-2 sentences", "detailed challenge 1-2 sentences"],
  "opportunities": ["specific opportunity 1-2 sentences", "specific opportunity 1-2 sentences", "specific opportunity 1-2 sentences", "specific opportunity 1-2 sentences"]
}

Style and content requirements:
- This is PREMIUM analysis — be as detailed and personalized as possible
- Write warm, human, empathetic prose (avoid robotic phrasing)
- Vary sentence length; avoid repetitive structures and clichés
- Use light imagery where it helps clarity (not purple prose)
- Consider interactions between transits and natal placements
- Be concrete, practical, and realistic
- Keep a positive but honest tone
- Frame challenges as growth opportunities
- Each section must be unique, extended, and substantive
- Target ~800-1100 words total`
        : `Create a personalized PREMIUM horoscope ${periodText} for a person with the following natal chart:

NATAL CHART:
- Sun: ${context.sunSign}
- Moon: ${context.moonSign}
- Ascendant: ${context.ascendant}
- Key aspects: ${this.formatAspects(context.aspects, locale)}

CURRENT TRANSITS:
${transitDescription}

PERIOD: ${context.period}

CRITICALLY IMPORTANT: Respond with ONLY a valid JSON object and no extra text.
LANGUAGE: English only.

JSON format:
{
  "general": "Overall forecast (4-5 sentences with deep analysis)",
  "love": "Love and relationships (3-4 sentences with concrete recommendations)",
  "career": "Career and business (3-4 sentences with practical advice)",
  "health": "Health and energy (3-4 sentences)",
  "finance": "Finance and material matters (3-4 sentences with investment advice)",
  "advice": "Main advice (3-4 sentences)",
  "challenges": ["detailed challenge 1", "detailed challenge 2", "detailed challenge 3"],
  "opportunities": ["specific opportunity 1", "specific opportunity 2", "specific opportunity 3"]
}

Content requirements:
- This is PREMIUM analysis — be as detailed and personalized as possible
- Keep it concise while substantive (target ~500-800 words total)
- Consider interactions between transits and natal planets
- Be concrete and practical
- Provide realistic, actionable advice
- Keep a positive but honest tone
- Frame challenges as growth opportunities
- Each section must be unique, extended, and substantive`;
    }

    if (locale === 'es') {
      return isDeepSeek
        ? `Crea un horóscopo PREMIUM muy personalizado ${periodText} para una persona con la siguiente carta natal:

CARTA NATAL:
- Sol: ${context.sunSign}
- Luna: ${context.moonSign}
- Ascendente: ${context.ascendant}
- Aspectos clave: ${this.formatAspects(context.aspects, locale)}

TRÁNSITOS ACTUALES:
${transitDescription}

PERÍODO: ${context.period}

CRÍTICAMENTE IMPORTANTE: Responde SOLO con un objeto JSON válido y sin texto adicional.
IDIOMA: Español solamente.

Formato JSON:
{
  "general": "Pronóstico general (6-8 frases, rico y específico)",
  "love": "Amor y relaciones (5-6 frases con recomendaciones concretas)",
  "career": "Carrera y negocios (5-6 frases con consejos prácticos)",
  "health": "Salud y energía (5-6 frases)",
  "finance": "Finanzas y lo material (5-6 frases con guía realista)",
  "advice": "Consejo principal (4-5 frases)",
  "challenges": ["desafío detallado 1-2 frases", "desafío detallado 1-2 frases", "desafío detallado 1-2 frases", "desafío detallado 1-2 frases"],
  "opportunities": ["oportunidad concreta 1-2 frases", "oportunidad concreta 1-2 frases", "oportunidad concreta 1-2 frases", "oportunidad concreta 1-2 frases"]
}

Requisitos de estilo y contenido:
- Esto es análisis PREMIUM: sé lo más detallado y personalizado posible
- Escribe de forma cálida, humana y empática (evita frases robóticas)
- Varía la longitud de las frases; evita repeticiones y clichés
- Usa imágenes ligeras solo cuando ayuden a la claridad
- Considera la interacción de los tránsitos con posiciones natales
- Sé concreto, práctico y realista
- Mantén un tono positivo pero honesto
- Formula los desafíos como oportunidades de crecimiento
- Cada sección debe ser única, extensa y sustancial
- Objetivo ~800-1100 palabras`
        : `Crea un horóscopo PREMIUM personalizado ${periodText} para una persona con la siguiente carta natal:

CARTA NATAL:
- Sol: ${context.sunSign}
- Luna: ${context.moonSign}
- Ascendente: ${context.ascendant}
- Aspectos clave: ${this.formatAspects(context.aspects, locale)}

TRÁNSITOS ACTUALES:
${transitDescription}

PERÍODO: ${context.period}

CRÍTICAMENTE IMPORTANTE: Responde SOLO con un objeto JSON válido y sin texto adicional.
IDIOMA: Español solamente.

Formato JSON:
{
  "general": "Pronóstico general (4-5 frases con análisis profundo)",
  "love": "Amor y relaciones (3-4 frases con recomendaciones concretas)",
  "career": "Carrera y negocios (3-4 frases con consejos prácticos)",
  "health": "Salud y energía (3-4 frases)",
  "finance": "Finanzas y lo material (3-4 frases con consejos de inversión)",
  "advice": "Consejo principal (3-4 frases)",
  "challenges": ["desafío detallado 1", "desafío detallado 2", "desafío detallado 3"],
  "opportunities": ["oportunidad concreta 1", "oportunidad concreta 2", "oportunidad concreta 3"]
}

Requisitos de contenido:
- Esto es análisis PREMIUM: sé lo más detallado y personalizado posible
- Sé conciso pero sustancial (objetivo ~500-800 palabras)
- Considera la interacción de los tránsitos con las posiciones natales
- Sé concreto y práctico
- Da consejos realistas y aplicables
- Mantén un tono positivo pero honesto
- Formula los desafíos como oportunidades de crecimiento
- Cada sección debe ser única, extensa y sustancial`;
    }

    return isDeepSeek
      ? `Создайте максимально персонализированный PREMIUM гороскоп ${periodText} для человека со следующей натальной картой:

НАТАЛЬНАЯ КАРТА:
- Солнце: ${context.sunSign}
- Луна: ${context.moonSign}
- Асцендент: ${context.ascendant}
- Ключевые аспекты: ${this.formatAspects(context.aspects, locale)}

ТЕКУЩИЕ ТРАНЗИТЫ:
${transitDescription}

ПЕРИОД: ${context.period}

КРИТИЧЕСКИ ВАЖНО: Ответьте ТОЛЬКО валидным JSON объектом без дополнительного текста.

Формат JSON:
{
  "general": "Общий прогноз (6-8 предложений, подробно и конкретно)",
  "love": "Любовь и отношения (5-6 предложений с конкретными рекомендациями)",
  "career": "Карьера и бизнес (5-6 предложений с практичными советами)",
  "health": "Здоровье и энергия (5-6 предложений)",
  "finance": "Финансы и материальное (5-6 предложений с приземленными советами)",
  "advice": "Главный совет (4-5 предложений)",
  "challenges": ["детальный вызов 1-2 предложения", "детальный вызов 1-2 предложения", "детальный вызов 1-2 предложения", "детальный вызов 1-2 предложения"],
  "opportunities": ["конкретная возможность 1-2 предложения", "конкретная возможность 1-2 предложения", "конкретная возможность 1-2 предложения", "конкретная возможность 1-2 предложения"]
}

Требования к стилю и контенту:
- Это PREMIUM анализ - будьте максимально детальны и персонализированы
- Пишите тепло, по‑человечески, эмпатично (без «роботности»)
- Разнообразьте длину фраз, избегайте повторов и клише
- Легкие образные сравнения допустимы, если помогают ясности
- Учитывайте взаимодействие транзитов с натальными планетами
- Будьте конкретны, практичны и реалистичны
- Сохраняйте позитивный, но честный тон
- Вызовы формулируйте как возможности для роста
- Каждый раздел должен быть уникальным, расширенным и содержательным
- Ориентир ~800-1100 слов`
      : `Создайте персонализированный PREMIUM гороскоп ${periodText} для человека со следующей натальной картой:

НАТАЛЬНАЯ КАРТА:
- Солнце: ${context.sunSign}
- Луна: ${context.moonSign}
- Асцендент: ${context.ascendant}
- Ключевые аспекты: ${this.formatAspects(context.aspects, locale)}

ТЕКУЩИЕ ТРАНЗИТЫ:
${transitDescription}

ПЕРИОД: ${context.period}

КРИТИЧЕСКИ ВАЖНО: Ответьте ТОЛЬКО валидным JSON объектом без дополнительного текста.

Формат JSON:
{
  "general": "Общий прогноз (4-5 предложений с глубоким анализом)",
  "love": "Любовь и отношения (3-4 предложения с конкретными рекомендациями)",
  "career": "Карьера и бизнес (3-4 предложения с практичными советами)",
  "health": "Здоровье и энергия (3-4 предложения)",
  "finance": "Финансы и материальное (3-4 предложения с инвестиционными советами)",
  "advice": "Главный совет (3-4 предложения)",
  "challenges": ["детальный вызов 1", "детальный вызов 2", "детальный вызов 3"],
  "opportunities": ["конкретная возможность 1", "конкретная возможность 2", "конкретная возможность 3"]
}

Требования к контенту:
- Это PREMIUM анализ - будьте максимально детальны и персонализированы
- Будьте лаконичны, но содержательны (ориентир ~500-800 слов)
- Учитывайте взаимодействие транзитов с натальными планетами
- Будьте конкретны и практичны
- Давайте реалистичные, применимые советы
- Сохраняйте позитивный но честный тон
- Вызовы формулируйте как возможности для роста
- Каждый раздел должен быть уникальным, расширенным и содержательным`;
  }

  /**
   * Build chart interpretation prompt
   */
  private buildInterpretationPrompt(
    context: {
      planets: any;
      houses: any;
      aspects: any[];
      userProfile?: any;
    },
    locale: AILocale = 'ru',
  ): string {
    const planetsDesc = this.formatPlanets(context.planets, locale);
    const housesDesc = this.formatHouses(context.houses, locale);
    const aspectsDesc = this.formatAspects(context.aspects, locale);

    if (locale === 'en') {
      return `Create a deep psychological interpretation of the natal chart.
LANGUAGE: English only.

PLANETS:
${planetsDesc}

HOUSES:
${housesDesc}

ASPECTS:
${aspectsDesc}

Create a detailed interpretation (3-5 paragraphs) covering:
1. Core personality traits
2. Talents and strengths
3. Challenges and growth areas
4. Life themes and patterns
5. Recommendations for development

Style: Psychological, supportive, practical. Focus on opportunities, not limitations.`;
    }

    if (locale === 'es') {
      return `Crea una interpretación psicológica profunda de la carta natal.
IDIOMA: Español solamente.

PLANETAS:
${planetsDesc}

CASAS:
${housesDesc}

ASPECTOS:
${aspectsDesc}

Crea una interpretación detallada (3-5 párrafos) que cubra:
1. Rasgos clave de la personalidad
2. Talentos y fortalezas
3. Desafíos y áreas de crecimiento
4. Temas y patrones de vida
5. Recomendaciones para el desarrollo

Estilo: psicológico, de apoyo y práctico. Enfócate en oportunidades, no en limitaciones.`;
    }

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
  private parseAIResponse(
    response: string,
    locale: AILocale = 'ru',
  ): HoroscopeResponse {
    try {
      const cleaned = this.stripCodeFences(response).trim();
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
        const extracted = this.extractJsonObject(response);
        if (extracted) return JSON.parse(extracted);
      } catch (regexError) {
        this.logger.error('Regex extraction also failed:', regexError);
      }

      // Final fallback to text parsing
      return this.parseTextResponse(response, locale);
    }
  }

  /**
   * Parse text response as fallback
   */
  private parseTextResponse(
    response: string,
    locale: AILocale = 'ru',
  ): HoroscopeResponse {
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
    if (locale === 'en') {
      const generalMatch = response.match(
        /general.*?(?=love|career|health|finance|advice|$)/is,
      );
      if (generalMatch) sections.general = generalMatch[0].trim();

      const loveMatch = response.match(/love.*?(?=career|health|$)/is);
      if (loveMatch) sections.love = loveMatch[0].trim();

      const careerMatch = response.match(/career.*?(?=health|finance|$)/is);
      if (careerMatch) sections.career = careerMatch[0].trim();

      const healthMatch = response.match(/health.*?(?=finance|advice|$)/is);
      if (healthMatch) sections.health = healthMatch[0].trim();

      const financeMatch = response.match(/finance.*?(?=advice|challenge|$)/is);
      if (financeMatch) sections.finance = financeMatch[0].trim();

      const adviceMatch = response.match(
        /advice.*?(?=challenge|opportunit|$)/is,
      );
      if (adviceMatch) sections.advice = adviceMatch[0].trim();

      return sections;
    }

    if (locale === 'es') {
      const generalMatch = response.match(
        /general.*?(?=amor|carrera|salud|finanzas|consejo|$)/is,
      );
      if (generalMatch) sections.general = generalMatch[0].trim();

      const loveMatch = response.match(/amor.*?(?=carrera|salud|$)/is);
      if (loveMatch) sections.love = loveMatch[0].trim();

      const careerMatch = response.match(/carrera.*?(?=salud|finanzas|$)/is);
      if (careerMatch) sections.career = careerMatch[0].trim();

      const healthMatch = response.match(/salud.*?(?=finanzas|consejo|$)/is);
      if (healthMatch) sections.health = healthMatch[0].trim();

      const financeMatch = response.match(
        /finanzas.*?(?=consejo|desaf[ií]o|$)/is,
      );
      if (financeMatch) sections.finance = financeMatch[0].trim();

      const adviceMatch = response.match(
        /consejo.*?(?=desaf[ií]o|oportun|$)/is,
      );
      if (adviceMatch) sections.advice = adviceMatch[0].trim();

      return sections;
    }

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

  private stripCodeFences(input: string): string {
    const trimmed = input.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  private extractJsonObject(input: string): string | null {
    const text = this.stripCodeFences(input);
    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaping = false;

    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (ch === '\\') {
          escaping = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          return text.slice(start, i + 1);
        }
      }
    }

    return null;
  }

  /**
   * Format transits for prompt
   */
  private formatTransits(transits: any[], locale: AILocale = 'ru'): string {
    if (!transits || transits.length === 0) {
      return locale === 'en'
        ? 'No significant transits'
        : locale === 'es'
          ? 'No hay tránsitos significativos'
          : 'Нет значимых транзитов';
    }

    return transits
      .slice(0, 5)
      .map((t) => {
        const planet = this.getPlanetName(t.transitPlanet, locale);
        const aspect = this.getAspectName(t.aspect, locale);
        const natal = this.getPlanetName(t.natalPlanet, locale);
        const strength = Math.round(t.strength * 100);
        if (locale === 'en') {
          return `- ${planet} ${aspect} natal ${natal} (strength: ${strength}%)`;
        }
        if (locale === 'es') {
          return `- ${planet} ${aspect} natal ${natal} (fuerza: ${strength}%)`;
        }
        return `- ${planet} ${aspect} натальный ${natal} (сила: ${strength}%)`;
      })
      .join('\n');
  }

  /**
   * Format aspects for prompt
   */
  private formatAspects(aspects: any[], locale: AILocale = 'ru'): string {
    if (!aspects || aspects.length === 0) {
      return locale === 'en'
        ? 'No major aspects'
        : locale === 'es'
          ? 'No hay aspectos principales'
          : 'Нет основных аспектов';
    }

    return aspects
      .slice(0, 5)
      .map((a) => {
        return `${this.getPlanetName(a.planetA, locale)} ${this.getAspectName(a.aspect, locale)} ${this.getPlanetName(a.planetB, locale)}`;
      })
      .join(', ');
  }

  /**
   * Format planets for prompt
   */
  private formatPlanets(planets: any, locale: AILocale = 'ru'): string {
    if (!planets) {
      return locale === 'en'
        ? 'Planet data is missing'
        : locale === 'es'
          ? 'No hay datos de planetas'
          : 'Данные о планетах отсутствуют';
    }

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
        const fallbackSign =
          locale === 'en'
            ? 'unknown'
            : locale === 'es'
              ? 'desconocido'
              : 'неизвестно';
        return `${this.getPlanetName(key, locale)}: ${planet.sign || fallbackSign}`;
      })
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Format houses for prompt
   */
  private formatHouses(houses: any, locale: AILocale = 'ru'): string {
    if (!houses) {
      return locale === 'en'
        ? 'House data is missing'
        : locale === 'es'
          ? 'No hay datos de casas'
          : 'Данные о домах отсутствуют';
    }

    // Format first 12 houses
    return Object.entries(houses)
      .slice(0, 12)
      .map(([key, house]: [string, any]) => {
        const label =
          locale === 'en' ? 'House' : locale === 'es' ? 'Casa' : 'Дом';
        const fallbackSign =
          locale === 'en'
            ? 'unknown'
            : locale === 'es'
              ? 'desconocido'
              : 'неизвестно';
        return `${label} ${key}: ${house.sign || fallbackSign}`;
      })
      .join(', ');
  }

  /**
   * Get planet display name
   */
  private getPlanetName(planet: string, locale: AILocale = 'ru'): string {
    const dict: Record<AILocale, Record<string, string>> = {
      ru: {
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
      },
      en: {
        sun: 'Sun',
        moon: 'Moon',
        mercury: 'Mercury',
        venus: 'Venus',
        mars: 'Mars',
        jupiter: 'Jupiter',
        saturn: 'Saturn',
        uranus: 'Uranus',
        neptune: 'Neptune',
        pluto: 'Pluto',
        northNode: 'North Node',
        southNode: 'South Node',
        chiron: 'Chiron',
      },
      es: {
        sun: 'Sol',
        moon: 'Luna',
        mercury: 'Mercurio',
        venus: 'Venus',
        mars: 'Marte',
        jupiter: 'Júpiter',
        saturn: 'Saturno',
        uranus: 'Urano',
        neptune: 'Neptuno',
        pluto: 'Plutón',
        northNode: 'Nodo Norte',
        southNode: 'Nodo Sur',
        chiron: 'Quirón',
      },
    };
    return dict[locale][planet] || planet;
  }

  /**
   * Get aspect display name
   */
  private getAspectName(aspect: string, locale: AILocale = 'ru'): string {
    const names: Record<AILocale, Record<string, string>> = {
      ru: {
        conjunction: 'соединение с',
        opposition: 'оппозиция к',
        trine: 'трин к',
        square: 'квадрат к',
        sextile: 'секстиль к',
      },
      en: {
        conjunction: 'conjunct',
        opposition: 'opposed to',
        trine: 'trine',
        square: 'square',
        sextile: 'sextile',
      },
      es: {
        conjunction: 'en conjunción con',
        opposition: 'en oposición a',
        trine: 'en trígono con',
        square: 'en cuadratura con',
        sextile: 'en sextil con',
      },
    };
    return names[locale][aspect] || aspect;
  }

  /**
   * Universal text generation method with automatic fallback
   * Can be used for any AI generation task
   */
  async generateText(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
    locale: AILocale = 'ru',
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI service unavailable');
    }

    this.logger.log(
      `🤖 Generating text via ${this.primaryProvider.toUpperCase()}`,
    );

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      return await provider.generate(prompt, undefined, locale);
    } catch (error) {
      this.logger.error(
        `❌ Text generation error via ${this.primaryProvider}:`,
        error,
      );

      // 🔄 Automatic fallback to alternative providers
      const availableProviders = this.getAvailableProviders().filter(
        (p) => p !== this.primaryProvider,
      );

      for (const fallbackProvider of availableProviders) {
        this.logger.log(
          `🔄 Attempting fallback to ${fallbackProvider.toUpperCase()}...`,
        );
        try {
          const provider = this.providers.get(fallbackProvider);
          if (!provider) continue;

          return await provider.generate(prompt, undefined, locale);
        } catch (fallbackError) {
          this.logger.error(
            `❌ Fallback to ${fallbackProvider} also failed:`,
            fallbackError,
          );
        }
      }

      throw error;
    }
  }
}
