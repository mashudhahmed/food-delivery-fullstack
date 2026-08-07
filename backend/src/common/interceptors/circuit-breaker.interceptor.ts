import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CIRCUIT_BREAKER_KEY, CircuitBreakerOptions } from '../decorators/circuit-breaker.decorator';

interface CircuitState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  timeoutId?: NodeJS.Timeout;
}

@Injectable()
export class CircuitBreakerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CircuitBreakerInterceptor.name);
  private readonly circuits = new Map<string, CircuitState>();

  constructor(private readonly reflector: Reflector) {}

  private getState(key: string): CircuitState {
    if (!this.circuits.has(key)) {
      this.circuits.set(key, {
        status: 'CLOSED',
        failures: 0,
        lastFailureTime: 0,
      });
    }
    return this.circuits.get(key)!;
  }

  private updateState(key: string, options: CircuitBreakerOptions): void {
    const state = this.getState(key);

    if (state.status === 'CLOSED') {
      state.failures++;
      state.lastFailureTime = Date.now();

      if (state.failures >= options.failureThreshold) {
        state.status = 'OPEN';
        state.timeoutId = setTimeout(() => {
          state.status = 'HALF_OPEN';
          this.logger.warn(`Circuit ${key} is now HALF_OPEN`);
        }, options.resetTimeout);
        this.logger.warn(`Circuit ${key} is now OPEN`);
      }
    } else if (state.status === 'HALF_OPEN') {
      state.status = 'OPEN';
      state.timeoutId = setTimeout(() => {
        state.status = 'HALF_OPEN';
        this.logger.warn(`Circuit ${key} is now HALF_OPEN`);
      }, options.resetTimeout);
      this.logger.warn(`Circuit ${key} is now OPEN (failed during HALF_OPEN)`);
    }
  }

  private resetState(key: string): void {
    const state = this.getState(key);
    state.status = 'CLOSED';
    state.failures = 0;
    state.lastFailureTime = 0;
    if (state.timeoutId) {
      clearTimeout(state.timeoutId);
      state.timeoutId = undefined;
    }
    this.logger.log(`Circuit ${key} is now CLOSED`);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<CircuitBreakerOptions>(
      CIRCUIT_BREAKER_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const key = `${context.getClass().name}.${context.getHandler().name}`;
    const state = this.getState(key);

    // Check if circuit is OPEN
    if (state.status === 'OPEN') {
      const isOpen = Date.now() - state.lastFailureTime < options.resetTimeout;
      if (isOpen) {
        this.logger.warn(`Circuit ${key} is OPEN, returning fallback`);
        if (options.fallback) {
          return new Observable((observer) => {
            try {
              const result = options.fallback!(
                context.switchToHttp().getRequest(),
                ...context.getArgs(),
              );
              observer.next(result);
              observer.complete();
            } catch (error) {
              observer.error(error);
            }
          });
        }
        return throwError(() => new ServiceUnavailableException('Service temporarily unavailable'));
      }
    }

    // HALF_OPEN - allow one request through
    if (state.status === 'HALF_OPEN') {
      this.logger.debug(`Circuit ${key} is HALF_OPEN, testing with a single request`);
    }

    return next.handle().pipe(
      catchError((error) => {
        // Only count certain errors as failures (not 4xx client errors)
        const status = error?.status || error?.getStatus?.();
        if (!status || status >= 500) {
          this.updateState(key, options);
        } else {
          // Client errors shouldn't trigger circuit
          this.logger.debug(`Circuit ${key}: Client error (${status}) not counted as failure`);
        }

        if (options.fallback && (status >= 500 || state.status === 'HALF_OPEN')) {
          this.logger.debug(`Circuit ${key}: Using fallback for error`);
          try {
            const result = options.fallback!(
              context.switchToHttp().getRequest(),
              ...context.getArgs(),
            );
            return new Observable((observer) => {
              observer.next(result);
              observer.complete();
            });
          } catch (fallbackError) {
            return throwError(() => fallbackError);
          }
        }

        return throwError(() => error);
      }),
    );
  }
}