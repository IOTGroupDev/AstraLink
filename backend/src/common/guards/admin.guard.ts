import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@/types/auth';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Supabase app_metadata is server-managed; profile/user_metadata roles are not.
    if (request.user?.appMetadata?.role !== 'admin') {
      throw new ForbiddenException('Administrator access required');
    }

    return true;
  }
}
