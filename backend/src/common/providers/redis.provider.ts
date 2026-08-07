import { Provider, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('RedisProvider');

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('REDIS_URL');

    const client = redisUrl
      ? new Redis(redisUrl, {
          retryStrategy: () => null, // stop retrying after first failure
          maxRetriesPerRequest: null,
        })
      : new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
          retryStrategy: () => null, // 👈 stop retrying after first failure
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
        });

    let hasWarned = false;
      client.on('error', (err: unknown) => {
      if (!hasWarned) {
        logger.warn(
            `Redis unavailable (${(err as any)?.code || (err as Error).message}) — caching/queueing disabled until Redis is running.`,
        );
        hasWarned = true;
      }
      // Subsequent errors are silently ignored to avoid log spam
    });

    return client;
  },
  inject: [ConfigService],
};