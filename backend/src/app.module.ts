import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ChartModule } from './chart/chart.module';
import { ConnectionsModule } from './connections/connections.module';
import { DatingModule } from './dating/dating.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      // Use wildcards to support event namespacing
      wildcard: true,
      // Set this to `true` to use wildcards
      delimiter: '.',
      // Maximum listeners per event
      maxListeners: 10,
      // Log warnings when max listeners is exceeded
      verboseMemoryLeak: true,
    }),
    PrismaModule,
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
