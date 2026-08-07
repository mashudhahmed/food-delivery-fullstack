import { SetMetadata } from '@nestjs/common';

export const READ_ONLY_KEY = 'read_only';
export const ReadOnly = () => SetMetadata(READ_ONLY_KEY, true);