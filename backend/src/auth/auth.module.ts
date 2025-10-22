import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SupabaseAuthService } from './supabase-auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthMiddleware } from './middleware/auth.middleware';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { ChartModule } from '../chart/chart.module';
import { ServicesModule } from '../services/services.module';
import { CacheModule } from '@nestjs/common/cache';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    SupabaseModule,
    forwardRef(() => ChartModule),
    ServicesModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    SupabaseAuthService,
    JwtStrategy,
    AuthMiddleware,
    SupabaseAuthGuard,
  ],
  controllers: [AuthController],
  exports: [SupabaseAuthService, JwtModule, AuthMiddleware, SupabaseAuthGuard],
})
export class AuthModule {}
