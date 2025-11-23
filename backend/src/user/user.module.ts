import { Module } from '@nestjs/common';
import { SupabaseUserController } from './supabase-user.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionModule } from '../subscription/subscription.module';
import { ChartModule } from '../chart/chart.module';
import { RepositoriesModule } from '../repositories';
import { UserPhotosController } from './user-photos.controller';
import { UserPhotosService } from './user-photos.service';

@Module({
  imports: [
    SupabaseModule,
    PrismaModule,
    RepositoriesModule,
    SubscriptionModule,
    ChartModule,
  ],
  controllers: [SupabaseUserController, UserController, UserPhotosController],
  providers: [UserService, UserPhotosService],
  exports: [UserService, UserPhotosService],
})
export class UserModule {}
