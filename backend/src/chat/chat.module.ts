import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { ChatNotificationsService } from './chat-notifications.service';

@Module({
  imports: [SupabaseModule, RedisModule],
  controllers: [ChatController],
  providers: [ChatService, ChatNotificationsService],
  exports: [ChatService],
})
export class ChatModule {}
