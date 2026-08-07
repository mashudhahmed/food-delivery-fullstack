import { Module, Global } from '@nestjs/common';
import { CacheService } from '../services/cache.service';
import { RedisProvider } from '../providers/redis.provider';

@Global()
@Module({
  providers: [RedisProvider, CacheService],
  exports: [CacheService, RedisProvider],
})
export class CacheModule {}