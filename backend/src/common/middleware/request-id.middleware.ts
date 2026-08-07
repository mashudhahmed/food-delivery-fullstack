import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction } from 'express';

export function RequestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const headerValue = req.headers['x-request-id'];
  const requestId =
    typeof headerValue === 'string' && headerValue.trim()
      ? headerValue
      : Array.isArray(headerValue) && headerValue.length > 0
      ? headerValue[0]
      : uuidv4();

  res.setHeader('X-Request-ID', requestId);
  req.headers['x-request-id'] = requestId;
  next();
}
