/**
 * Base AI Provider
 * Abstract base class with shared functionality for all AI providers
 */

import { Logger } from '@nestjs/common';
import { IAIProvider } from '../interfaces/ai-provider.interface';

export abstract class BaseAIProvider implements IAIProvider {
  protected readonly logger: Logger;

  constructor(loggerName: string) {
    this.logger = new Logger(loggerName);
  }

  abstract readonly name: string;
  abstract isAvailable(): boolean;
  abstract generate(prompt: string, retries?: number): Promise<string>;
  abstract stream(prompt: string): AsyncGenerator<string, void, unknown>;

  /**
   * Sleep utility for retry backoff
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * System prompt for horoscope generation
   */
  protected getSystemPrompt(): string {
    return `Ты профессиональный астролог с глубокими знаниями натальной астрологии, транзитов и психологии.

Твоя задача — создавать персонализированные гороскопы на основе натальной карты и текущих транзитов.

ВАЖНО:
- Используй ТОЛЬКО предоставленные данные натальной карты и транзитов
- НЕ выдумывай транзиты или аспекты, которых нет в данных
- Анализируй взаимодействие транзитных планет с натальными позициями
- Учитывай силу и орб аспектов (указаны в данных)
- Давай конкретные, практические советы
- Пиши тепло, поддерживающе, но честно
- Используй профессиональную астрологическую терминологию, но понятно объясняй

СТРУКТУРА ОТВЕТА (обязательно следуй этому формату JSON):
{
  "general": "Общий прогноз на период",
  "love": "Любовь и отношения",
  "career": "Карьера и профессиональная деятельность",
  "health": "Здоровье и энергия",
  "finance": "Финансы и материальные вопросы",
  "advice": "Главный совет на период",
  "challenges": ["Вызов 1", "Вызов 2", "Вызов 3"],
  "opportunities": ["Возможность 1", "Возможность 2", "Возможность 3"]
}`;
  }

  /**
   * Calculate exponential backoff delay
   */
  protected calculateBackoff(attempt: number): number {
    return Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, 8s...
  }
}
