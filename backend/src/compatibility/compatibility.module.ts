import { Module } from '@nestjs/common';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { GeoModule } from '@/modules/geo/geo.module';
import { ServicesModule } from '@/services/services.module';
import { SubscriptionModule } from '@/subscription/subscription.module';
import { SupabaseModule } from '@/supabase/supabase.module';
import { SubscriptionGuard } from '@/common/guards/subscription.guard';
import { CompatibilityController } from './compatibility.controller';
import { CompatibilityService } from './compatibility.service';
import { CompatibilityRateLimitGuard } from './guards/compatibility-rate-limit.guard';

@Module({
  imports: [
    AnalyticsModule,
    GeoModule,
    ServicesModule,
    SubscriptionModule,
    SupabaseModule,
  ],
  controllers: [CompatibilityController],
  providers: [
    CompatibilityService,
    CompatibilityRateLimitGuard,
    SubscriptionGuard,
  ],
})
export class CompatibilityModule {}
