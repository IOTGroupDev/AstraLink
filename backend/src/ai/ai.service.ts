import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClaudeProvider } from './claude.provider';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';

export enum AIProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  DEEPSEEK = 'deepseek',
}

@Injectable()
export class AIService {
  constructor(
    private configService: ConfigService,
    private claudeProvider: ClaudeProvider,
    private openAIProvider: OpenAIProvider,
    private deepSeekProvider: DeepSeekProvider,
  ) {}

  async generateText(
    prompt: string,
    provider: AIProvider = AIProvider.CLAUDE,
    options?: any,
  ): Promise<string> {
    switch (provider) {
      case AIProvider.CLAUDE:
        return this.claudeProvider.generateText(prompt, options);
      case AIProvider.OPENAI:
        return this.openAIProvider.generateText(prompt, options);
      case AIProvider.DEEPSEEK:
        return this.deepSeekProvider.generateText(prompt, options);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  async chat(
    messages: any[],
    provider: AIProvider = AIProvider.CLAUDE,
    options?: any,
  ): Promise<any> {
    switch (provider) {
      case AIProvider.CLAUDE:
        return this.claudeProvider.chat(messages, options);
      case AIProvider.OPENAI:
        return this.openAIProvider.chat(messages, options);
      case AIProvider.DEEPSEEK:
        return this.deepSeekProvider.chat(messages, options);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }
}
