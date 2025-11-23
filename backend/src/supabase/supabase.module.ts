import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
