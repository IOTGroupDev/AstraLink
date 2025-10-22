import { Module } from '@nestjs/common';
import { SupabaseUserController } from './supabase-user.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ChartModule } from '../chart/chart.module';

@Module({
  imports: [SupabaseModule, PrismaModule, SubscriptionModule, ChartModule],
  controllers: [SupabaseUserController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
