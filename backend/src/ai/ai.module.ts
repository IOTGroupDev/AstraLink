import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIService } from '../services/ai.service';
import { HoroscopeGeneratorService } from '../services/horoscope-generator.service';
import { ServicesModule } from '../services/services.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    ServicesModule,
    PrismaModule,
    SupabaseModule,
    RedisModule,
    SubscriptionModule,
    AnalyticsModule,
  ],
  controllers: [AIController],
  providers: [AIService, HoroscopeGeneratorService],
  exports: [AIService],
})
export class AIModule {}
