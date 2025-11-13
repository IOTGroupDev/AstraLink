import { Module, forwardRef } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesModule } from '../repositories';
import {
  NatalChartService,
  TransitService,
  PredictionService,
  BiorhythmService,
} from './services';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    RepositoriesModule,
    ServicesModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ChartController],
  providers: [
    ChartService,
    NatalChartService,
    TransitService,
    PredictionService,
    BiorhythmService,
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
