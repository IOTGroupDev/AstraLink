import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = ctx.switchToHttp().getRequest();
    const start = Date.now();
    const m = req?.method;
    const u = req?.originalUrl || req?.url;
    this.logger.log(`➡️  ${m} ${u}`);
    return next.handle().pipe(
      tap({
        next: () => this.logger.log(`✅ ${m} ${u} ${Date.now() - start}ms`),
        error: (e) =>
          this.logger.error(`❌ ${m} ${u} ${Date.now() - start}ms`, e?.message),
      }),
    );
  }
}
