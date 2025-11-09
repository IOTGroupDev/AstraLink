import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private supabaseService: SupabaseService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Разрешаем CORS preflight без проверки токена
    if (request.method === 'OPTIONS') {
      return true;
    }

    // Respect @Public() metadata to bypass auth
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const rawHeader =
      (request.headers.authorization as string | undefined) ??
      (request.headers['Authorization'] as string | undefined);
    const authHeader = rawHeader?.trim();

    // Robust Bearer parsing (handles Bearer, bearer, Bearer%20, extra spaces)
    let token: string | undefined;
    if (authHeader) {
      const normalized = authHeader.replace(/^Bearer%20/i, 'Bearer ').trim();
      const parts = normalized.split(/\s+/);
      if (parts.length >= 2 && /^Bearer$/i.test(parts[0])) {
        try {
          token = decodeURIComponent(parts.slice(1).join(' ')).trim();
        } catch {
          token = parts.slice(1).join(' ').trim();
        }
      }
    }

    if (!token) {
      console.log('[SupabaseAuthGuard] No or invalid Authorization header', {
        path: request.path,
        hasAuthHeader: !!authHeader,
        headerPreview: authHeader ? authHeader.slice(0, 20) : null,
      });
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    try {
      const { data, error } = await this.supabaseService.getUser(token);

      const user = data?.user;

      if (error || !user) {
        console.warn(
          '[SupabaseAuthGuard] Supabase getUser failed or returned no user; attempting JWT decode fallback',
          {
            hasError: !!error,
            errorMessage: (error as any)?.message,
            tokenLen: token?.length || 0,
          },
        );

        // Development fallback: decode JWT without verifying signature to extract user id
        try {
          const decoded = jwt.decode(token) as any;
          const userId =
            decoded?.sub || decoded?.user_id || decoded?.userId || decoded?.id;

          if (userId) {
            request.user = {
              userId,
              id: userId,
              email: decoded?.email,
              role: decoded?.role,
              rawUser: decoded,
            };
            console.log(
              '[SupabaseAuthGuard] Fallback decode success, user attached:',
              {
                userId,
                hasEmail: !!decoded?.email,
              },
            );
            return true;
          }
        } catch (decodeErr) {
          const errorMessage =
            decodeErr instanceof Error ? decodeErr.message : 'Unknown error';
          console.error(
            '[SupabaseAuthGuard] JWT decode fallback failed:',
            errorMessage,
          );
        }

        throw new UnauthorizedException('Недействительный токен');
      }

      // Нормализуем пользователя для контроллеров
      request.user = {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: (user as any).role,
        rawUser: user,
      };

      return true;
    } catch (e: any) {
      console.error(
        '[SupabaseAuthGuard] Token validation failed:',
        e?.message || e,
      );
      throw new UnauthorizedException('Ошибка проверки токена');
    }
  }
}
