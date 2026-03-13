/**
 * AI Provider Interface
 * Strategy Pattern interface for all AI providers
 */

import type { AILocale } from './ai-types';

export interface IAIProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Check if provider is initialized and available
   */
  isAvailable(): boolean;

  /**
   * Generate text completion with retry logic
   * @param prompt - Input prompt
   * @param retries - Number of retry attempts (default: 3)
   * @param locale - Output locale
   * @returns Generated text
   */
  generate(
    prompt: string,
    retries?: number,
    locale?: AILocale,
  ): Promise<string>;

  /**
   * Generate streaming text completion
   * @param prompt - Input prompt
   * @param locale - Output locale
   * @returns Async generator yielding text chunks
   */
  stream(
    prompt: string,
    locale?: AILocale,
  ): AsyncGenerator<string, void, unknown>;
}
