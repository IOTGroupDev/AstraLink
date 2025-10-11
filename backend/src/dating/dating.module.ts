import { Module } from '@nestjs/common';
import { DatingController } from './dating.controller';
import { DatingService } from './dating.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [PrismaModule, ServicesModule],
  controllers: [DatingController],
  providers: [DatingService],
  exports: [DatingService],
})
export class DatingModule {}
