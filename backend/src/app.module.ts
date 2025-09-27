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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    ServicesModule,
    AuthModule,
    UserModule,
    ChartModule,
    ConnectionsModule,
    DatingModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: JwtAuthGuard,
    // }, // Временно отключаем глобальный guard для тестирования
  ],
})
export class AppModule {}
