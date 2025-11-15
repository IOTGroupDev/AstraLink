import { Module, forwardRef } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesModule } from '../repositories';
import { RedisModule } from '../redis/redis.module';
import {
  NatalChartService,
  TransitService,
  PredictionService,
  BiorhythmService,
} from './services';
import { ChartEventListener } from './listeners/chart-event.listener';
import { PersonalCodeService } from '@/chart/services/personal-code.service';
import { PersonalCodeController } from '@/chart/services/personal-code.controller';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    RepositoriesModule,
    ServicesModule,
    RedisModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ChartController, PersonalCodeController],
  providers: [
    ChartService,
    NatalChartService,
    TransitService,
    PredictionService,
    BiorhythmService,
    ChartEventListener,
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
