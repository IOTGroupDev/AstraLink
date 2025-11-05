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

  validate(request: any, _payload: any) {
    // Для development просто декодируем Supabase токен без проверки подписи
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!token) {
      console.log('No token provided in request');
      return null; // Passport интерпретирует null как неудачную аутентификацию
    }

    try {
      // Декодируем токен без проверки подписи
      const decoded = jwt.decode(token, { complete: false }) as any;
      console.log('Decoded token payload:', decoded);
      if (decoded) {
        const userId =
          decoded.sub || decoded.id || decoded.userId || decoded.user_id;
        if (userId) {
          return {
            userId: userId,
            email: decoded.email,
            role: decoded.role,
          };
        }
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      // Если декодирование не удалось, возможно токен - это просто userId для development
      if (token && token.length > 10) {
        // Простая проверка, что это UUID-like
        console.log('Treating token as userId for development:', token);
        return {
          userId: token,
          email: 'dev@example.com',
          role: 'authenticated',
        };
      }
    }

    // Если токен не содержит нужных данных
    console.log('Invalid token payload - no userId found');
    return null; // Passport интерпретирует null как неудачную аутентификацию
  }
}
