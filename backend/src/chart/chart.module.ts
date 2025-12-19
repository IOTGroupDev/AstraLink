import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServicesModule } from '../services/services.module';
import { RepositoriesModule } from '../repositories';
import { RedisModule } from '../redis/redis.module';
import { GeoModule } from '@/modules/geo/geo.module';
import {
  NatalChartService,
  TransitService,
  PredictionService,
  BiorhythmService,
} from './services';
import { ChartEventListener } from './listeners/chart-event.listener';
import { UserSignupListener } from './listeners/user-signup.listener';
import { PersonalCodeService } from '@/chart/services/personal-code.service';
import { PersonalCodeController } from '@/chart/services/personal-code.controller';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    RepositoriesModule,
    ServicesModule,
    RedisModule,
    GeoModule,
  ],
  controllers: [ChartController, PersonalCodeController],
  providers: [
    ChartService,
    NatalChartService,
    TransitService,
    PredictionService,
    BiorhythmService,
    ChartEventListener,
    UserSignupListener,
    PersonalCodeService,
  ],
  exports: [
    ChartService,
    NatalChartService,
    TransitService,
    PredictionService,
    BiorhythmService,
  ],
})
export class ChartModule {}
