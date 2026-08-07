import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IDEMPOTENCY_KEY } from '../decorators/idempotency.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);
  // In production, use Redis instead
  private readonly cache = new Map<string, { response: any; expiry: number }>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const idempotencyConfig = this.reflector.get<{ ttlSeconds: number }>(
      IDEMPOTENCY_KEY,
      context.getHandler(),
    );

    if (!idempotencyConfig) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      this.logger.warn('Idempotent endpoint called without idempotency key');
      return next.handle();
    }

    // Check if request already processed
    const cached = this.cache.get(idempotencyKey);
    if (cached && cached.expiry > Date.now()) {
      this.logger.debug(`Idempotent request: ${idempotencyKey} - returning cached response`);
      return new Observable((observer) => {
        observer.next(cached.response);
        observer.complete();
      });
    }

    return next.handle().pipe(
      tap((response) => {
        // Store successful responses
        this.cache.set(idempotencyKey, {
          response,
          expiry: Date.now() + idempotencyConfig.ttlSeconds * 1000,
        });
        this.logger.debug(`Idempotent request: ${idempotencyKey} - cached response`);
      }),
    );
  }

  constructor(private readonly reflector: Reflector) {}
}