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
   * Инициализация AI провайдеров
   */
  private initializeAIProviders() {
    // Приоритет: Claude > OpenAI
    const claudeKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (claudeKey) {
      try {
        this.anthropic = new Anthropic({ apiKey: claudeKey });
        this.provider = 'claude';
        this.logger.log('✅ Claude AI (Anthropic) инициализирован');
        return;
      } catch (error) {
        this.logger.error('❌ Ошибка инициализации Claude:', error.message);
      }
    }

    if (openaiKey) {
      try {
        this.openai = new OpenAI({ apiKey: openaiKey });
        this.provider = 'openai';
        this.logger.log('✅ OpenAI GPT инициализирован');
        return;
      } catch (error) {
        this.logger.error('❌ Ошибка инициализации OpenAI:', error.message);
      }
    }

    this.logger.warn(
      '⚠️ AI провайдеры не настроены - используются только правила интерпретации',
    );
  }

  /**
   * Генерация персонализированного гороскопа через AI (ТОЛЬКО ДЛЯ PREMIUM)
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

    try {
      const prompt = this.buildHoroscopePrompt(context);
      let response: string;

      if (this.provider === 'claude') {
        response = await this.generateWithClaude(prompt);
      } else {
        response = await this.generateWithOpenAI(prompt);
      }

      return this.parseAIResponse(response);
    } catch (error) {
      this.logger.error(
        `❌ Ошибка генерации AI-гороскопа (${this.provider}):`,
        error,
      );
      throw error;
    }
  }

  /**
   * Генерация через Claude (Anthropic)
   */
  private async generateWithClaude(prompt: string): Promise<string> {
    if (!this.anthropic) {
      throw new Error('Claude не инициализирован');
    }

    const message = await this.anthropic.messages.create({
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
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  /**
   * Генерация через OpenAI GPT
   */
  private async generateWithOpenAI(prompt: string): Promise<string> {
    if (!this.openai) {
      throw new Error('OpenAI не инициализирован');
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
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
    });

    return completion.choices[0]?.message?.content || '';
  }

  /**
   * Генерация детальной интерпретации натальной карты через AI (ТОЛЬКО ДЛЯ PREMIUM)
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

    try {
      const prompt = this.buildInterpretationPrompt(context);

      if (this.provider === 'claude') {
        return await this.generateWithClaude(prompt);
      } else {
        return await this.generateWithOpenAI(prompt);
      }
    } catch (error) {
      this.logger.error(
        `❌ Ошибка генерации AI-интерпретации (${this.provider}):`,
        error,
      );
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

Пожалуйста, создайте детальный гороскоп в следующем формате JSON:

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

Важно:
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
   * Парсинг ответа от AI
   */
  private parseAIResponse(response: string): any {
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }

      // Если JSON не найден, парсим текст
      return this.parseTextResponse(response);
    } catch (error) {
      this.logger.error('Ошибка парсинга AI-ответа:', error);
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
