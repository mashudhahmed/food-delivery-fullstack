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
        const duration = Date.now() - startTime;
        await this.auditLogService.log(
          user?.id || null,
          method,
          resource,
          resourceId || this.extractIdFromData(data),
          this.getChanges(method, body, data),
          request,
          true,
          undefined,
          { duration, responseStatus: context.switchToHttp().getResponse().statusCode },
        );
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        await this.auditLogService.log(
          user?.id || null,
          method,
          resource,
          resourceId || this.extractIdFromData(error),
          this.getChanges(method, body, null),
          request,
          false,
          error.message,
          { duration, errorStatus: error.status },
        );
        throw error;
      }),
    );
  }

  private getResource(url: string): string {
    const parts = url.split('/').filter(Boolean);
    // Return the first meaningful part
    if (parts.length > 1) {
      return parts[0] || 'unknown';
    }
    return 'unknown';
  }

  private getResourceId(url: string, params: any): string | null {
    // Try to extract ID from params
    const idFields = ['id', 'userId', 'restaurantId', 'orderId', 'productId'];
    for (const field of idFields) {
      if (params[field]) {
        return params[field];
      }
    }

    // Try from URL
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
    if (data?.id) return data.id;
    if (data?.data?.id) return data.data.id;
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
    // Remove sensitive data
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
    // Remove sensitive data
    delete sanitized.passwordHash;
    delete sanitized.resetPasswordToken;
    delete sanitized.resetPasswordExpires;
    return sanitized;
  }
}