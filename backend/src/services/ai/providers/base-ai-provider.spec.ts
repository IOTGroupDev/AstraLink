import { BaseAIProvider } from './base-ai-provider';
import type { AIGenerateOptions } from '../interfaces/ai-types';

class Provider extends BaseAIProvider {
  readonly name = 'test';
  constructor() {
    super('Test');
  }
  isAvailable() {
    return true;
  }
  async generate() {
    return '';
  }
  async *stream() {
    yield '';
  }
  budget(options?: AIGenerateOptions) {
    return this.generationBudget(options);
  }
}
describe('AI request budget', () => {
  afterEach(() => jest.useRealTimers());
  it('shares one deadline across retries and disables nested SDK retries', () => {
    jest.useFakeTimers();
    const budget = new Provider().budget({ timeoutMs: 1000 });
    expect(budget.requestOptions()).toMatchObject({
      timeout: 1000,
      maxRetries: 0,
    });
    jest.advanceTimersByTime(700);
    expect(budget.requestOptions().timeout).toBe(300);
    jest.advanceTimersByTime(301);
    expect(budget.canRetry()).toBe(false);
    expect(() => budget.requestOptions()).toThrow();
  });
  it('honors cancellation and caps caller timeouts at 30 seconds', () => {
    const abort = new AbortController();
    const budget = new Provider().budget({
      timeoutMs: 120_000,
      signal: abort.signal,
    });
    expect(budget.requestOptions().timeout).toBeLessThanOrEqual(30_000);
    abort.abort();
    expect(budget.canRetry()).toBe(false);
    expect(() => budget.requestOptions()).toThrow();
  });
});
