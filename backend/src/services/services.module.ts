// backend/src/services/services.module.ts (финальная версия с AI)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EphemerisService } from './ephemeris.service';
import { InterpretationService } from './interpretation.service';
import { HoroscopeGeneratorService } from './horoscope-generator.service';
import { AIService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { LunarService } from './lunar.service';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule, // Добавляем для доступа к SupabaseService
    ConfigModule, // Нужен для ConfigService в AIService
  ],
  providers: [
    AIService, // Добавляем AI Service
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
  exports: [
    AIService, // Экспортируем для использования в других модулях
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
    LunarService,
  ],
})
export class ServicesModule {}
