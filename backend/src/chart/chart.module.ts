import { Module, forwardRef } from '@nestjs/common';
import { ChartController } from './chart.controller';
import { ChartService } from './chart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { ServicesModule } from '../services/services.module';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesModule } from '../repositories';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule,
    RepositoriesModule,
    ServicesModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [ChartController],
  providers: [ChartService],
  exports: [ChartService],
})
export class ChartModule {}
