export const ErrorCodes = {
  // Auth errors (1000-1099)
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Token invalid',
  AUTH_004: 'Account locked',
  AUTH_005: 'Email already exists',
  AUTH_006: 'Invalid refresh token',
  AUTH_007: 'Password reset token expired',

  // Validation errors (1100-1199)
  VALID_001: 'Validation failed',
  VALID_002: 'Invalid input format',
  VALID_003: 'Required field missing',

  // Resource errors (2000-2099)
  RES_001: 'Resource not found',
  RES_002: 'Resource already exists',
  RES_003: 'Resource deleted',

  // Order errors (3000-3099)
  ORD_001: 'Invalid order status transition',
  ORD_002: 'Order not cancellable',
  ORD_003: 'Order not assignable',
  ORD_004: 'Order already assigned',

  // Payment errors (4000-4099)
  PAY_001: 'Payment failed',
  PAY_002: 'Payment not found',
  PAY_003: 'Payment already processed',

  // System errors (5000-5099)
  SYS_001: 'Internal server error',
  SYS_002: 'Service unavailable',
  SYS_003: 'Database error',
  SYS_004: 'Rate limit exceeded',

  // File upload errors (6000-6099)
  FILE_001: 'File too large',
  FILE_002: 'Invalid file type',
  FILE_003: 'File upload failed',

  // Permission errors (7000-7099)
  PERM_001: 'Insufficient permissions',
  PERM_002: 'Resource access denied',
  PERM_003: 'Authentication required',
} as const;

export type ErrorCode = keyof typeof ErrorCodes;