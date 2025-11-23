/**
 * Claude AI Provider
 * Anthropic Claude Sonnet 4.5 implementation
 */
{
  /* eslint-disable */
}
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base-ai-provider';

@Injectable()
export class ClaudeProvider extends BaseAIProvider {
  readonly name = 'claude';
  private client: Anthropic | null = null;
  private readonly model = 'claude-sonnet-4-5-20250929';

  constructor(private configService: ConfigService) {
    super('ClaudeProvider');
    this.initialize();
  }

  /**
   * Initialize Anthropic client
   */
  private initialize(): void {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn('⚠️  ANTHROPIC_API_KEY not configured');
      return;
    }

    try {
      this.client = new Anthropic({ apiKey });
      this.logger.log('✅ Claude AI (Anthropic) initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Failed to initialize Claude:', errorMessage);
    }
  }

  /**
   * Check if Claude is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Generate text with Claude (with retry logic)
   */
  async generate(prompt: string, retries = 3): Promise<string> {
    if (!this.client) {
      throw new Error('Claude not initialized');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const startTime = Date.now();

        const message = await this.client.messages.create({
          model: this.model,
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

        // Track usage and costs
        this.logUsage(message, duration, attempt + 1);

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
        const backoffMs = this.calculateBackoff(attempt);
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
   * Stream text generation with Claude
   */
  async *stream(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.client) {
      throw new Error('Claude not initialized');
    }

    try {
      const startTime = Date.now();

      // @ts-expect-error - stream mode is supported but types are outdated
      const stream = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0.7,
        system: this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: true,
      });

      let fullContent = '';

      // @ts-expect-error - Claude SDK streaming types
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

      // Log streaming completion
      this.logger.log({
        provider: this.name,
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
   * Log usage statistics and costs
   */
  private logUsage(message: any, duration: number, attempt: number): void {
    const usage = message.usage;
    if (!usage) return;

    // Claude Sonnet 4.5 pricing (December 2024)
    const inputCostPer1M = 3.0; // $3.00 per 1M input tokens
    const outputCostPer1M = 15.0; // $15.00 per 1M output tokens

    const inputCost = (usage.input_tokens / 1_000_000) * inputCostPer1M;
    const outputCost = (usage.output_tokens / 1_000_000) * outputCostPer1M;
    const totalCost = inputCost + outputCost;

    this.logger.log({
      provider: this.name,
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
}
