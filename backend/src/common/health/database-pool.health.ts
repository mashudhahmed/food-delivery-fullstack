import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabasePoolHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DatabasePoolHealthIndicator.name);

  constructor(private readonly dataSource: DataSource) {
    super();
  }

  async checkPoolHealth(key: string = 'database_pool'): Promise<HealthIndicatorResult> {
    try {
      const driver = this.dataSource.driver as any;
      const pool = driver?.master?.pool ?? driver?.pool;

      if (!pool) {
        return this.getStatus(key, false, { message: 'Pool not available' });
      }

      const poolStatus = {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
        max: pool.max,
        used: pool.totalCount - pool.idleCount,
        utilizationPercentage: ((pool.totalCount - pool.idleCount) / pool.max) * 100,
      };

      const isHealthy = poolStatus.utilizationPercentage < 90 && poolStatus.waiting < 10;

      return this.getStatus(key, isHealthy, {
        ...poolStatus,
        message: isHealthy ? 'Pool healthy' : 'Pool utilization too high or too many waiting connections',
      });
    } catch (error) {
      this.logger.error('Pool health check failed:', error);
      return this.getStatus(key, false, { message: error.message });
    }
  }

  async checkConnectionTimeout(key: string = 'database_timeout'): Promise<HealthIndicatorResult> {
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - startTime;

      const isHealthy = duration < 500;

      return this.getStatus(key, isHealthy, {
        responseTime: `${duration}ms`,
        message: isHealthy ? 'Database responsive' : 'Database response time too slow',
      });
    } catch (error) {
      this.logger.error('Database timeout check failed:', error);
      return this.getStatus(key, false, { message: error.message });
    }
  }
}