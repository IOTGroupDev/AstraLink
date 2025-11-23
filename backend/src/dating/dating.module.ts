import { Module } from '@nestjs/common';
import { DatingController } from './dating.controller';
import { DatingService } from './dating.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ServicesModule } from '../services/services.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { DatingQueueModule } from '../queue/dating-queue.module';

@Module({
  imports: [
    PrismaModule,
    ServicesModule,
    SupabaseModule,
    RedisModule,
    DatingQueueModule,
  ],
  controllers: [DatingController],
  providers: [DatingService],
  exports: [DatingService],
})
export class DatingModule {}
