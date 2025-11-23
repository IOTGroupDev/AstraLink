/**
 * Repositories Module
 * Provides data access layer through Repository Pattern
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { UserRepository } from './user.repository';
import { ChartRepository } from './chart.repository';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [UserRepository, ChartRepository],
  exports: [UserRepository, ChartRepository],
})
export class RepositoriesModule {}
