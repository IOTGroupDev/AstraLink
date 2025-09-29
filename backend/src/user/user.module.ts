import { Module } from '@nestjs/common';
import { SupabaseUserController } from './supabase-user.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [SupabaseModule, PrismaModule],
  controllers: [SupabaseUserController, UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
