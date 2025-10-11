import { Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [SupabaseModule, AnalyticsModule, ServicesModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
