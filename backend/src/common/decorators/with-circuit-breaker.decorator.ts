import { UseInterceptors } from '@nestjs/common';
import { CircuitBreakerInterceptor } from '../interceptors/circuit-breaker.interceptor';
import { CircuitBreaker, CircuitBreakerOptions } from './circuit-breaker.decorator';

export function WithCircuitBreaker(options: CircuitBreakerOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    CircuitBreaker(options)(target, propertyKey, descriptor);
    UseInterceptors(CircuitBreakerInterceptor)(target, propertyKey, descriptor);
  };
}