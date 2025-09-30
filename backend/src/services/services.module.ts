// import { Module } from '@nestjs/common';
// import { EphemerisService } from './ephemeris.service';
//
// @Module({
//   providers: [EphemerisService],
//   exports: [EphemerisService],
// })
// export class ServicesModule {}

// // backend/src/services/services.module.ts (обновленная версия)
// import { Module } from '@nestjs/common';
// import { EphemerisService } from './ephemeris.service';
// import { InterpretationService } from './interpretation.service';
// import { HoroscopeGeneratorService } from './horoscope-generator.service';
// import { PrismaModule } from '../prisma/prisma.module';
//
// @Module({
//   imports: [PrismaModule],
//   providers: [
//     EphemerisService,
//     InterpretationService,
//     HoroscopeGeneratorService,
//   ],
//   exports: [
//     EphemerisService,
//     InterpretationService,
//     HoroscopeGeneratorService,
//   ],
// })
// export class ServicesModule {}

// backend/src/services/services.module.ts (финальная версия с AI)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EphemerisService } from './ephemeris.service';
import { InterpretationService } from './interpretation.service';
import { HoroscopeGeneratorService } from './horoscope-generator.service';
import { AIService } from './ai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';

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
  ],
  exports: [
    AIService, // Экспортируем для использования в других модулях
    EphemerisService,
    InterpretationService,
    HoroscopeGeneratorService,
  ],
})
export class ServicesModule {}
