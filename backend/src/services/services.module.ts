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

@Module({
  imports: [
    PrismaModule,
    SupabaseModule, // Добавляем для доступа к SupabaseService
    ConfigModule, // Нужен для ConfigService в AIService
    RepositoriesModule, // Для ChartRepository
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
