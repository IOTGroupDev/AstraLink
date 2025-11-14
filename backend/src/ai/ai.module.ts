import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { ServicesModule } from '../services/services.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    ServicesModule, // Provides AIService and HoroscopeGeneratorService
    PrismaModule,
    SupabaseModule,
    RedisModule,
    SubscriptionModule,
    AnalyticsModule,
  ],
  controllers: [AIController],
  providers: [], // No providers - using services from ServicesModule
  exports: [],
})
export class AIModule {}
