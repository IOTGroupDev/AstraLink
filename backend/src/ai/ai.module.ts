import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { ClaudeProvider } from './claude.provider';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    ClaudeProvider,
    OpenAIProvider,
    DeepSeekProvider,
    AIService,
  ],
  exports: [AIService],
})
export class AIModule {}
