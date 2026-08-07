import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerformanceService } from '../services/performance.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const controller = context.getClass().name;
    const handler = context.getHandler().name;

    return next.handle().pipe(
      tap(async (data) => {
        const duration = Date.now() - startTime;
        const statusCode = context.switchToHttp().getResponse().statusCode;
        await this.performanceService.recordRequest({
          method,
          url,
          controller,
          handler,
          duration,
          statusCode,
          success: true,
          timestamp: new Date(),
        });
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        const statusCode = error?.status || 500;
        await this.performanceService.recordRequest({
          method,
          url,
          controller,
          handler,
          duration,
          statusCode,
          success: false,
          error: error?.message,
          timestamp: new Date(),
        });
        throw error;
      }),
    );
  }
}