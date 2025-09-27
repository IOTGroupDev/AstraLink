import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true, // Временно игнорируем истечение для отладки
      secretOrKey: 'dummy-secret-for-development', // Не используется
      passReqToCallback: true, // Передаем request в callback
      jsonWebTokenOptions: {
        ignoreExpiration: true,
      },
    });
  }

  validate(request: any, payload: any) {
    // Для development просто декодируем Supabase токен без проверки подписи
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (token) {
      try {
        // Декодируем токен без проверки подписи
        const decoded = jwt.decode(token, { complete: false }) as any;
        if (decoded && decoded.sub) {
          return {
            userId: decoded.sub,
            email: decoded.email,
            role: decoded.role,
          };
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }

    // Fallback для обычных токенов
    return {
      userId: payload?.sub || 'demo-user-id',
      email: payload?.email || 'demo@example.com',
      role: payload?.role || 'user',
    };
  }
}
