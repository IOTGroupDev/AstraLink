/**
 * OpenAI Provider
 * GPT-4o-mini implementation with 98% cost reduction
 */

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { BaseAIProvider } from './base-ai-provider';

@Injectable()
export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  private readonly model = 'gpt-4o-mini';

  constructor(private configService: ConfigService) {
    super('OpenAIProvider');
    this.initialize();
  }

  /**
   * Initialize OpenAI client
   */
  private initialize(): void {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('⚠️  OPENAI_API_KEY not configured');
      return;
    }

    try {
      this.client = new OpenAI({ apiKey });
      this.logger.log('✅ OpenAI GPT initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to initialize OpenAI:', errorMessage);
    }
  }

  /**
   * Check if OpenAI is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate text with OpenAI (with retry logic)
   */
  async generate(prompt: string, retries = 3): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI not initialized');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();

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
          response_format: { type: 'json_object' }, // JSON mode for reliable parsing
        } as any);

        const duration = Date.now() - startTime;
        const content = completion.choices[0]?.message?.content || '';

        // Track usage and costs
        this.logUsage(completion, duration, attempt + 1);

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
        const backoffMs = this.calculateBackoff(attempt);
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
   * Stream text generation with OpenAI
   */
  async *stream(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('OpenAI not initialized');
    }

    try {
      const startTime = Date.now();

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
      } as any);

      let fullContent = '';

      for await (const chunk of stream as any) {
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
      this.logger.error(`❌ OpenAI streaming failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Log usage statistics and costs
   */
  private logUsage(completion: any, duration: number, attempt: number): void {
    const usage = completion.usage;
    if (!usage) return;

    // gpt-4o-mini pricing (December 2024)
    const inputCostPer1M = 0.15; // $0.15 per 1M input tokens
    const outputCostPer1M = 0.6; // $0.60 per 1M output tokens

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
