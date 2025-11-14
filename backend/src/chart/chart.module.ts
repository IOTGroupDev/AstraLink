import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { ChartEventListener } from './listeners/chart-event.listener';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [ChartController],
  providers: [ChartService, ChartEventListener],
  exports: [ChartService],
})
export class ChartModule {}
