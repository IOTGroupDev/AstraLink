/**
 * AI Provider Interface
 * Strategy Pattern interface for all AI providers
 */

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
   * @returns Generated text
   */
  generate(prompt: string, retries?: number): Promise<string>;

  /**
   * Generate streaming text completion
   * @param prompt - Input prompt
   * @returns Async generator yielding text chunks
   */
  stream(prompt: string): AsyncGenerator<string, void, unknown>;
}
