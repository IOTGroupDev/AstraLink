import { Module, forwardRef } from '@nestjs/common';
import { AdvisorController } from './advisor.controller';
import { AdvisorService } from './advisor.service';
import { ServicesModule } from '@/services/services.module';
import { ChartModule } from '@/chart/chart.module';
import { RedisModule } from '@/redis/redis.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { AuthModule } from '@/auth/auth.module';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { SupabaseModule } from '@/supabase/supabase.module';

@Module({
  imports: [
    ServicesModule,
    RedisModule,
    SubscriptionModule,
    AnalyticsModule,
    SupabaseModule,
    forwardRef(() => ChartModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [AdvisorController],
  providers: [AdvisorService, SubscriptionGuard],
})
export class AdvisorModule {}
