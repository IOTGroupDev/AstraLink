import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ServicesModule } from './services/services.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { UserModule } from './user/user.module';
import { ChartModule } from './chart/chart.module';
import { ConnectionsModule } from './connections/connections.module';
import { DatingModule } from './dating/dating.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PrismaModule } from './prisma/prisma.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NatalModule } from './modules/natal/natal.module';
import { SwissModule } from './modules/swiss/swiss.module';
import { SharedModule } from './modules/shared/shared.module';
import { RedisModule } from './redis/redis.module';
import { AdvisorModule } from './advisor/advisor.module';
import { ChatModule } from './chat/chat.module';
import { AIModule } from './ai/ai.module';
import { HealthModule } from '@/health/health.module';
import { DebugController } from '@/debug/debug.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
    // Rate limiting: 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
      {
        name: 'long',
        ttl: 3600000, // 1 hour
        limit: 1000, // 1000 requests per hour
      },
    ]),
    PrismaModule,
    SupabaseModule,
    ServicesModule,
    AuthModule,
    UserModule,
    ChartModule,
    ConnectionsModule,
    DatingModule,
    AnalyticsModule,
    SubscriptionModule,
    NatalModule,
    SwissModule,
    SharedModule,
    RedisModule,
    ChatModule,
    AdvisorModule,
    AIModule,
    HealthModule,
  ],
  controllers: [AppController, DebugController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
  ],
})
export class AppModule {}
