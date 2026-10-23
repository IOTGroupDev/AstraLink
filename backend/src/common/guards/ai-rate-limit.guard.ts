import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { RateLimiterService } from '../services/rate-limiter.service';
import type { AuthenticatedRequest } from '@/types/auth';

@Injectable()
export class AIRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: RateLimiterService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.method !== 'POST') return true;
    const id = request.user?.userId || request.user?.id;
    if (!id)
      throw new HttpException(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
      );
    const configured = Number(process.env.MAX_AI_REQUESTS_PER_HOUR || 1000);
    const points =
      Number.isSafeInteger(configured) && configured > 0 ? configured : 1000;
    const result = await this.limiter.consume(`ai:${id}`, {
      points,
      duration: 3600,
    });
    if (!result.allowed)
      throw new HttpException(
        'AI request limit exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    return true;
  }
}
