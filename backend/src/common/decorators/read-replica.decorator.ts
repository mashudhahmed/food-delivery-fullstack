import { SetMetadata } from '@nestjs/common';

export const READ_REPLICA_KEY = 'use_replica';
export const UseReplica = (enabled: boolean = true) =>
  SetMetadata(READ_REPLICA_KEY, enabled);