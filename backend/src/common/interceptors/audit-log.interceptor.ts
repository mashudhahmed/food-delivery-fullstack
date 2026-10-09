// src/common/interceptors/audit-log.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditLogService } from '../services/audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const method = request.method;
    const url = request.url;
    const body = request.body;

    // Extract resource info from route
    const resource = this.getResource(url);
    const resourceId = this.getResourceId(url, request.params);

    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const duration = Date.now() - startTime;
          const resolvedId = resourceId || this.extractIdFromData(data) || 'unknown';
          await this.auditLogService.log(
            user?.id || null,
            method,
            resource,
            resolvedId,
            this.getChanges(method, body, data),
            request,
            true,
            undefined,
            { duration, responseStatus: context.switchToHttp().getResponse()?.statusCode || 200 },
          );
        } catch (err) {
          this.logger.warn(`AuditLogInterceptor tap error: ${err.message}`);
        }
      }),
      catchError(async (error) => {
        try {
          const duration = Date.now() - startTime;
          const resolvedId = resourceId || this.extractIdFromData(error) || 'unknown';
          await this.auditLogService.log(
            user?.id || null,
            method,
            resource,
            resolvedId,
            this.getChanges(method, body, null),
            request,
            false,
            error?.message || 'Error occurred',
            { duration, responseStatus: error?.status ?? context.switchToHttp().getResponse()?.statusCode ?? 500 },
          );
        } catch (err) {
          this.logger.warn(`AuditLogInterceptor catchError error: ${err.message}`);
        }
        throw error;
      }),
    );
  }

  private getResource(url: string): string {
    const parts = url.split('/').filter(Boolean);
    if (parts.length > 1) {
      return parts[0] || 'unknown';
    }
    return 'unknown';
  }

  private getResourceId(url: string, params: any): string | null {
    if (!params) params = {};
    const idFields = ['id', 'userId', 'restaurantId', 'orderId', 'productId'];
    for (const field of idFields) {
      if (params[field]) {
        return String(params[field]);
      }
    }

    const parts = url.split('/').filter(Boolean);
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      if (this.isUUID(lastPart)) {
        return lastPart;
      }
    }

    return null;
  }

  private isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private extractIdFromData(data: any): string | null {
    if (!data) return null;
    if (typeof data === 'string' && this.isUUID(data)) return data;
    if (data.id) return String(data.id);
    if (data.orderId) return String(data.orderId);
    if (data.data?.id) return String(data.data.id);
    if (Array.isArray(data) && data.length > 0 && data[0]?.id) return String(data[0].id);
    if (Array.isArray(data?.orders) && data.orders.length > 0 && data.orders[0]?.id) {
      return String(data.orders[0].id);
    }
    if (Array.isArray(data?.results) && data.results.length > 0 && data.results[0]?.orderId) {
      return String(data.results[0].orderId);
    }
    return null;
  }

  private getChanges(method: string, body: any, response: any): any {
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      return {
        request: this.sanitizeBody(body),
        response: response ? this.sanitizeResponse(response) : null,
      };
    }
    return null;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.currentPassword;
    delete sanitized.newPassword;
    delete sanitized.token;
    delete sanitized.refreshToken;
    delete sanitized.confirmPassword;
    return sanitized;
  }

  private sanitizeResponse(response: any): any {
    if (!response) return null;
    const sanitized = { ...response };
    delete sanitized.passwordHash;
    delete sanitized.resetPasswordToken;
    delete sanitized.resetPasswordExpires;
    return sanitized;
  }
}