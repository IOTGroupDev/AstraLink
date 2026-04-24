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
  AIGenerateOptions,
  AIGenerationContext,
  AILocale,
  HoroscopeResponse,
} from './ai/interfaces/ai-types';
import { getSignNameLocalized } from '../modules/shared/astro-text';
import type { Sign } from '../modules/shared/astro-text/types';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly horoscopeRequestTimeoutMs = 10500;
  private providers: Map<AIProvider, IAIProvider>;
  private primaryProvider: AIProvider = 'none';
  private readonly preferredNarrativeKeys = [
    'summary',
    'overview',
    'text',
    'message',
    'forecast',
    'interpretation',
    'insight',
    'narrative',
    'guidance',
    'focus',
    'main',
    'description',
  ] as const;

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
    const providerOptions = this.getHoroscopeGenerationOptions(
      this.primaryProvider,
    );

    try {
      // Try primary provider
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      response = await provider.generate(prompt, 1, locale, providerOptions);
      return this.parseAIResponse(response, locale);
    } catch (error) {
      this.logger.error(
        `❌ Generation error via ${this.primaryProvider}:`,
        error,
      );

      if (this.isTimeoutLikeError(error)) {
        throw error;
      }

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
          response = await provider.generate(
            fallbackPrompt,
            1,
            locale,
            this.getHoroscopeGenerationOptions(fallbackProvider),
          );
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
    ascendant?: { sign?: string; degree?: number; longitude?: number } | string;
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
    const dailyContextDescription = context.dailyContext
      ? locale === 'en'
        ? `DAILY CONTEXT:
- Overall energy: ${context.dailyContext.energy}/100
- Day tone: ${context.dailyContext.tone}
- Main synthesis: ${context.dailyContext.summary}
- Biorhythms: ${context.dailyContext.biorhythmSummary}
- Lunar context: ${context.dailyContext.lunarSummary}
- Main transit anchor: ${context.dailyContext.mainTransitSummary}`
        : locale === 'es'
          ? `CONTEXTO DIARIO:
- Energía general: ${context.dailyContext.energy}/100
- Tono del día: ${context.dailyContext.tone}
- Síntesis principal: ${context.dailyContext.summary}
- Biorritmos: ${context.dailyContext.biorhythmSummary}
- Contexto lunar: ${context.dailyContext.lunarSummary}
- Tránsito principal: ${context.dailyContext.mainTransitSummary}`
          : `ДНЕВНОЙ КОНТЕКСТ:
- Общая энергия: ${context.dailyContext.energy}/100
- Тон дня: ${context.dailyContext.tone}
- Главный синтез: ${context.dailyContext.summary}
- Биоритмы: ${context.dailyContext.biorhythmSummary}
- Лунный контекст: ${context.dailyContext.lunarSummary}
- Главный транзит: ${context.dailyContext.mainTransitSummary}`
      : locale === 'en'
        ? 'DAILY CONTEXT: not available.'
        : locale === 'es'
          ? 'CONTEXTO DIARIO: no disponible.'
          : 'ДНЕВНОЙ КОНТЕКСТ: недоступен.';
    const isDeepSeek = provider === 'deepseek';
    const actionabilityLine =
      locale === 'en'
        ? 'In advice, clearly state what to do during this period and what is better to avoid.'
        : locale === 'es'
          ? 'En el consejo, indica claramente qué conviene hacer durante este período y qué es mejor evitar.'
          : 'В совете ясно укажите, что стоит делать в этот период, а чего лучше избегать.';
    const opportunitiesLine =
      locale === 'en'
        ? 'Treat "opportunities" as concrete actions or openings worth leaning into.'
        : locale === 'es'
          ? 'Trata "opportunities" como acciones concretas u oportunidades reales en las que conviene apoyarse.'
          : 'Поле "opportunities" трактуйте как конкретные действия и реальные возможности, на которые стоит опереться.';
    const challengesLine =
      locale === 'en'
        ? 'Treat "challenges" as specific risks, triggers, mistakes, or actions better avoided.'
        : locale === 'es'
          ? 'Trata "challenges" como riesgos concretos, disparadores, errores o acciones que conviene evitar.'
          : 'Поле "challenges" трактуйте как конкретные риски, триггеры, ошибки и действия, которых лучше не делать.';
    const humanVoiceLine =
      locale === 'en'
        ? 'Write as if you are speaking to one real person: natural, emotionally intelligent, observant, and alive.'
        : locale === 'es'
          ? 'Escribe como si hablaras con una persona real: natural, emocionalmente inteligente, observador y vivo.'
          : 'Пишите так, как будто обращаетесь к одному реальному человеку: естественно, внимательно, живо и психологически точно.';
    const antiTemplateLine =
      locale === 'en'
        ? 'Avoid canned coaching phrases, generic encouragement, and section-opening formulas that make the text feel templated.'
        : locale === 'es'
          ? 'Evita frases prefabricadas de coaching, ánimo genérico y fórmulas de apertura que hagan que el texto suene a plantilla.'
          : 'Избегайте заготовленных коучинговых фраз, общего ободрения и одинаковых вступительных формул, из-за которых текст звучит как шаблон.';
    const flowLine =
      locale === 'en'
        ? 'Let each section read like flowing prose, not like disconnected mini-summaries.'
        : locale === 'es'
          ? 'Haz que cada sección se lea como prosa fluida, no como mini-resúmenes desconectados.'
          : 'Пусть каждый раздел читается как живая связная речь, а не как набор разрозненных мини-выводов.';
    const specificityLine =
      locale === 'en'
        ? 'Use specific emotional and situational language instead of abstract astrology jargon whenever possible.'
        : locale === 'es'
          ? 'Usa lenguaje emocional y situacional específico en lugar de jerga astrológica abstracta siempre que sea posible.'
          : 'По возможности используйте конкретный эмоциональный и жизненный язык вместо абстрактного астрологического жаргона.';
    const generalSummaryLine =
      locale === 'en'
        ? 'The "general" field must be a holistic summary of the entire period: one integrated narrative about the mood, trajectory, and main theme. Do not retell love, career, health, finance, and advice one by one.'
        : locale === 'es'
          ? 'El campo "general" debe ser un resumen integral de todo el período: una sola narrativa sobre el tono, la trayectoria y el tema principal. No repitas amor, carrera, salud, finanzas y consejo uno por uno.'
          : 'Поле "general" должно быть цельным резюме всего периода: одной связной сводкой про настроение, динамику и главную тему. Не пересказывайте по очереди любовь, карьеру, здоровье, финансы и советы.';
    const plainJsonValuesLine =
      locale === 'en'
        ? 'Every JSON value for general, love, career, health, finance, and advice must be plain human prose. Never return nested objects, key-value maps, labels like "general:", or mini-JSON inside a field.'
        : locale === 'es'
          ? 'Cada valor JSON de general, amor, carrera, salud, finanzas y consejo debe ser prosa humana normal. Nunca devuelvas objetos anidados, mapas clave-valor, etiquetas como "general:" ni mini-JSON dentro de un campo.'
          : 'Каждое JSON-значение для general, love, career, health, finance и advice должно быть обычным человеческим текстом. Нельзя возвращать вложенные объекты, пары ключ-значение, подписи вида "general:" или мини-JSON внутри поля.';
    const consistencyLine =
      locale === 'en'
        ? 'Do not contradict the daily context. If transits are active but energy reserve is low, describe the day as selective and paced, not universally high-energy.'
        : locale === 'es'
          ? 'No contradigas el contexto diario. Si los tránsitos están activos pero la reserva de energía es baja, describe el día como selectivo y dosificado, no como de energía universalmente alta.'
          : 'Не противоречьте дневному контексту. Если транзиты активны, но запас энергии низкий, описывайте день как требующий точности и дозировки, а не как безусловно «энергичный».';

    if (locale === 'en') {
      return isDeepSeek
        ? `Create a concise but deeply personalized PREMIUM horoscope ${periodText} for a person with the following natal chart:

NATAL CHART:
- Sun: ${context.sunSign}
- Moon: ${context.moonSign}
- Ascendant: ${context.ascendant}
- Key aspects: ${this.formatAspects(context.aspects, locale)}

CURRENT TRANSITS:
${transitDescription}

${dailyContextDescription}

PERIOD: ${context.period}

CRITICALLY IMPORTANT: Respond with ONLY a valid JSON object and no extra text.
LANGUAGE: English only.

JSON format:
{
  "general": "Holistic summary of the whole period (2-3 sentences, specific and human)",
  "love": "Love and relationships (1-2 sentences with concrete recommendations)",
  "career": "Career and business (1-2 sentences with practical advice)",
  "health": "Health and energy (1-2 sentences)",
  "finance": "Finance and material matters (1-2 sentences with grounded guidance)",
  "advice": "Main advice (1-2 sentences that explicitly say what to do and what to avoid)",
  "challenges": ["specific risk 1", "specific risk 2"],
  "opportunities": ["specific action 1", "specific action 2"]
}

Style and content requirements:
- This is PREMIUM analysis — be highly personalized within a compact format
- Write warm, human, empathetic prose (avoid robotic phrasing)
- ${humanVoiceLine}
- Consider interactions between transits and natal placements
- Be concrete, practical, and realistic
- Keep a positive but honest tone
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
- Keep each field compact; avoid long introductions and repetition
- Target ~220-320 words total
- Do not exceed 3 sentences in "general"
- Do not exceed 2 sentences in any other prose field`
        : `Create a personalized PREMIUM horoscope ${periodText} for a person with the following natal chart:

NATAL CHART:
- Sun: ${context.sunSign}
- Moon: ${context.moonSign}
- Ascendant: ${context.ascendant}
- Key aspects: ${this.formatAspects(context.aspects, locale)}

CURRENT TRANSITS:
${transitDescription}

${dailyContextDescription}

PERIOD: ${context.period}

CRITICALLY IMPORTANT: Respond with ONLY a valid JSON object and no extra text.
LANGUAGE: English only.

JSON format:
{
  "general": "Holistic summary of the whole period (3-4 sentences with deep analysis)",
  "love": "Love and relationships (2-3 sentences with concrete recommendations)",
  "career": "Career and business (2-3 sentences with practical advice)",
  "health": "Health and energy (2-3 sentences)",
  "finance": "Finance and material matters (2-3 sentences with grounded guidance)",
  "advice": "Main advice (2-3 sentences that explicitly say what to do and what to avoid)",
  "challenges": ["specific risk / what better not to do 1", "specific risk / what better not to do 2", "specific risk / what better not to do 3"],
  "opportunities": ["specific action worth taking 1", "specific action worth taking 2", "specific action worth taking 3"]
}

Content requirements:
- This is PREMIUM analysis — be as detailed and personalized as possible
- Keep it concise while substantive (target ~450-650 words total)
- Consider interactions between transits and natal planets
- Be concrete and practical
- Provide realistic, actionable advice
- ${humanVoiceLine}
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
- Keep a positive but honest tone
- Frame challenges as growth opportunities
- Each section must be unique, extended, and substantive`;
    }

    if (locale === 'es') {
      return isDeepSeek
        ? `Crea un horóscopo PREMIUM muy personalizado y conciso ${periodText} para una persona con la siguiente carta natal:

CARTA NATAL:
- Sol: ${context.sunSign}
- Luna: ${context.moonSign}
- Ascendente: ${context.ascendant}
- Aspectos clave: ${this.formatAspects(context.aspects, locale)}

TRÁNSITOS ACTUALES:
${transitDescription}

${dailyContextDescription}

PERÍODO: ${context.period}

CRÍTICAMENTE IMPORTANTE: Responde SOLO con un objeto JSON válido y sin texto adicional.
IDIOMA: Español solamente.

Formato JSON:
{
  "general": "Resumen integral de todo el período (2-3 frases, específico y humano)",
  "love": "Amor y relaciones (1-2 frases con recomendaciones concretas)",
  "career": "Carrera y negocios (1-2 frases con consejos prácticos)",
  "health": "Salud y energía (1-2 frases)",
  "finance": "Finanzas y lo material (1-2 frases con guía realista)",
  "advice": "Consejo principal (1-2 frases que indiquen claramente qué hacer y qué evitar)",
  "challenges": ["riesgo concreto 1", "riesgo concreto 2"],
  "opportunities": ["acción concreta 1", "acción concreta 2"]
}

Requisitos de estilo y contenido:
- Esto es análisis PREMIUM: sé muy personalizado dentro de un formato compacto
- Escribe de forma cálida, humana y empática (evita frases robóticas)
- ${humanVoiceLine}
- Considera la interacción de los tránsitos con posiciones natales
- Sé concreto, práctico y realista
- Mantén un tono positivo pero honesto
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
- Mantén cada campo compacto; evita introducciones largas y repeticiones
- Objetivo ~220-320 palabras
- No superes 3 frases en "general"
- No superes 2 frases en cualquier otro campo de prosa`
        : `Crea un horóscopo PREMIUM personalizado ${periodText} para una persona con la siguiente carta natal:

CARTA NATAL:
- Sol: ${context.sunSign}
- Luna: ${context.moonSign}
- Ascendente: ${context.ascendant}
- Aspectos clave: ${this.formatAspects(context.aspects, locale)}

TRÁNSITOS ACTUALES:
${transitDescription}

${dailyContextDescription}

PERÍODO: ${context.period}

CRÍTICAMENTE IMPORTANTE: Responde SOLO con un objeto JSON válido y sin texto adicional.
IDIOMA: Español solamente.

Formato JSON:
{
  "general": "Resumen integral de todo el período (3-4 frases con análisis profundo)",
  "love": "Amor y relaciones (2-3 frases con recomendaciones concretas)",
  "career": "Carrera y negocios (2-3 frases con consejos prácticos)",
  "health": "Salud y energía (2-3 frases)",
  "finance": "Finanzas y lo material (2-3 frases con guía realista)",
  "advice": "Consejo principal (2-3 frases que indiquen claramente qué hacer y qué evitar)",
  "challenges": ["riesgo concreto / qué conviene evitar 1", "riesgo concreto / qué conviene evitar 2", "riesgo concreto / qué conviene evitar 3"],
  "opportunities": ["acción concreta que conviene tomar 1", "acción concreta que conviene tomar 2", "acción concreta que conviene tomar 3"]
}

Requisitos de contenido:
- Esto es análisis PREMIUM: sé lo más detallado y personalizado posible
- Sé conciso pero sustancial (objetivo ~450-650 palabras)
- Considera la interacción de los tránsitos con las posiciones natales
- Sé concreto y práctico
- Da consejos realistas y aplicables
- ${humanVoiceLine}
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
- Mantén un tono positivo pero honesto
- Formula los desafíos como oportunidades de crecimiento
- Cada sección debe ser única, extensa y sustancial`;
    }

    return isDeepSeek
      ? `Создайте максимально персонализированный, но компактный PREMIUM гороскоп ${periodText} для человека со следующей натальной картой:

НАТАЛЬНАЯ КАРТА:
- Солнце: ${context.sunSign}
- Луна: ${context.moonSign}
- Асцендент: ${context.ascendant}
- Ключевые аспекты: ${this.formatAspects(context.aspects, locale)}

ТЕКУЩИЕ ТРАНЗИТЫ:
${transitDescription}

${dailyContextDescription}

ПЕРИОД: ${context.period}

КРИТИЧЕСКИ ВАЖНО: Ответьте ТОЛЬКО валидным JSON объектом без дополнительного текста.

Формат JSON:
{
  "general": "Цельное резюме всего периода (2-3 предложения, конкретно и по-человечески)",
  "love": "Любовь и отношения (1-2 предложения с конкретными рекомендациями)",
  "career": "Карьера и бизнес (1-2 предложения с практичными советами)",
  "health": "Здоровье и энергия (1-2 предложения)",
  "finance": "Финансы и материальное (1-2 предложения с приземленными советами)",
  "advice": "Главный совет (1-2 предложения, где прямо сказано что делать и чего лучше избегать)",
  "challenges": ["конкретный риск 1", "конкретный риск 2"],
  "opportunities": ["конкретное действие 1", "конкретное действие 2"]
}

Требования к стилю и контенту:
- Это PREMIUM анализ - будьте очень персонализированы, но держите компактную форму
- Пишите тепло, по‑человечески, эмпатично (без «роботности»)
- ${humanVoiceLine}
- Учитывайте взаимодействие транзитов с натальными планетами
- Будьте конкретны, практичны и реалистичны
- Сохраняйте позитивный, но честный тон
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
- Держите каждый раздел компактным; без длинных вступлений и повторов
- Ориентир ~220-320 слов
- Не превышайте 3 предложения в поле "general"
- Не превышайте 2 предложения в остальных текстовых полях`
      : `Создайте персонализированный PREMIUM гороскоп ${periodText} для человека со следующей натальной картой:

НАТАЛЬНАЯ КАРТА:
- Солнце: ${context.sunSign}
- Луна: ${context.moonSign}
- Асцендент: ${context.ascendant}
- Ключевые аспекты: ${this.formatAspects(context.aspects, locale)}

ТЕКУЩИЕ ТРАНЗИТЫ:
${transitDescription}

${dailyContextDescription}

ПЕРИОД: ${context.period}

КРИТИЧЕСКИ ВАЖНО: Ответьте ТОЛЬКО валидным JSON объектом без дополнительного текста.

Формат JSON:
{
  "general": "Цельное резюме всего периода (3-4 предложения с глубоким анализом)",
  "love": "Любовь и отношения (2-3 предложения с конкретными рекомендациями)",
  "career": "Карьера и бизнес (2-3 предложения с практичными советами)",
  "health": "Здоровье и энергия (2-3 предложения)",
  "finance": "Финансы и материальное (2-3 предложения с приземленными советами)",
  "advice": "Главный совет (2-3 предложения, где прямо сказано что делать и чего лучше избегать)",
  "challenges": ["конкретный риск / чего лучше не делать 1", "конкретный риск / чего лучше не делать 2", "конкретный риск / чего лучше не делать 3"],
  "opportunities": ["конкретное действие, которое стоит сделать 1", "конкретное действие, которое стоит сделать 2", "конкретное действие, которое стоит сделать 3"]
}

Требования к контенту:
- Это PREMIUM анализ - будьте максимально детальны и персонализированы
- Будьте лаконичны, но содержательны (ориентир ~450-650 слов)
- Учитывайте взаимодействие транзитов с натальными планетами
- Будьте конкретны и практичны
- Давайте реалистичные, применимые советы
- ${humanVoiceLine}
- ${antiTemplateLine}
- ${flowLine}
- ${specificityLine}
- ${generalSummaryLine}
- ${plainJsonValuesLine}
- ${consistencyLine}
- ${actionabilityLine}
- ${opportunitiesLine}
- ${challengesLine}
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
      ascendant?:
        | { sign?: string; degree?: number; longitude?: number }
        | string;
      userProfile?: any;
    },
    locale: AILocale = 'ru',
  ): string {
    const planetsDesc = this.formatPlanets(context.planets, locale);
    const housesDesc = this.formatHouses(context.houses, locale);
    const aspectsDesc = this.formatAspects(context.aspects, locale);
    const dominantPlanetaryFocus = this.getDominantPlanetaryFocus(
      context.planets,
      locale,
    );
    const chartRulerDesc = this.getChartRulerDescription(
      context.planets,
      context.houses,
      context.ascendant,
      locale,
    );
    const lunarNodesDesc = this.getLunarNodesDescription(
      context.planets,
      context.houses,
      locale,
    );
    const sectDesc = this.getSectDescription(
      context.planets,
      context.houses,
      context.ascendant,
      locale,
    );
    const dispositorDesc = this.getDispositorDescription(
      context.planets,
      context.houses,
      locale,
    );
    const mutualReceptionDesc = this.getMutualReceptionDescription(
      context.planets,
      locale,
    );
    const keyHouseRulersDesc = this.getKeyHouseRulersDescription(
      context.planets,
      context.houses,
      locale,
    );
    const angularAxisDesc = this.getAngularAxisDescription(
      context.houses,
      context.ascendant,
      locale,
    );
    const ascendantDesc =
      typeof context.ascendant === 'string'
        ? context.ascendant
        : context.ascendant?.sign
          ? `${this.getLocalizedSign(context.ascendant.sign, locale)}${typeof context.ascendant.degree === 'number' ? ` ${context.ascendant.degree.toFixed(1)}°` : ''}`
          : this.getAscendantFromHouses(context.houses, locale);
    const naturalConsultationLine =
      locale === 'en'
        ? 'Write like a skilled astrologer speaking directly to one person, not like an encyclopedia entry.'
        : locale === 'es'
          ? 'Escribe como un astrólogo experto que habla directamente con una persona, no como una entrada enciclopédica.'
          : 'Пишите как опытный астролог, который говорит напрямую с одним человеком, а не как энциклопедическая статья.';
    const naturalRhythmLine =
      locale === 'en'
        ? 'Vary rhythm and syntax: mix longer reflective sentences with shorter precise ones.'
        : locale === 'es'
          ? 'Varía el ritmo y la sintaxis: mezcla frases más reflexivas con otras breves y precisas.'
          : 'Варьируйте ритм и синтаксис: чередуйте более вдумчивые фразы с короткими и точными.';
    const antiAstroClicheLine =
      locale === 'en'
        ? 'Avoid empty astro clichés, fortune-cookie phrasing, and generic spiritual abstractions.'
        : locale === 'es'
          ? 'Evita clichés astrológicos vacíos, frases tipo galleta de la fortuna y abstracciones espirituales genéricas.'
          : 'Избегайте пустых астрологических клише, фраз в духе печенья с предсказанием и общих духовных абстракций.';
    const emotionalSpecificityLine =
      locale === 'en'
        ? 'Name likely feelings, tensions, and life situations in plain human language when the chart supports it.'
        : locale === 'es'
          ? 'Nombra posibles sentimientos, tensiones y situaciones de vida con lenguaje humano claro cuando la carta lo respalde.'
          : 'Называйте вероятные чувства, напряжения и жизненные ситуации простым человеческим языком, если карта это поддерживает.';
    const synthesisLine =
      locale === 'en'
        ? 'Make the reading feel lived-in: show how the person may actually experience these patterns in daily life, relationships, and choices.'
        : locale === 'es'
          ? 'Haz que la lectura se sienta vivida: muestra cómo la persona puede experimentar estos patrones en la vida diaria, en los vínculos y en sus decisiones.'
          : 'Сделайте текст прожитым: показывайте, как эти паттерны могут реально ощущаться в повседневной жизни, отношениях и выборе.';

    if (locale === 'en') {
      return `Create an extended PREMIUM natal-chart interpretation based strictly on the provided chart data.
LANGUAGE: English only.
FORMAT: plain text only, no JSON, no markdown headings, no bullet lists.
LENGTH: 7-10 substantial paragraphs.

ASCENDANT:
${ascendantDesc}

ANGULAR AXES:
${angularAxisDesc}

DOMINANT FOCUS:
${dominantPlanetaryFocus}

CHART RULER:
${chartRulerDesc}

LUNAR NODES:
${lunarNodesDesc}

SECT:
${sectDesc}

DISPOSITOR FOCUS:
${dispositorDesc}

MUTUAL RECEPTIONS:
${mutualReceptionDesc}

KEY HOUSE RULERS:
${keyHouseRulersDesc}

PLANETS:
${planetsDesc}

HOUSES:
${housesDesc}

ASPECTS:
${aspectsDesc}

Write one coherent premium analysis that:
1. Starts from the Big Three: Sun, Moon, Ascendant.
2. Explains how the outer angles (Ascendant, IC, Descendant, Midheaven) shape private life, relationships, and public path.
3. Interprets the most important planets through sign, house, degree, and retrograde status when present.
4. Uses the aspects as real dynamics, not as isolated textbook definitions.
5. Highlights repeating themes, internal contradictions, strengths, and likely growth tasks.
6. Gives practical developmental guidance grounded in this exact chart.

Hard requirements:
- Do not invent placements, aspects, houses, or biographical facts.
- If some data is weak or missing, simply say the chart emphasizes other available factors.
- Avoid generic astrology filler and avoid repeating the same idea in different words.
- Do not moralize and do not sound mystical for the sake of style.
- Keep the tone intelligent, psychologically precise, warm, and concrete.
- ${naturalConsultationLine}
- ${naturalRhythmLine}
- ${antiAstroClicheLine}
- ${emotionalSpecificityLine}
- ${synthesisLine}
- Explain synthesis: show how placements work together, not just one-by-one.
- Pay special attention to the user's real chart anchors: big three, angular houses, dominant houses, repeated elements, and strongest aspects.
- Give special weight to the tightest aspects by orb/strength and to the rulers of houses 7, 10, 2, and 8 when discussing relationships, career, and money.

The result must read like a high-end personalized astrological consultation, not a template.`;
    }

    if (locale === 'es') {
      return `Crea una interpretación PREMIUM ampliada de la carta natal basándote estrictamente en los datos proporcionados.
IDIOMA: Español solamente.
FORMATO: solo texto plano, sin JSON, sin encabezados markdown, sin viñetas.
LONGITUD: 7-10 párrafos sustanciales.

ASCENDENTE:
${ascendantDesc}

EJES ANGULARES:
${angularAxisDesc}

FOCO DOMINANTE:
${dominantPlanetaryFocus}

REGENTE DE LA CARTA:
${chartRulerDesc}

NODOS LUNARES:
${lunarNodesDesc}

SECTA:
${sectDesc}

FOCO DISPOSITOR:
${dispositorDesc}

RECEPCIONES MUTUAS:
${mutualReceptionDesc}

REGENTES DE CASAS CLAVE:
${keyHouseRulersDesc}

PLANETAS:
${planetsDesc}

CASAS:
${housesDesc}

ASPECTOS:
${aspectsDesc}

Escribe un análisis premium coherente que:
1. Comience por la gran tríada: Sol, Luna y Ascendente.
2. Explique cómo los ángulos principales (Ascendente, IC, Descendente y Medio Cielo) moldean vida privada, vínculos y camino público.
3. Interprete los planetas importantes por signo, casa, grado y retrogradación si existe.
4. Use los aspectos como dinámicas reales, no como definiciones sueltas de manual.
5. Destaque temas repetidos, contradicciones internas, fortalezas y tareas de crecimiento.
6. Ofrezca orientación práctica basada en esta carta exacta.

Requisitos estrictos:
- No inventes posiciones, aspectos, casas ni datos biográficos.
- Si algún dato es débil o falta, indícalo brevemente y apóyate en lo que sí está claro.
- Evita relleno astrológico genérico y evita repetir la misma idea con otras palabras.
- No moralices ni uses tono místico vacío.
- Mantén un tono inteligente, psicológico, cálido y concreto.
- ${naturalConsultationLine}
- ${naturalRhythmLine}
- ${antiAstroClicheLine}
- ${emotionalSpecificityLine}
- ${synthesisLine}
- Haz síntesis: muestra cómo los factores trabajan juntos, no solo uno por uno.
- Da atención especial a los anclajes reales de la carta: gran tríada, casas angulares, casas dominantes, elementos repetidos y aspectos fuertes.
- Da peso especial a los aspectos más cerrados por orbe/fuerza y a los regentes de las casas 7, 10, 2 y 8 al hablar de relaciones, carrera y dinero.

El resultado debe sentirse como una consulta astrológica personalizada de alto nivel, no como una plantilla.`;
    }

    return `Создайте расширенную PREMIUM-интерпретацию натальной карты, строго опираясь на переданные данные.
ФОРМАТ: только сплошной текст, без JSON, без markdown-заголовков, без списков.
ОБЪЕМ: 7-10 содержательных абзацев.

АСЦЕНДЕНТ:
${ascendantDesc}

УГЛЫ КАРТЫ:
${angularAxisDesc}

ДОМИНИРУЮЩИЙ ФОКУС:
${dominantPlanetaryFocus}

УПРАВИТЕЛЬ КАРТЫ:
${chartRulerDesc}

ЛУННЫЕ УЗЛЫ:
${lunarNodesDesc}

СЕКТА КАРТЫ:
${sectDesc}

ДИСПОЗИТОРНЫЙ ФОКУС:
${dispositorDesc}

ВЗАИМНЫЕ РЕЦЕПЦИИ:
${mutualReceptionDesc}

УПРАВИТЕЛИ КЛЮЧЕВЫХ ДОМОВ:
${keyHouseRulersDesc}

ПЛАНЕТЫ:
${planetsDesc}

ДОМА:
${housesDesc}

АСПЕКТЫ:
${aspectsDesc}

Нужно написать единый premium-анализ, который:
1. Начинает разбор с большой тройки: Солнце, Луна, Асцендент.
2. Объясняет, как углы карты (ASC, IC, DSC, MC) формируют личную подачу, внутреннюю опору, сценарий партнерства и социальную реализацию.
3. Интерпретирует ключевые планеты через знак, дом, градус и ретроградность, если она есть.
4. Использует аспекты как живую динамику характера, а не как отдельные учебниковые формулы.
5. Выявляет повторяющиеся темы, внутренние противоречия, сильные стороны и задачи роста.
6. Дает практичные выводы и рекомендации, которые реально следуют из этой карты.

Жесткие требования:
- Ничего не выдумывайте: не добавляйте несуществующие положения, аспекты, дома или биографические детали.
- Если каких-то данных недостаточно, кратко отметьте это и опирайтесь на то, что выражено ясно.
- Не используйте шаблонную астрологическую воду и не повторяйте одну мысль разными словами.
- Не морализируйте и не уходите в мистический туман ради стиля.
- Тон должен быть умным, психологически точным, теплым и конкретным.
- ${naturalConsultationLine}
- ${naturalRhythmLine}
- ${antiAstroClicheLine}
- ${emotionalSpecificityLine}
- ${synthesisLine}
- Делайте синтез: показывайте, как факторы карты работают вместе.
- Особое внимание уделяйте нашим главным якорям: большая тройка, угловые дома, повтор элементов, доминанты по домам и сильнейшие аспекты.
- Отдельно учитывайте самые точные аспекты по орбу/силе и управителей 7, 10, 2 и 8 домов, когда говорите про отношения, карьеру и деньги.

Итоговый текст должен читаться как дорогая персональная консультация по натальной карте, а не как шаблонный гороскоп.`;
  }

  private getAscendantFromHouses(houses: any, locale: AILocale): string {
    const firstHouse = houses?.[1] ?? houses?.['1'];
    if (!firstHouse?.sign) {
      return locale === 'ru'
        ? 'Неизвестно'
        : locale === 'es'
          ? 'Desconocido'
          : 'Unknown';
    }

    const degree =
      typeof firstHouse.cusp === 'number'
        ? `${(firstHouse.cusp % 30).toFixed(1)}°`
        : '';

    return `${this.getLocalizedSign(firstHouse.sign, locale)}${degree ? ` ${degree}` : ''}`;
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

      return this.normalizeHoroscopeResponse(parsed, locale);
    } catch (error) {
      this.logger.warn(
        `JSON parsing failed, attempting recovery: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      // Fallback to regex extraction if JSON parsing fails
      try {
        const extracted = this.extractJsonObject(response);
        if (extracted) {
          return this.normalizeHoroscopeResponse(JSON.parse(extracted), locale);
        }
      } catch (regexError) {
        this.logger.warn(
          `Regex extraction also failed: ${
            regexError instanceof Error
              ? regexError.message
              : String(regexError)
          }`,
        );
      }

      const partialRecord = this.extractPartialHoroscopeRecord(response);
      if (partialRecord && Object.keys(partialRecord).length > 0) {
        this.logger.warn(
          `Recovered partial horoscope JSON fields: ${Object.keys(partialRecord).join(', ')}`,
        );
        return this.normalizeHoroscopeResponse(partialRecord, locale);
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

      return this.normalizeHoroscopeResponse(sections, locale);
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

      return this.normalizeHoroscopeResponse(sections, locale);
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

    return this.normalizeHoroscopeResponse(sections, locale);
  }

  private normalizeHoroscopeResponse(
    raw: unknown,
    locale: AILocale,
  ): HoroscopeResponse {
    const record =
      raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

    return {
      general: this.normalizeHoroscopeTextField(
        record.general,
        'general',
        locale,
      ),
      love: this.normalizeHoroscopeTextField(record.love, 'love', locale),
      career: this.normalizeHoroscopeTextField(record.career, 'career', locale),
      health: this.normalizeHoroscopeTextField(record.health, 'health', locale),
      finance: this.normalizeHoroscopeTextField(
        record.finance,
        'finance',
        locale,
      ),
      advice: this.normalizeHoroscopeTextField(record.advice, 'advice', locale),
      challenges: this.normalizeHoroscopeListField(
        record.challenges,
        'challenges',
        locale,
      ),
      opportunities: this.normalizeHoroscopeListField(
        record.opportunities,
        'opportunities',
        locale,
      ),
    };
  }

  private normalizeHoroscopeTextField(
    value: unknown,
    field: 'general' | 'love' | 'career' | 'health' | 'finance' | 'advice',
    locale: AILocale,
  ): string {
    const fragments = this.extractNarrativeFragments(value);
    const cleaned = fragments
      .map((fragment) => this.cleanHoroscopeText(fragment, field, locale))
      .filter((fragment) => fragment.length > 0);

    return this.joinNarrativeFragments(cleaned);
  }

  private normalizeHoroscopeListField(
    value: unknown,
    field: 'challenges' | 'opportunities',
    locale: AILocale,
  ): string[] {
    const fragments = this.extractNarrativeFragments(value);
    const items = fragments
      .flatMap((fragment) => this.splitPotentialListItems(fragment))
      .map((fragment) => this.cleanHoroscopeText(fragment, field, locale))
      .filter((fragment) => fragment.length >= 6);

    return [...new Set(items)].slice(0, 6);
  }

  private extractNarrativeFragments(value: unknown, depth = 0): string[] {
    if (depth > 4 || value == null) {
      return [];
    }

    if (typeof value === 'string') {
      return [value];
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      return value.flatMap((entry) =>
        this.extractNarrativeFragments(entry, depth + 1),
      );
    }

    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const preferredKeys = new Set<string>(this.preferredNarrativeKeys);
      const preferred = this.preferredNarrativeKeys.flatMap((key) =>
        key in record
          ? this.extractNarrativeFragments(record[key], depth + 1)
          : [],
      );
      const remainder = Object.entries(record)
        .filter(([key]) => !preferredKeys.has(key))
        .flatMap(([, entry]) =>
          this.extractNarrativeFragments(entry, depth + 1),
        );

      return [...preferred, ...remainder];
    }

    return [];
  }

  private cleanHoroscopeText(
    value: string,
    field: keyof HoroscopeResponse,
    locale: AILocale,
  ): string {
    let text = this.stripCodeFences(value)
      .replace(/\r/g, '\n')
      .replace(/\\n/g, '\n')
      .trim();

    if (!text) {
      return '';
    }

    text = this.unwrapWrappedText(text);
    text = this.stripLeadingHoroscopeLabel(text, field, locale);

    const maybeStructured = this.tryParseStructuredFieldValue(text);
    if (maybeStructured != null) {
      return Array.isArray(maybeStructured)
        ? this.joinNarrativeFragments(
            maybeStructured
              .flatMap((entry) => this.extractNarrativeFragments(entry))
              .map((entry) => this.cleanHoroscopeText(entry, field, locale))
              .filter(Boolean),
          )
        : this.normalizeHoroscopeTextField(
            maybeStructured,
            this.mapFieldToTextKey(field),
            locale,
          );
    }

    text = text
      .replace(/^[-*•\d.\s)]+/, '')
      .replace(/\n+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.;!?])/g, '$1')
      .trim();

    text = this.unwrapWrappedText(text);
    text = this.stripLeadingHoroscopeLabel(text, field, locale);

    return text.trim();
  }

  private joinNarrativeFragments(fragments: string[]): string {
    const unique = [...new Set(fragments.map((fragment) => fragment.trim()))]
      .filter(Boolean)
      .slice(0, 4);

    return unique
      .join(' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private splitPotentialListItems(value: string): string[] {
    const normalized = value.replace(/\r/g, '\n').trim();
    if (!normalized) {
      return [];
    }

    if (
      normalized.includes('\n') ||
      /[•;]|(?:^|\s)\d+[.)]\s/.test(normalized)
    ) {
      return normalized
        .split(/\n+|(?:^|\s)(?=\d+[.)]\s)|[•;]+/g)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    return [normalized];
  }

  private stripLeadingHoroscopeLabel(
    value: string,
    field: keyof HoroscopeResponse,
    locale: AILocale,
  ): string {
    const labels = this.getHoroscopeFieldLabels(field, locale)
      .map((label) => this.escapeRegex(label))
      .join('|');

    let current = value.trim();
    const labelPattern = new RegExp(
      `^(?:["'“”\\s#>*_[\\]{}()]+)?(?:${labels})(?:\\s+(?:section|forecast|resumen|pron[oó]stico|раздел|прогноз))?(?:["'“”\\s_\\-–—]*)[:=\\-–—]+\\s*`,
      'iu',
    );

    for (let i = 0; i < 3; i += 1) {
      const next = current.replace(labelPattern, '').trim();
      if (next === current) {
        break;
      }
      current = next;
    }

    return current;
  }

  private tryParseStructuredFieldValue(value: string): unknown | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (
      !(
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      )
    ) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  private unwrapWrappedText(value: string): string {
    let text = value.trim();

    for (let i = 0; i < 3; i += 1) {
      const unwrapped = text.replace(/^["'“”`]+|["'“”`]+$/g, '').trim();
      if (unwrapped === text) {
        break;
      }
      text = unwrapped;
    }

    return text;
  }

  private getHoroscopeFieldLabels(
    field: keyof HoroscopeResponse,
    _locale: AILocale,
  ): string[] {
    const base: Record<keyof HoroscopeResponse, string[]> = {
      general: [
        'general',
        'overall forecast',
        'общий прогноз',
        'общее',
        'pronóstico general',
        'resumen general',
      ],
      love: ['love', 'relationships', 'amor', 'любовь', 'отношения'],
      career: ['career', 'work', 'carrera', 'карьера'],
      health: ['health', 'wellbeing', 'salud', 'здоровье'],
      finance: [
        'finance',
        'finances',
        'money',
        'finanzas',
        'финансы',
        'деньги',
      ],
      advice: ['advice', 'guidance', 'consejo', 'совет', 'рекомендации'],
      challenges: [
        'challenges',
        'challenge',
        'desafíos',
        'desafios',
        'вызовы',
        'риски',
      ],
      opportunities: [
        'opportunities',
        'opportunity',
        'oportunidades',
        'возможности',
      ],
    };

    return base[field];
  }

  private mapFieldToTextKey(
    field: keyof HoroscopeResponse,
  ): 'general' | 'love' | 'career' | 'health' | 'finance' | 'advice' {
    if (field === 'challenges' || field === 'opportunities') {
      return 'advice';
    }

    return field;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private stripCodeFences(input: string): string {
    const trimmed = input.trim();
    if (!trimmed.startsWith('```')) return trimmed;
    return trimmed
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/```$/, '')
      .trim();
  }

  private getHoroscopeGenerationOptions(
    provider: AIProvider,
  ): AIGenerateOptions {
    const timeoutMs =
      provider === 'claude'
        ? this.horoscopeRequestTimeoutMs + 500
        : this.horoscopeRequestTimeoutMs;

    return {
      timeoutMs,
      maxTokens: provider === 'deepseek' ? 1000 : 1100,
      temperature: provider === 'deepseek' ? 0.45 : 0.6,
      responseFormat: 'json_object',
    };
  }

  private isTimeoutLikeError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return /timeout|timed out|abort|aborted|deadline/i.test(error.message);
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

  private extractPartialHoroscopeRecord(
    input: string,
  ): Partial<Record<keyof HoroscopeResponse, unknown>> | null {
    const text = this.stripCodeFences(input);
    const result: Partial<Record<keyof HoroscopeResponse, unknown>> = {};
    const textFields: Array<
      'general' | 'love' | 'career' | 'health' | 'finance' | 'advice'
    > = ['general', 'love', 'career', 'health', 'finance', 'advice'];

    for (const field of textFields) {
      const extracted = this.extractLooseJsonStringField(text, field);
      if (extracted) {
        result[field] = extracted;
      }
    }

    const challenges = this.extractLooseJsonArrayField(text, 'challenges');
    if (challenges.length > 0) {
      result.challenges = challenges;
    }

    const opportunities = this.extractLooseJsonArrayField(
      text,
      'opportunities',
    );
    if (opportunities.length > 0) {
      result.opportunities = opportunities;
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  private extractLooseJsonStringField(
    input: string,
    field: string,
  ): string | null {
    const keyPattern = new RegExp(
      `"${this.escapeRegex(field)}"\\s*:\\s*"`,
      'i',
    );
    const match = keyPattern.exec(input);
    if (!match) {
      return null;
    }

    const start = match.index + match[0].length;
    const { value } = this.readLooseJsonString(input, start);
    const normalized = this.decodeLooseJsonString(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private extractLooseJsonArrayField(input: string, field: string): string[] {
    const keyPattern = new RegExp(
      `"${this.escapeRegex(field)}"\\s*:\\s*\\[`,
      'i',
    );
    const match = keyPattern.exec(input);
    if (!match) {
      return [];
    }

    let cursor = match.index + match[0].length;
    const items: string[] = [];

    while (cursor < input.length) {
      while (cursor < input.length && /[\s,\n\r\t]/.test(input[cursor])) {
        cursor += 1;
      }

      if (cursor >= input.length || input[cursor] === ']') {
        break;
      }

      if (input[cursor] !== '"') {
        const nextBoundary = input.slice(cursor).search(/[,\]]/);
        if (nextBoundary === -1) {
          break;
        }
        cursor += nextBoundary + 1;
        continue;
      }

      const { value, endIndex } = this.readLooseJsonString(input, cursor + 1);
      const normalized = this.decodeLooseJsonString(value).trim();
      if (normalized.length > 0) {
        items.push(normalized);
      }
      cursor = endIndex;
    }

    return items;
  }

  private readLooseJsonString(
    input: string,
    startIndex: number,
  ): { value: string; endIndex: number } {
    let value = '';
    let escaping = false;

    for (let i = startIndex; i < input.length; i += 1) {
      const ch = input[i];

      if (escaping) {
        value += ch;
        escaping = false;
        continue;
      }

      if (ch === '\\') {
        value += ch;
        escaping = true;
        continue;
      }

      if (ch === '"') {
        return { value, endIndex: i + 1 };
      }

      value += ch;
    }

    return { value, endIndex: input.length };
  }

  private decodeLooseJsonString(value: string): string {
    return value
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
        String.fromCharCode(parseInt(hex, 16)),
      )
      .replace(/\\"/g, '"')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\\\/g, '\\')
      .trim();
  }

  private getSignRuler(sign: string): string {
    const rulers: Record<string, string> = {
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
    return rulers[sign] || 'sun';
  }

  private getChartRulerDescription(
    planets: any,
    houses: any,
    ascendant: any,
    locale: AILocale = 'ru',
  ): string {
    const ascSign =
      typeof ascendant === 'string'
        ? ascendant
        : ascendant?.sign || houses?.[1]?.sign || houses?.['1']?.sign;
    if (!ascSign) {
      return locale === 'en'
        ? 'Chart ruler is not available'
        : locale === 'es'
          ? 'No hay regente de carta disponible'
          : 'Управитель карты не определен';
    }

    const rulerKey = this.getSignRuler(ascSign);
    const rulerPlanet = planets?.[rulerKey];
    if (!rulerPlanet) {
      return locale === 'en'
        ? `${this.getPlanetName(rulerKey, locale)} rules the Ascendant sign ${this.getLocalizedSign(ascSign, locale)}.`
        : locale === 'es'
          ? `${this.getPlanetName(rulerKey, locale)} rige el Ascendente en ${this.getLocalizedSign(ascSign, locale)}.`
          : `${this.getPlanetName(rulerKey, locale)} управляет Асцендентом в ${this.getLocalizedSign(ascSign, locale)}.`;
    }

    const house =
      typeof rulerPlanet.house === 'number'
        ? rulerPlanet.house
        : typeof rulerPlanet.longitude === 'number'
          ? this.getHouseFromLongitude(rulerPlanet.longitude, houses)
          : null;
    const sign = rulerPlanet.sign
      ? this.getLocalizedSign(rulerPlanet.sign, locale)
      : this.getLocalizedSign(ascSign, locale);

    if (locale === 'en') {
      return `${this.getPlanetName(rulerKey, locale)} rules the Ascendant and stands in ${sign}${house ? `, house ${house}` : ''}.`;
    }
    if (locale === 'es') {
      return `${this.getPlanetName(rulerKey, locale)} rige el Ascendente y se ubica en ${sign}${house ? `, casa ${house}` : ''}.`;
    }
    return `${this.getPlanetName(rulerKey, locale)} управляет Асцендентом и находится в знаке ${sign}${house ? `, в ${house}-м доме` : ''}.`;
  }

  private getKeyHouseRulersDescription(
    planets: any,
    houses: any,
    locale: AILocale = 'ru',
  ): string {
    const keyHouses = [1, 4, 7, 10];
    const lines = keyHouses
      .map((houseNum) => {
        const sign =
          houses?.[houseNum]?.sign ?? houses?.[String(houseNum)]?.sign;
        if (!sign) return null;
        const rulerKey = this.getSignRuler(sign);
        const rulerPlanet = planets?.[rulerKey];
        const localizedSign = this.getLocalizedSign(sign, locale);
        const rulerName = this.getPlanetName(rulerKey, locale);
        const rulerHouse =
          typeof rulerPlanet?.house === 'number'
            ? rulerPlanet.house
            : typeof rulerPlanet?.longitude === 'number'
              ? this.getHouseFromLongitude(rulerPlanet.longitude, houses)
              : null;
        const rulerSign = rulerPlanet?.sign
          ? this.getLocalizedSign(rulerPlanet.sign, locale)
          : null;

        if (locale === 'en') {
          return `House ${houseNum} in ${localizedSign} -> ruler ${rulerName}${rulerSign ? ` in ${rulerSign}` : ''}${rulerHouse ? `, house ${rulerHouse}` : ''}`;
        }
        if (locale === 'es') {
          return `Casa ${houseNum} en ${localizedSign} -> regente ${rulerName}${rulerSign ? ` en ${rulerSign}` : ''}${rulerHouse ? `, casa ${rulerHouse}` : ''}`;
        }
        return `${houseNum}-й дом в ${localizedSign} -> управитель ${rulerName}${rulerSign ? ` в ${rulerSign}` : ''}${rulerHouse ? `, ${rulerHouse}-й дом` : ''}`;
      })
      .filter(Boolean);

    if (lines.length === 0) {
      return locale === 'en'
        ? 'Key house rulers are not available'
        : locale === 'es'
          ? 'No hay regentes de casas clave disponibles'
          : 'Управители ключевых домов не определены';
    }

    return lines.join('\n');
  }

  private getLunarNodesDescription(
    planets: any,
    houses: any,
    locale: AILocale = 'ru',
  ): string {
    const northNode = planets?.north_node ?? planets?.northNode;
    const southNode = planets?.south_node ?? planets?.southNode;

    if (!northNode && !southNode) {
      return locale === 'en'
        ? 'Lunar nodes are not available'
        : locale === 'es'
          ? 'Los nodos lunares no están disponibles'
          : 'Лунные узлы не определены';
    }

    const describeNode = (label: string, node: any) => {
      if (!node?.sign) return null;
      const sign = this.getLocalizedSign(node.sign, locale);
      const house =
        typeof node.house === 'number'
          ? node.house
          : typeof node.longitude === 'number'
            ? this.getHouseFromLongitude(node.longitude, houses)
            : null;

      if (locale === 'en') {
        return `${label}: ${sign}${house ? `, house ${house}` : ''}`;
      }
      if (locale === 'es') {
        return `${label}: ${sign}${house ? `, casa ${house}` : ''}`;
      }
      return `${label}: ${sign}${house ? `, ${house}-й дом` : ''}`;
    };

    return [
      describeNode('North Node', northNode),
      describeNode('South Node', southNode),
    ]
      .filter(Boolean)
      .join('\n');
  }

  private getDispositorDescription(
    planets: any,
    houses: any,
    locale: AILocale = 'ru',
  ): string {
    const keys = Object.keys(planets || {}).filter((key) =>
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

    const ends = new Map<string, number>();
    for (const key of keys) {
      const end = this.resolvePromptDispositorEnd(key, planets, 0);
      if (!end) continue;
      ends.set(end, (ends.get(end) || 0) + 1);
    }

    const dominant = Array.from(ends.entries()).sort((a, b) => b[1] - a[1])[0];
    if (!dominant) {
      return locale === 'en'
        ? 'No clear dispositor center'
        : locale === 'es'
          ? 'No hay un centro dispositor claro'
          : 'Явный диспозиторный центр не определен';
    }

    const [planetKey, count] = dominant;
    const planet = planets?.[planetKey];
    const sign = planet?.sign
      ? this.getLocalizedSign(planet.sign, locale)
      : null;
    const house =
      typeof planet?.house === 'number'
        ? planet.house
        : typeof planet?.longitude === 'number'
          ? this.getHouseFromLongitude(planet.longitude, houses)
          : null;
    const planetName = this.getPlanetName(planetKey, locale);

    if (locale === 'en') {
      return `${planetName}${sign ? ` in ${sign}` : ''}${house ? `, house ${house}` : ''} receives ${count} dispositor chains and may function as an internal center of the chart.`;
    }
    if (locale === 'es') {
      return `${planetName}${sign ? ` en ${sign}` : ''}${house ? `, casa ${house}` : ''} recibe ${count} cadenas dispositores y puede funcionar como centro interno de la carta.`;
    }
    return `${planetName}${sign ? ` в ${sign}` : ''}${house ? `, ${house}-й дом` : ''} получает ${count} диспозиторных цепочек и может работать как внутренний центр карты.`;
  }

  private getSectDescription(
    planets: any,
    houses: any,
    ascendant: any,
    locale: AILocale = 'ru',
  ): string {
    const sunLongitude = planets?.sun?.longitude;
    const ascLongitude =
      typeof ascendant?.longitude === 'number'
        ? ascendant.longitude
        : (houses?.[1]?.cusp ?? houses?.['1']?.cusp);

    if (typeof sunLongitude !== 'number' || typeof ascLongitude !== 'number') {
      return locale === 'en'
        ? 'Sect is not available'
        : locale === 'es'
          ? 'La secta no está disponible'
          : 'Секта карты не определена';
    }

    const isDayChart = (sunLongitude - ascLongitude + 360) % 360 < 180;
    if (locale === 'en') {
      return isDayChart
        ? 'Day chart: solar and outward-facing factors tend to act more directly.'
        : 'Night chart: lunar and inward-facing factors tend to carry more weight.';
    }
    if (locale === 'es') {
      return isDayChart
        ? 'Carta diurna: los factores solares y orientados hacia afuera suelen actuar con más claridad.'
        : 'Carta nocturna: los factores lunares e internos suelen tener más peso.';
    }
    return isDayChart
      ? 'Дневная карта: солнечные и внешне направленные факторы обычно проявляются прямее.'
      : 'Ночная карта: лунные и внутренние факторы обычно имеют больший вес.';
  }

  private getMutualReceptionDescription(
    planets: any,
    locale: AILocale = 'ru',
  ): string {
    const classicalRulers: Record<string, string> = {
      Aries: 'mars',
      Taurus: 'venus',
      Gemini: 'mercury',
      Cancer: 'moon',
      Leo: 'sun',
      Virgo: 'mercury',
      Libra: 'venus',
      Scorpio: 'mars',
      Sagittarius: 'jupiter',
      Capricorn: 'saturn',
      Aquarius: 'saturn',
      Pisces: 'jupiter',
    };
    const supportedKeys = [
      'sun',
      'moon',
      'mercury',
      'venus',
      'mars',
      'jupiter',
      'saturn',
    ];
    const receptions: string[] = [];

    for (let i = 0; i < supportedKeys.length; i += 1) {
      for (let j = i + 1; j < supportedKeys.length; j += 1) {
        const a = supportedKeys[i];
        const b = supportedKeys[j];
        const signA = planets?.[a]?.sign;
        const signB = planets?.[b]?.sign;
        if (!signA || !signB) continue;
        if (classicalRulers[signA] !== b || classicalRulers[signB] !== a) {
          continue;
        }
        receptions.push(
          `${this.getPlanetName(a, locale)} ↔ ${this.getPlanetName(b, locale)}`,
        );
      }
    }

    if (receptions.length === 0) {
      return locale === 'en'
        ? 'No clear mutual receptions'
        : locale === 'es'
          ? 'No hay recepciones mutuas claras'
          : 'Явных взаимных рецепций нет';
    }

    return receptions.join(', ');
  }

  private resolvePromptDispositorEnd(
    planetKey: string,
    planets: Record<string, any>,
    depth: number,
    visited: Set<string> = new Set(),
  ): string | null {
    if (depth > 12 || visited.has(planetKey)) return planetKey;
    const planet = planets?.[planetKey];
    if (!planet?.sign) return null;
    const rulerKey = this.getSignRuler(planet.sign);
    if (rulerKey === planetKey) return planetKey;
    visited.add(planetKey);
    if (!planets?.[rulerKey]) return planetKey;
    return this.resolvePromptDispositorEnd(
      rulerKey,
      planets,
      depth + 1,
      visited,
    );
  }

  private getHouseFromLongitude(longitude: number, houses: any): number | null {
    if (!houses || typeof longitude !== 'number') return null;

    for (let i = 1; i <= 12; i += 1) {
      const current = houses?.[i]?.cusp ?? houses?.[String(i)]?.cusp;
      const nextIndex = i === 12 ? 1 : i + 1;
      const next =
        houses?.[nextIndex]?.cusp ?? houses?.[String(nextIndex)]?.cusp;

      if (typeof current !== 'number' || typeof next !== 'number') continue;
      if (current <= next) {
        if (longitude >= current && longitude < next) return i;
      } else if (longitude >= current || longitude < next) {
        return i;
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
      .slice(0, 8)
      .map((a) => {
        const orb =
          typeof a.orb === 'number'
            ? locale === 'en'
              ? `, orb ${Math.abs(a.orb).toFixed(1)}°`
              : locale === 'es'
                ? `, orbe ${Math.abs(a.orb).toFixed(1)}°`
                : `, орб ${Math.abs(a.orb).toFixed(1)}°`
            : '';
        const strength =
          typeof a.strength === 'number'
            ? locale === 'en'
              ? `, strength ${Math.round(a.strength * 100)}%`
              : locale === 'es'
                ? `, fuerza ${Math.round(a.strength * 100)}%`
                : `, сила ${Math.round(a.strength * 100)}%`
            : '';
        return `${this.getPlanetName(a.planetA, locale)} ${this.getAspectName(a.aspect, locale)} ${this.getPlanetName(a.planetB, locale)}${orb}${strength}`;
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
        const sign = planet.sign
          ? this.getLocalizedSign(planet.sign, locale)
          : fallbackSign;
        const degree =
          typeof planet.degree === 'number'
            ? `${planet.degree.toFixed(1)}°`
            : typeof planet.longitude === 'number'
              ? `${(planet.longitude % 30).toFixed(1)}°`
              : '';
        const house =
          typeof planet.house === 'number'
            ? locale === 'en'
              ? `, house ${planet.house}`
              : locale === 'es'
                ? `, casa ${planet.house}`
                : `, дом ${planet.house}`
            : '';
        const retrograde = planet.retrograde
          ? locale === 'en'
            ? ', retrograde'
            : locale === 'es'
              ? ', retrógrado'
              : ', ретроградный'
          : '';
        return `${this.getPlanetName(key, locale)}: ${sign}${degree ? ` ${degree}` : ''}${house}${retrograde}`;
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
        const degree =
          typeof house?.cusp === 'number'
            ? ` ${(house.cusp % 30).toFixed(1)}°`
            : '';
        const sign = house?.sign
          ? this.getLocalizedSign(house.sign, locale)
          : fallbackSign;
        return `${label} ${key}: ${sign}${degree}`;
      })
      .join(', ');
  }

  private getDominantPlanetaryFocus(
    planets: any,
    locale: AILocale = 'ru',
  ): string {
    if (!planets) {
      return locale === 'en'
        ? 'No clear dominant focus available'
        : locale === 'es'
          ? 'No hay un foco dominante claro'
          : 'Нет данных для определения доминирующего фокуса';
    }

    const houseCounts = new Map<number, string[]>();
    for (const [key, planet] of Object.entries<any>(planets)) {
      if (typeof planet?.house !== 'number') continue;
      const existing = houseCounts.get(planet.house) || [];
      existing.push(this.getPlanetName(key, locale));
      houseCounts.set(planet.house, existing);
    }

    const dominantHouse = Array.from(houseCounts.entries()).sort(
      (a, b) => b[1].length - a[1].length,
    )[0];

    if (!dominantHouse) {
      return locale === 'en'
        ? 'House concentration is not explicit'
        : locale === 'es'
          ? 'La concentración por casas no es explícita'
          : 'Выраженной концентрации по домам нет';
    }

    const [houseNum, planetsInHouse] = dominantHouse;
    if (locale === 'en') {
      return `Strongest house concentration: house ${houseNum} (${planetsInHouse.join(', ')}).`;
    }
    if (locale === 'es') {
      return `Mayor concentración en la casa ${houseNum} (${planetsInHouse.join(', ')}).`;
    }
    return `Наиболее выраженная концентрация в ${houseNum}-м доме (${planetsInHouse.join(', ')}).`;
  }

  private getAngularAxisDescription(
    houses: any,
    ascendant: any,
    locale: AILocale = 'ru',
  ): string {
    const asc =
      typeof ascendant === 'string'
        ? ascendant
        : ascendant?.sign
          ? `${this.getLocalizedSign(ascendant.sign, locale)}${typeof ascendant.degree === 'number' ? ` ${ascendant.degree.toFixed(1)}°` : ''}`
          : this.getAscendantFromHouses(houses, locale);

    const house4 = houses?.[4] ?? houses?.['4'];
    const house7 = houses?.[7] ?? houses?.['7'];
    const house10 = houses?.[10] ?? houses?.['10'];

    const formatAngle = (house: any) => {
      if (!house?.sign) {
        return locale === 'en'
          ? 'unknown'
          : locale === 'es'
            ? 'desconocido'
            : 'неизвестно';
      }
      return `${this.getLocalizedSign(house.sign, locale)}${typeof house?.cusp === 'number' ? ` ${(house.cusp % 30).toFixed(1)}°` : ''}`;
    };

    const ic = formatAngle(house4);
    const dsc = formatAngle(house7);
    const mc = formatAngle(house10);

    if (locale === 'en') {
      return `ASC: ${asc}; IC: ${ic}; DSC: ${dsc}; MC: ${mc}.`;
    }
    if (locale === 'es') {
      return `ASC: ${asc}; IC: ${ic}; DSC: ${dsc}; MC: ${mc}.`;
    }
    return `ASC: ${asc}; IC: ${ic}; DSC: ${dsc}; MC: ${mc}.`;
  }

  private getLocalizedSign(sign: string, locale: AILocale = 'ru'): string {
    const knownSigns = new Set([
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ]);

    if (!knownSigns.has(sign)) return sign;
    return getSignNameLocalized(sign as Sign, locale);
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
