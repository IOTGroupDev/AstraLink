import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EphemerisService } from './ephemeris.service';
import { InterpretationService } from './interpretation.service';
import { HoroscopeGeneratorService } from './horoscope-generator.service';
import { AIService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { LunarService } from './lunar.service';
import { RepositoriesModule } from '../repositories';
import { AIProvidersModule } from './ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule, // Добавляем для доступа к SupabaseService
    ConfigModule, // Нужен для ConfigService
    RepositoriesModule, // Для ChartRepository
    AIProvidersModule, // AI Providers (Strategy Pattern)
  ],
  providers: [
    AIService, // AIService with injected providers
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
  exports: [
    AIService,
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
})
export class ServicesModule {}
