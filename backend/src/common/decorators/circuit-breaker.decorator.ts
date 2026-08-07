import { SetMetadata } from '@nestjs/common';

export const CIRCUIT_BREAKER_KEY = 'circuit_breaker';
export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
  fallback?: (...args: any[]) => any;
}

export const CircuitBreaker = (options: CircuitBreakerOptions) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, options);