/**
 * AI Module
 * Provides AI providers using Strategy Pattern
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { DeepSeekProvider } from './providers/deepseek.provider';

@Module({
  imports: [ConfigModule],
  providers: [ClaudeProvider, OpenAIProvider, DeepSeekProvider],
  exports: [ClaudeProvider, OpenAIProvider, DeepSeekProvider],
})
export class AIProvidersModule {}
