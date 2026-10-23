import { Module, forwardRef } from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { MagicLinkRateLimitGuard } from './guards/magic-link-rate-limit.guard';
import { SignupRateLimitGuard } from './guards/signup-rate-limit.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { ChartModule } from '../chart/chart.module';
import { ServicesModule } from '../services/services.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    SupabaseModule,
    CommonModule,
    forwardRef(() => ChartModule),
    ServicesModule,
  ],
  providers: [
    SupabaseAuthService,
    SupabaseAuthGuard,
    MagicLinkRateLimitGuard,
    SignupRateLimitGuard,
  ],
  controllers: [AuthController],
  exports: [
    SupabaseAuthService,
    SupabaseAuthGuard,
    MagicLinkRateLimitGuard,
    SignupRateLimitGuard,
  ],
})
export class AuthModule {}
