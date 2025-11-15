import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * DevOnlyGuard - Restricts access to development environment only
 * Use this guard to protect debug/diagnostic endpoints from production access
 */
@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    const isDevelopment = env === 'development' || env === 'dev';

    if (!isDevelopment) {
      throw new ForbiddenException(
        'This endpoint is only available in development mode',
      );
    }

    return true;
  }
}
