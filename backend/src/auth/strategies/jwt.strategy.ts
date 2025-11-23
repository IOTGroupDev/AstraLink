import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // SECURITY: Token expiration is now enforced
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  validate(request: any, payload: any) {
    // Security: removed insecure dev fallback
    // Always validate tokens properly via passport-jwt

    if (!payload) {
      this.logger.debug('No payload in validated token');
      return null;
    }

    // Extract userId from various possible fields (Supabase uses 'sub')
    const userId =
      payload.sub || payload.id || payload.userId || payload.user_id;

    if (!userId) {
      this.logger.warn('Token payload missing userId field', {
        fields: Object.keys(payload),
      });
      return null;
    }

    return {
      userId: userId,
      email: payload.email || '',
      role: payload.role || 'authenticated',
    };
  }
}
