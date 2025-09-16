import { Module } from '@nestjs/common';
import { DatingController } from './dating.controller';
import { DatingService } from './dating.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DatingController],
  providers: [DatingService],
  exports: [DatingService],
})
export class DatingModule {}
