import { SetMetadata } from '@nestjs/common';

export const IDEMPOTENCY_KEY = 'idempotency';
export const Idempotent = (ttlSeconds: number = 86400) => 
  SetMetadata(IDEMPOTENCY_KEY, { ttlSeconds });