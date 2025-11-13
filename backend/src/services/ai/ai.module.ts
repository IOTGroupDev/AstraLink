/**
 * AI Module
 * Provides AI providers and AIService using Strategy Pattern
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { AIService } from '../ai.service';

@Module({
  imports: [ConfigModule],
  providers: [
    ClaudeProvider,
    OpenAIProvider,
    DeepSeekProvider,
    AIService,
  ],
  exports: [
    ClaudeProvider,
    OpenAIProvider,
    DeepSeekProvider,
    AIService,
  ],
})
export class AIProvidersModule {}
