import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

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

  validate(request: any, _payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!token) {
      this.logger.debug('No token provided in request');
      return null;
    }

    // Development-only fallback for Supabase tokens
    if (process.env.NODE_ENV === 'development') {
      this.logger.warn('⚠️  DEVELOPMENT MODE: Using insecure JWT decode in JwtStrategy');
      try {
        const decoded = jwt.decode(token, { complete: false }) as any;
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
        this.logger.error('Error decoding token:', error);
        // Fallback for simple userId tokens in development
        if (token && token.length > 10) {
          this.logger.debug('Treating token as userId for development');
          return {
            userId: token,
            email: 'dev@example.com',
            role: 'authenticated',
          };
        }
      }
    } else {
      // Production: Use the validated payload from passport-jwt
      if (_payload) {
        const userId =
          _payload.sub || _payload.id || _payload.userId || _payload.user_id;
        if (userId) {
          return {
            userId: userId,
            email: _payload.email,
            role: _payload.role,
          };
        }
      }
    }

    this.logger.debug('Invalid token payload - no userId found');
    return null;
  }
}
