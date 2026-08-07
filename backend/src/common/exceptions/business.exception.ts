import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    errorCode: ErrorCode,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    super(
      {
        message,
        errorCode,
        details,
        statusCode,
      },
      statusCode,
    );
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id: string) {
    super(
      `${resource} with id ${id} not found`,
      'RES_001' as ErrorCode,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, errors?: any) {
    super(
      message,
      'VALID_001' as ErrorCode,
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Authentication required') {
    super(
      message,
      'PERM_003' as ErrorCode,
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class ForbiddenException extends BusinessException {
  constructor(message: string = 'Insufficient permissions') {
    super(
      message,
      'PERM_001' as ErrorCode,
      HttpStatus.FORBIDDEN,
    );
  }
}