import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

interface AIGenerationContext {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  planets: any;
  houses: any;
  aspects: any[];
  transits: any[];
  period: string;
  userProfile?: {
    name?: string;
    birthDate?: string;
    birthPlace?: string;
  };
}

type AIProvider = 'claude' | 'openai' | 'none';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private anthropic: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private provider: AIProvider = 'none';

  constructor(private configService: ConfigService) {
    this.initializeAIProviders();
  }

  /**
   * Инициализация AI провайдеров (оба могут быть доступны одновременно)
   */
  private initializeAIProviders() {
    // Приоритет: Claude > OpenAI
    const claudeKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    let claudeInitialized = false;
    let openaiInitialized = false;

    // Initialize Claude if key available
    if (claudeKey) {
      try {
        this.anthropic = new Anthropic({ apiKey: claudeKey });
        claudeInitialized = true;
        this.logger.log('✅ Claude AI (Anthropic) инициализирован');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('❌ Ошибка инициализации Claude:', errorMessage);
      }
    }

    // Initialize OpenAI if key available
    if (openaiKey) {
      try {
        this.openai = new OpenAI({ apiKey: openaiKey });
        openaiInitialized = true;
        this.logger.log('✅ OpenAI GPT инициализирован');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error('❌ Ошибка инициализации OpenAI:', errorMessage);
      }
    }

    // Set primary provider (Claude has priority)
    if (claudeInitialized) {
      this.provider = 'claude';
      this.logger.log('🎯 Primary provider: Claude');
    } else if (openaiInitialized) {
      this.provider = 'openai';
      this.logger.log('🎯 Primary provider: OpenAI');
    } else {
      this.provider = 'none';
      this.logger.warn(
        '⚠️ AI провайдеры не настроены - используются только правила интерпретации',
      );
    }

    // Log fallback availability
    if (claudeInitialized && openaiInitialized) {
      this.logger.log(
        '✅ Оба провайдера доступны - автоматический fallback активен',
      );
    }
  }

  /**
   * Генерация персонализированного гороскопа через AI с автоматическим fallback (ТОЛЬКО ДЛЯ PREMIUM)
   */
  async generateHoroscope(context: AIGenerationContext): Promise<{
    general: string;
    love: string;
    career: string;
    health: string;
    finance: string;
    advice: string;
    challenges: string[];
    opportunities: string[];
  }> {
    if (!this.isAvailable()) {
      throw new Error(
        'AI сервис недоступен - необходим API ключ Claude или OpenAI',
      );
    }

    this.logger.log(
      `🤖 Генерация PREMIUM гороскопа через ${this.provider.toUpperCase()}`,
    );

    const prompt = this.buildHoroscopePrompt(context);
    let response: string;

    try {
      // Try primary provider
      if (this.provider === 'claude') {
        response = await this.generateWithClaude(prompt);
      } else {
        response = await this.generateWithOpenAI(prompt);
      }

      return this.parseAIResponse(response);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка генерации через ${this.provider}:`,
        error,
      );

      // 🔄 Automatic fallback to alternative provider
      if (this.provider === 'claude' && this.openai) {
        this.logger.log('🔄 Attempting fallback to OpenAI...');
        try {
          response = await this.generateWithOpenAI(prompt);
          return this.parseAIResponse(response);
        } catch (fallbackError) {
          this.logger.error('❌ Fallback to OpenAI also failed:', fallbackError);
        }
      } else if (this.provider === 'openai' && this.anthropic) {
        this.logger.log('🔄 Attempting fallback to Claude...');
        try {
          response = await this.generateWithClaude(prompt);
          return this.parseAIResponse(response);
        } catch (fallbackError) {
          this.logger.error('❌ Fallback to Claude also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Генерация через Claude (Anthropic) с retry логикой и cost tracking
   */
  private async generateWithClaude(
    prompt: string,
    retries = 3,
  ): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude не инициализирован');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();

        const message = await this.anthropic.messages.create({
          model: 'claude-sonnet-4-5-20250929', // ✅ Latest Claude Sonnet 4.5
          max_tokens: 2000,
          temperature: 0.7,
          system: this.getSystemPrompt(),
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const duration = Date.now() - startTime;
        const content =
          message.content[0].type === 'text' ? message.content[0].text : '';

        // ✅ Track usage and costs
        this.logClaudeUsage(message, duration, attempt + 1);

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        this.logger.warn(
          `Claude attempt ${attempt + 1}/${retries} failed: ${errorMessage}`,
        );

        // Don't retry on final attempt
        if (attempt === retries - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    this.logger.error(
      `❌ Claude failed after ${retries} attempts: ${lastError?.message}`,
    );
    throw lastError || new Error('Claude generation failed');
  }

  /**
   * Log Claude usage statistics and costs
   */
  private logClaudeUsage(message: any, duration: number, attempt: number): void {
    const usage = message.usage;
    if (!usage) return;

    // Claude Sonnet 4.5 pricing (December 2024)
    const inputCostPer1M = 3.0; // $3.00 per 1M input tokens
    const outputCostPer1M = 15.0; // $15.00 per 1M output tokens

    const inputCost = (usage.input_tokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.output_tokens / 1_000_000) * outputCostPer1M;
    const totalCost = inputCost + outputCost;

    this.logger.log({
      provider: 'claude',
      model: 'claude-sonnet-4-5',
      attempt,
      duration: `${duration}ms`,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      totalTokens: usage.input_tokens + usage.output_tokens,
      estimatedCost: `$${totalCost.toFixed(6)}`,
      costBreakdown: {
        input: `$${inputCost.toFixed(6)}`,
        output: `$${outputCost.toFixed(6)}`,
      },
    });
  }

  /**
   * Генерация через OpenAI GPT с retry логикой и cost tracking
   */
  private async generateWithOpenAI(
    prompt: string,
    retries = 3,
  ): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI не инициализирован');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();

        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini', // ✅ Updated to gpt-4o-mini (98% cost reduction)
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' }, // ✅ JSON mode for reliable parsing
        });

        const duration = Date.now() - startTime;
        const content = completion.choices[0]?.message?.content || '';

        // ✅ Track usage and costs
        this.logOpenAIUsage(completion, duration, attempt + 1);

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        this.logger.warn(
          `OpenAI attempt ${attempt + 1}/${retries} failed: ${errorMessage}`,
        );

        // Don't retry on final attempt
        if (attempt === retries - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.pow(2, attempt) * 1000;
        this.logger.log(`Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    this.logger.error(
      `❌ OpenAI failed after ${retries} attempts: ${lastError?.message}`,
    );
    throw lastError || new Error('OpenAI generation failed');
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log OpenAI usage statistics and costs
   */
  private logOpenAIUsage(
    completion: any,
    duration: number,
    attempt: number,
  ): void {
    const usage = completion.usage;
    if (!usage) return;

    // gpt-4o-mini pricing (December 2024)
    const inputCostPer1M = 0.15; // $0.15 per 1M input tokens
    const outputCostPer1M = 0.6; // $0.60 per 1M output tokens

    const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPer1M;
    const totalCost = inputCost + outputCost;

    this.logger.log({
      provider: 'openai',
      model: 'gpt-4o-mini',
      attempt,
      duration: `${duration}ms`,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost: `$${totalCost.toFixed(6)}`,
      costBreakdown: {
        input: `$${inputCost.toFixed(6)}`,
        output: `$${outputCost.toFixed(6)}`,
      },
    });
  }

  /**
   * Генерация детальной интерпретации натальной карты через AI с автоматическим fallback (ТОЛЬКО ДЛЯ PREMIUM)
   */
  async generateChartInterpretation(context: {
    planets: any;
    houses: any;
    aspects: any[];
    userProfile?: any;
  }): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('AI сервис недоступен');
    }

    this.logger.log(
      `🤖 Генерация PREMIUM интерпретации через ${this.provider.toUpperCase()}`,
    );

    const prompt = this.buildInterpretationPrompt(context);

    try {
      // Try primary provider
      if (this.provider === 'claude') {
        return await this.generateWithClaude(prompt);
      } else {
        return await this.generateWithOpenAI(prompt);
      }
    } catch (error) {
      this.logger.error(
        `❌ Ошибка генерации интерпретации через ${this.provider}:`,
        error,
      );

      // 🔄 Automatic fallback to alternative provider
      if (this.provider === 'claude' && this.openai) {
        this.logger.log('🔄 Attempting fallback to OpenAI...');
        try {
          return await this.generateWithOpenAI(prompt);
        } catch (fallbackError) {
          this.logger.error('❌ Fallback to OpenAI also failed:', fallbackError);
        }
      } else if (this.provider === 'openai' && this.anthropic) {
        this.logger.log('🔄 Attempting fallback to Claude...');
        try {
          return await this.generateWithClaude(prompt);
        } catch (fallbackError) {
          this.logger.error('❌ Fallback to Claude also failed:', fallbackError);
        }
      }

      throw error;
    }
  }

  /**
   * Системный промпт для AI - определяет роль и стиль
   */
  private getSystemPrompt(): string {
    return `Вы - профессиональный астролог с 25-летним опытом практики. 
Ваш стиль сочетает традиционную астрологию с современным психологическим подходом.

ВАЖНО: Вы работаете ТОЛЬКО с PREMIUM пользователями, которые платят за детальный AI-анализ.

Ключевые принципы:
- Вы всегда позитивны и ободряющи, но честны
- Вы видите в вызовах возможности для роста
- Вы даете конкретные, практичные советы
- Вы используете понятный, доступный язык без излишнего жаргона
- Вы персонализируете каждое предсказание, учитывая уникальность карты
- Вы соблюдаете этические принципы и не пугаете клиентов

Формат ответа:
- Используйте короткие, легко читаемые абзацы
- Начинайте с позитивного контекста
- Заканчивайте практическим советом
- Избегайте излишней драматизации

Язык: Русский, неформальный но профессиональный стиль.`;
  }

  /**
   * Построение промпта для генерации гороскопа
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
   * Построение промпта для интерпретации натальной карты
   */
  private buildInterpretationPrompt(context: any): string {
    return `Создайте детальную PREMIUM астрологическую интерпретацию натальной карты:

ПЛАНЕТЫ В ЗНАКАХ:
${this.formatPlanets(context.planets)}

ДОМА:
${this.formatHouses(context.houses)}

АСПЕКТЫ:
${this.formatAspects(context.aspects)}

Создайте глубокую, инсайтную интерпретацию, которая раскроет:
1. Основные черты личности
2. Ключевые таланты и способности
3. Жизненные вызовы и уроки
4. Кармические темы
5. Потенциал развития
6. Рекомендации по использованию энергий

Текст должен быть:
- Вдохновляющим и мотивирующим
- Глубоким но понятным
- Практичным и применимым
- 800-1000 слов
- Это PREMIUM интерпретация - максимально детально

Начните с общего обзора энергии карты, затем углубитесь в детали.`;
  }

  /**
   * Парсинг ответа от AI (improved with JSON mode support)
   */
  private parseAIResponse(response: string): any {
    try {
      // With JSON mode, response should be valid JSON
      const parsed = JSON.parse(response);

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
   * Парсинг текстового ответа (fallback)
   */
  private parseTextResponse(response: string): any {
    const sections = {
      general: '',
      love: '',
      career: '',
      health: '',
      finance: '',
      advice: '',
      challenges: [],
      opportunities: [],
    };

    // Простой парсинг по ключевым словам
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
   * Форматирование транзитов для промпта
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
   * Форматирование аспектов для промпта
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
   * Форматирование планет для промпта
   */
  private formatPlanets(planets: any): string {
    if (!planets) return 'Планеты не указаны';

    return Object.entries(planets)
      .map(([key, planet]: [string, any]) => {
        return `- ${this.getPlanetName(key)}: ${planet.sign} (дом ${planet.house || '?'})`;
      })
      .join('\n');
  }

  /**
   * Форматирование домов для промпта
   */
  private formatHouses(houses: any): string {
    if (!houses) return 'Дома не указаны';

    return Object.entries(houses)
      .slice(0, 12)
      .map(([num, house]: [string, any]) => {
        return `- Дом ${num}: ${house.sign}`;
      })
      .join('\n');
  }

  /**
   * Получить название планеты на русском
   */
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

  /**
   * Получить название аспекта на русском
   */
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

  /**
   * 🌊 STREAMING: Generate horoscope with real-time chunks (PREMIUM only)
   */
  async *generateHoroscopeStream(
    context: AIGenerationContext,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.isAvailable()) {
      throw new Error(
        'AI сервис недоступен - необходим API ключ Claude или OpenAI',
      );
    }

    this.logger.log(
      `🌊 Генерация STREAMING гороскопа через ${this.provider.toUpperCase()}`,
    );

    const prompt = this.buildHoroscopePrompt(context);

    if (this.provider === 'claude') {
      yield* this.streamWithClaude(prompt);
    } else if (this.provider === 'openai') {
      yield* this.streamWithOpenAI(prompt);
    } else {
      throw new Error('No AI provider available for streaming');
    }
  }

  /**
   * Stream generation with Claude
   */
  private async *streamWithClaude(
    prompt: string,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.anthropic) {
      throw new Error('Claude не инициализирован');
    }

    try {
      const startTime = Date.now();

      const stream = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2000,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true, // ✅ Enable streaming
      });

      let fullContent = '';

      // @ts-ignore - Claude SDK streaming types
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta?.type === 'text_delta'
        ) {
          const content = event.delta.text || '';
          if (content) {
            fullContent += content;
            yield content;
          }
        }
      }

      const duration = Date.now() - startTime;

      // Log streaming completion (approximate token count)
      this.logger.log({
        provider: 'claude',
        model: 'claude-sonnet-4-5',
        mode: 'streaming',
        duration: `${duration}ms`,
        approximateChars: fullContent.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Claude streaming failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stream generation with OpenAI
   */
  private async *streamWithOpenAI(
    prompt: string,
  ): AsyncGenerator<string, void, unknown> {
    if (!this.openai) {
      throw new Error('OpenAI не инициализирован');
    }

    try {
      const startTime = Date.now();

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        stream: true, // ✅ Enable streaming
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          yield content;
        }
      }

      const duration = Date.now() - startTime;

      // Log streaming completion (approximate token count)
      this.logger.log({
        provider: 'openai',
        model: 'gpt-4o-mini',
        mode: 'streaming',
        duration: `${duration}ms`,
        approximateChars: fullContent.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAI streaming failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Проверка доступности AI
   */
  isAvailable(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Получить текущего провайдера
   */
  getProvider(): AIProvider {
    return this.provider;
  }
}
