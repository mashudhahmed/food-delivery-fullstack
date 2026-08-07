import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCodes, ErrorCode } from '../exceptions/error-codes';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode: string = ErrorCodes.SYS_001;
    let errors: any = null;
    let details: any = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Map status codes to error codes
      errorCode = this.mapStatusToErrorCode(statusCode);

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        errors = resp.errors || null;
        errorCode = resp.errorCode || errorCode;
        details = resp.details || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = ErrorCodes.SYS_001;
      this.logger.error(exception.stack);
    }

    // Get request ID from headers
    const requestId = request.headers['x-request-id'] as string || 'unknown';

    // Log errors in production
    if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
      this.logger.error(`[${requestId}] Error: ${message}`, {
        statusCode,
        errorCode,
        path: request.url,
        method: request.method,
        ip: request.ip,
        user: (request as any).user?.id,
        requestId,
      });
    }

    // Don't expose internal errors in production
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && statusCode >= 500) {
      message = 'Something went wrong. Please try again later.';
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      errorCode,
      message,
      ...(errors && { errors }),
      ...(details && { details }),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapStatusToErrorCode(status: HttpStatus): string {
    const mapping: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: ErrorCodes.VALID_001,
      [HttpStatus.UNAUTHORIZED]: ErrorCodes.PERM_003,
      [HttpStatus.FORBIDDEN]: ErrorCodes.PERM_001,
      [HttpStatus.NOT_FOUND]: ErrorCodes.RES_001,
      [HttpStatus.CONFLICT]: ErrorCodes.RES_002,
      [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorCodes.VALID_002,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCodes.SYS_004,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCodes.SYS_001,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCodes.SYS_002,
    };
    return mapping[status] || ErrorCodes.SYS_001;
  }
}