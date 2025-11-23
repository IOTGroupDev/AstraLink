import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req: any = ctx.switchToHttp().getRequest();
    const start = Date.now();
    const m = req?.method;
    const u = req?.originalUrl || req?.url;
    console.log(`➡️  ${m} ${u}`);
    return next.handle().pipe(
      tap({
        next: () => console.log(`✅ ${m} ${u} ${Date.now() - start}ms`),
        error: (e) =>
          console.log(`❌ ${m} ${u} ${Date.now() - start}ms`, e?.message),
      }),
    );
  }
}
