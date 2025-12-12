import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

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
      this.logger.debug(`Public endpoint: ${request.path}`);
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
      this.logger.warn(
        `❌ No or invalid Authorization header for ${request.method} ${request.path}`,
      );
      this.logger.debug(`Raw header: ${rawHeader}`);
      throw new UnauthorizedException('Токен авторизации не предоставлен');
    }

    try {
      this.logger.debug(
        `🔐 Validating token for ${request.method} ${request.path}`,
      );

      const { data, error } = await this.supabaseService.getUser(token);

      const user = data?.user;

      if (error || !user) {
        this.logger.warn(
          `❌ Supabase getUser failed for ${request.path}: ${(error as any)?.message || 'no user'}`,
        );
        this.logger.debug(`Token (first 20 chars): ${token.substring(0, 20)}...`);
        this.logger.debug(`Error details: ${JSON.stringify(error)}`);
        throw new UnauthorizedException('Недействительный токен');
      }

      this.logger.debug(
        `✅ Token validated for user ${user.email} (${user.id})`,
      );

      // Normalize user for controllers
      request.user = {
        userId: user.id,
        id: user.id,
        email: user.email,
        role: (user as any).role,
        rawUser: user,
      };

      return true;
    } catch (e: any) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      this.logger.error(
        `❌ Token validation exception for ${request.path}: ${e?.message || e}`,
      );
      throw new UnauthorizedException('Ошибка проверки токена');
    }
  }
}
