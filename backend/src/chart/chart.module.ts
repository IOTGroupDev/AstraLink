import { Module } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { ChartRepository } from './chart.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [ChartController],
  providers: [ChartService, ChartRepository],
  exports: [ChartService, ChartRepository],
})
export class ChartModule {}
