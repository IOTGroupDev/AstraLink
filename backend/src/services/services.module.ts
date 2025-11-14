import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EphemerisService } from './ephemeris.service';
import { InterpretationService } from './interpretation.service';
import { HoroscopeGeneratorService } from './horoscope-generator.service';
import { AIService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { LunarService } from './lunar.service';
import { RepositoriesModule } from '../repositories';
import { AIProvidersModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    ConfigModule,
    RedisModule,
    RepositoriesModule,
    AIProvidersModule, // Provides ClaudeProvider, OpenAIProvider, DeepSeekProvider, AIService
  ],
  providers: [
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
  exports: [
    AIService, // Export AIService (comes from AIProvidersModule)
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
})
export class ServicesModule {}
