import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIService } from './ai.service';
import { ClaudeProvider } from './claude.provider';
import { OpenAIProvider } from './openai.provider';
import { DeepSeekProvider } from './deepseek.provider';
import { HoroscopeGeneratorService } from './horoscope-generator.service';
import { ServicesModule } from '../services/services.module';
import { RedisModule } from '../redis/redis.module';
import { ChartModule } from '../chart/chart.module';

@Module({
  imports: [ConfigModule, ServicesModule, RedisModule, ChartModule],
  providers: [
    ClaudeProvider,
    OpenAIProvider,
    DeepSeekProvider,
    AIService,
    HoroscopeGeneratorService,
  ],
  exports: [AIService, HoroscopeGeneratorService],
})
export class AIModule {}
