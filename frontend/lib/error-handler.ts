// frontend/lib/error-handler.ts
import { isAxiosError } from 'axios';

export interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]> | string[];
  timestamp?: string;
  path?: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: Record<string, string[]> | string[];

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]> | string[]
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

/**
 * Parses any error into a standardized ApiError object.
 * Handles Axios errors, Network errors, and standard JS Errors.
 */
export function parseApiError(error: unknown): ApiError {
  // 1. If it's already an ApiError, return it.
  if (isApiError(error)) {
    return error;
  }

  // 2. Handle Axios errors (most common for API calls).
  if (isAxiosError(error)) {
    const response = error.response as
      | {
          status?: number;
          data?: {
            statusCode?: number;
            message?: string | string[];
            errors?: Record<string, string[]> | string[] | string;
            timestamp?: string;
            path?: string;
          };
        }
      | undefined;

    if (response?.data) {
      const responseData = response.data;

      // Determine statusCode
      const statusCode = responseData.statusCode ?? response.status ?? 500;

      // Determine message (handles arrays)
      let message: string;
      if (Array.isArray(responseData.message)) {
        message = responseData.message.join(', ');
      } else if (typeof responseData.message === 'string') {
        message = responseData.message;
      } else {
        message = 'An unexpected error occurred';
      }

      // Determine errors
      let errors: Record<string, string[]> | string[] | undefined;
      if (responseData.errors && typeof responseData.errors === 'object') {
        if (Array.isArray(responseData.errors)) {
          errors = responseData.errors;
        } else {
          // It's a record (field -> errors array)
          errors = responseData.errors as Record<string, string[]>;
        }
      }

      return {
        statusCode,
        message,
        errors,
        timestamp: responseData.timestamp,
        path: responseData.path,
      };
    }

    // Handle network errors (no response) — includes timeouts, DNS
    // failures, CORS rejections, and the "retries exhausted" case from
    // the response interceptor's retry logic in api.ts.
    const isTimeout = error.code === 'ECONNABORTED';
    return {
      statusCode: 503, // Service Unavailable
      message: isTimeout
        ? 'The request timed out. Please try again.'
        : error.message || 'Network error — please check your connection.',
      timestamp: new Date().toISOString(),
    };
  }

  // 3. Handle standard JS Errors.
  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    };
  }

  // 4. Handle unknown errors (should not happen, but just in case).
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };
}

export function getErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);

  // Handle field-specific errors (Record<string, string[]>)
  if (parsed.errors && typeof parsed.errors === 'object' && !Array.isArray(parsed.errors)) {
    const messages = Object.values(parsed.errors).flat();
    return messages.join(', ');
  }

  // Handle array of errors
  if (Array.isArray(parsed.errors)) {
    return parsed.errors.join(', ');
  }

  // Handle message that is an array
  if (Array.isArray(parsed.message)) {
    return parsed.message.join(', ');
  }

  // Return the message
  return parsed.message || 'An unexpected error occurred';
}

/** Alias used by the API interceptor and AuthModal */
export const getUserFriendlyError = getErrorMessage;

/**
 * Strips sensitive data (auth tokens, cookies) from an error's request
 * config before it's ever logged, so tokens never end up in browser
 * console history, screenshots, or a production log aggregator.
 */
function sanitizeForLogging(error: unknown): unknown {
  if (!isAxiosError(error)) return error;

  const headers = { ...(error.config?.headers ?? {}) } as Record<string, unknown>;
  if ('Authorization' in headers) headers.Authorization = '[redacted]';
  if ('Cookie' in headers) headers.Cookie = '[redacted]';

  return {
    name: error.name,
    message: error.message,
    code: error.code,
    status: error.response?.status,
    url: error.config?.url,
    method: error.config?.method,
    responseData: error.response?.data,
    requestHeaders: headers,
  };
}

export function logError(error: unknown, context?: string): void {
  const parsed = parseApiError(error);
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${context || 'APP'}]`;

  if (process.env.NODE_ENV === 'production') {
    // Structured, sanitized payload — safe to also forward to a
    // monitoring service (Sentry, Logtail, etc.) without leaking tokens.
    console.error(prefix, parsed);
    // TODO: wire up production error monitoring here, e.g.:
    // Sentry.captureException(error, { extra: { context, ...parsed } });
    return;
  }

  // Development: one grouped, expandable log instead of two separate
  // console.error calls with overlapping information.
  console.groupCollapsed(`${prefix} ${parsed.statusCode} — ${parsed.message}`);
  console.error('Parsed:', parsed);
  console.error('Raw (sanitized):', sanitizeForLogging(error));
  console.groupEnd();
}