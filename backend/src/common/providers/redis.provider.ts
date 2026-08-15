// src/common/providers/redis.provider.ts
import { Provider, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

const logger = new Logger('RedisProvider');

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    try {
      const redisUrl = configService.get<string>('REDIS_URL');

      const client = redisUrl
        ? new Redis(redisUrl, {
            retryStrategy: () => null,
            maxRetriesPerRequest: null,
          })
        : new Redis({
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
            password: configService.get('REDIS_PASSWORD'),
            db: configService.get('REDIS_DB', 0),
            retryStrategy: () => null,
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
      });

      client.on('connect', () => {
        logger.log('✅ Redis connected successfully');
      });

      return client;
    } catch (error) {
      logger.error('Failed to create Redis client:', error);
      // Return a dummy client that doesn't crash
      return {
        get: async () => null,
        set: async () => {},
        del: async () => {},
        on: () => {},
        connect: async () => {},
        disconnect: async () => {},
      };
    }
  },
  inject: [ConfigService],
};