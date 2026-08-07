import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(private readonly cacheService: CacheService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const key = this.generateKey(request);
    
    // Check cache
    const cached = await this.cacheService.get(key);
    if (cached) {
      this.logger.debug(`Cache HIT: ${key}`);
      return new Observable((observer) => {
        observer.next(cached);
        observer.complete();
      });
    }

    this.logger.debug(`Cache MISS: ${key}`);
    
    return next.handle().pipe(
      tap(async (data) => {
        // Cache with TTL based on endpoint
        const ttl = this.getTTL(request);
        if (ttl > 0 && data) {
          await this.cacheService.set(key, data, ttl);
        }
      }),
    );
  }

  private generateKey(request: any): string {
    const { url, query, params } = request;
    const queryString = Object.keys(query).length > 0 
      ? `?${new URLSearchParams(query).toString()}`
      : '';
    const paramString = Object.keys(params).length > 0 
      ? `/${Object.values(params).join('/')}`
      : '';
    return `cache:${url}${paramString}${queryString}`;
  }

  private getTTL(request: any): number {
    // Different TTLs for different endpoints
    const url = request.url;
    if (url.includes('/health')) return 0; // Don't cache health
    if (url.includes('/restaurants')) return 300; // 5 minutes
    if (url.includes('/menu')) return 300; // 5 minutes
    if (url.includes('/reviews')) return 600; // 10 minutes
    return 60; // Default 1 minute
  }
}