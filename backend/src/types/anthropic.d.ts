declare module '@anthropic-ai/sdk' {
  export default class Anthropic {
    constructor(options?: { apiKey?: string });
    messages: {
      create(options: {
        model: string;
        max_tokens: number;
        temperature?: number;
        system?: string;
        messages: Array<{
          role: 'user' | 'assistant';
          content: string;
        }>;
      }): Promise<{
        content: Array<{ text: string; type?: string }>;
      }>;
    };
  }
}
