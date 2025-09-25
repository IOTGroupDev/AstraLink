import { Module } from '@nestjs/common';
import { SupabaseUserController } from './supabase-user.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [SupabaseUserController],
  providers: [],
  exports: [],
})
export class UserModule {}
