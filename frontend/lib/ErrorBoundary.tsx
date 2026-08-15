// frontend/lib/error-handler.ts

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number' &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

export function parseApiError(error: unknown): ApiError {
  // Axios error
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: {
          statusCode?: number;
          message?: string | string[];
          errors?: Record<string, string[]> | string[] | string;
          timestamp?: string;
          path?: string;
        };
      };
    };

    const response = axiosError.response;
    if (response?.data) {
      const responseData = response.data;

      const statusCode =
        responseData.statusCode ?? response.status ?? 500;

      let message: string;
      if (Array.isArray(responseData.message)) {
        message = responseData.message.join(', ');
      } else if (typeof responseData.message === 'string') {
        message = responseData.message;
      } else {
        message = 'An unexpected error occurred';
      }

      const errors =
        responseData.errors &&
        typeof responseData.errors === 'object' &&
        !Array.isArray(responseData.errors)
          ? (responseData.errors as Record<string, string[]>)
          : undefined;

      return {
        statusCode,
        message,
        errors,
        timestamp: responseData.timestamp,
        path: responseData.path,
      };
    }
  }

  // Standard Error
  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message || 'An unexpected error occurred',
    };
  }

  // Unknown
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
  };
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  // Handle validation errors that arrived as an array
  if (parsed.errors && Array.isArray(parsed.errors)) {
    return (parsed.errors as unknown as string[]).join(', ');
  }

  // Handle field-specific errors (Record<string, string[]>)
  if (parsed.errors && typeof parsed.errors === 'object') {
    const messages = Object.values(parsed.errors).flat();
    return messages.join(', ');
  }

  // Defensive: NestJS can put an array in `message`
  if (Array.isArray(parsed.message)) {
    return (parsed.message as unknown as string[]).join(', ');
  }
  if (typeof parsed.message !== 'string') {
    return 'An unexpected error occurred';
  }

  return parsed.message;
}

/** Alias used by the API interceptor and AuthModal */
export const getUserFriendlyError = getErrorMessage;

export function logError(error: unknown, context?: string): void {
  const parsed = parseApiError(error);
  const timestamp = new Date().toISOString();

  if (process.env.NODE_ENV === 'production') {
    // TODO: send to Sentry / Logtail etc.
    console.error(`[${timestamp}] [${context || 'APP'}]`, parsed);
  } else {
    console.error(`[${timestamp}] [${context || 'APP'}]`, parsed);
    console.error('Full error:', error);
  }
}