import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface RequestMetrics {
  method: string;
  url: string;
  controller: string;
  handler: string;
  duration: number;
  statusCode: number;
  success: boolean;
  error?: string;
  timestamp: Date;
}

export interface SystemMetrics {
  cpu: number;
  memory: {
    used: number;
    total: number;
    usagePercentage: number;
  };
  uptime: number;
  timestamp: Date;
}

@Injectable()
export class PerformanceService {
  async getAverageResponseTime({ from, to }: { from: Date; to: Date }): Promise<number> {
    const metrics = this.getMetricsInRange(from, to);

    if (metrics.length === 0) {
      return 0;
    }

    const totalDuration = metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return Math.round(totalDuration / metrics.length);
  }

  async getErrorRate({ from, to }: { from: Date; to: Date }): Promise<number> {
    const metrics = this.getMetricsInRange(from, to);

    if (metrics.length === 0) {
      return 0;
    }

    const errorCount = metrics.filter((metric) => !metric.success).length;
    return Math.round((errorCount / metrics.length) * 100);
  }

  async getMetrics({ from, to }: { from: Date; to: Date }): Promise<RequestMetrics[]> {
    return this.getMetricsInRange(from, to);
  }

  private readonly logger = new Logger(PerformanceService.name);
  private readonly metrics: RequestMetrics[] = [];
  private readonly MAX_METRICS = 10000;
  private readonly SLOW_THRESHOLD = 500; // ms

  constructor(private readonly eventEmitter: EventEmitter2) {
    // Periodically clean up old metrics
    setInterval(() => this.cleanupMetrics(), 3600000); // Every hour
    this.startSystemMetricsCollection();
  }

  async recordRequest(metrics: RequestMetrics): Promise<void> {
    this.metrics.push(metrics);

    // Emit events for monitoring
    if (metrics.duration > this.SLOW_THRESHOLD) {
      this.eventEmitter.emit('performance.slow_request', metrics);
      this.logger.warn(
        `Slow request: ${metrics.method} ${metrics.url} took ${metrics.duration}ms (${metrics.controller}.${metrics.handler})`,
      );
    }

    if (!metrics.success) {
      this.eventEmitter.emit('performance.failed_request', metrics);
    }

    // Trim if too many metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.splice(0, this.metrics.length - this.MAX_METRICS);
    }
  }

  private startSystemMetricsCollection(): void {
    setInterval(async () => {
      try {
        const metrics = await this.collectSystemMetrics();
        this.eventEmitter.emit('performance.system_metrics', metrics);
      } catch (error) {
        this.logger.error('Failed to collect system metrics:', error);
      }
    }, 30000); // Every 30 seconds
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const used = process.memoryUsage();
    const total = 1024 * 1024 * 1024; // 1GB (adjust based on your server)
    const memoryUsed = used.heapUsed + used.external;

    return {
      cpu: await this.getCpuUsage(),
      memory: {
        used: Math.round(memoryUsed / 1024 / 1024),
        total: Math.round(total / 1024 / 1024),
        usagePercentage: Math.round((memoryUsed / total) * 100),
      },
      uptime: Math.round(process.uptime()),
      timestamp: new Date(),
    };
  }

  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage calculation - in production use proper CPU monitoring
    const start = process.cpuUsage();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const end = process.cpuUsage(start);
    const total = (end.user + end.system) / 1000; // Convert to ms
    const elapsed = 100; // ms
    const usage = (total / elapsed) * 100;
    return Math.min(Math.round(usage * 10), 100);
  }

  private getMetricsInRange(from: Date, to: Date): RequestMetrics[] {
    const fromTime = from.getTime();
    const toTime = to.getTime();

    return this.metrics.filter((metric) => {
      const timestamp = new Date(metric.timestamp).getTime();
      return timestamp >= fromTime && timestamp <= toTime;
    });
  }

  private cleanupMetrics(): void {
    const threshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.metrics.splice(0, this.metrics.findIndex(m => 
      new Date(m.timestamp).getTime() > threshold
    ) || 0);
  }
}