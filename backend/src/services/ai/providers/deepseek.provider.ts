/**
 * DeepSeek Provider
 * DeepSeek-chat implementation with competitive pricing
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BaseAIProvider } from './base-ai-provider';

@Injectable()
export class DeepSeekProvider extends BaseAIProvider {
  readonly name = 'deepseek';
  private client: OpenAI | null = null;
  private readonly model = 'deepseek-chat';

  constructor(private configService: ConfigService) {
    super('DeepSeekProvider');
    this.initialize();
  }

  /**
   * Initialize DeepSeek client (OpenAI-compatible API)
   */
  private initialize(): void {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');

    if (!apiKey) {
      this.logger.warn('⚠️  DEEPSEEK_API_KEY not configured');
      return;
    }

    try {
      // @ts-expect-error - baseURL is supported but types are outdated
      this.client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com',
      });
      this.logger.log('✅ DeepSeek AI initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to initialize DeepSeek:', errorMessage);
    }
  }

  /**
   * Check if DeepSeek is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate text with DeepSeek (with retry logic)
   */
  async generate(prompt: string, retries = 3): Promise<string> {
    if (!this.client) {
      throw new Error('DeepSeek not initialized');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();

        // @ts-expect-error - response_format is supported but types are outdated
        const completion = await this.client.chat.completions.create({
          model: this.model,
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
          response_format: { type: 'json_object' }, // JSON mode
        });

        const duration = Date.now() - startTime;
        const content = completion.choices[0]?.message?.content || '';

        // Track usage and costs
        this.logUsage(completion, duration, attempt + 1);

        return content;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;

        this.logger.warn(
          `DeepSeek attempt ${attempt + 1}/${retries} failed: ${errorMessage}`,
        );

        if (attempt === retries - 1) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = this.calculateBackoff(attempt);
        this.logger.log(`Retrying in ${backoffMs}ms...`);
        await this.sleep(backoffMs);
      }
    }

    this.logger.error(
      `❌ DeepSeek failed after ${retries} attempts: ${lastError?.message}`,
    );
    throw lastError || new Error('DeepSeek generation failed');
  }

  /**
   * Stream text generation with DeepSeek
   */
  async *stream(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('DeepSeek not initialized');
    }

    try {
      const startTime = Date.now();

      // @ts-expect-error - stream mode is supported but types are outdated
      const stream = await this.client.chat.completions.create({
        model: this.model,
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
        stream: true,
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

      // Log streaming completion
      this.logger.log({
        provider: this.name,
        model: this.model,
        mode: 'streaming',
        duration: `${duration}ms`,
        approximateChars: fullContent.length,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ DeepSeek streaming failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Log usage statistics and costs
   */
  private logUsage(completion: any, duration: number, attempt: number): void {
    const usage = completion.usage;
    if (!usage) return;

    // DeepSeek pricing (January 2025) - Very competitive!
    const inputCostPer1M = 0.14; // $0.14 per 1M input tokens (cache miss)
    const outputCostPer1M = 0.28; // $0.28 per 1M output tokens

    const inputCost = (usage.prompt_tokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.completion_tokens / 1_000_000) * outputCostPer1M;
    const totalCost = inputCost + outputCost;

    this.logger.log({
      provider: this.name,
      model: this.model,
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
}
