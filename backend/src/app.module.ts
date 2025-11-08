import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { ServicesModule } from './services/services.module';
import { AuthModule } from './auth/auth.module';
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
import { HealthModule } from '@/health/health.module';
import { DebugController } from '@/debug/debug.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    HealthModule,
  ],
  controllers: [AppController, DebugController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // }, // Временно отключаем глобальный guard для тестирования
  ],
})
export class AppModule {}
