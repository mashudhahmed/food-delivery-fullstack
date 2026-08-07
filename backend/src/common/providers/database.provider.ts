import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseProvider implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseProvider.name);
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.monitorConnection();
  }

  private monitorConnection(): void {
    // Check connection every 30 seconds
    setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const isConnected = this.dataSource.isInitialized && this.dataSource.isConnected;
        if (!isConnected) {
          this.logger.warn('Database connection lost - attempting to reconnect...');
          await this.reconnect();
        }
      } catch (error) {
        this.logger.error('Connection monitoring error:', error);
      }
    }, 30000);
  }

  private async reconnect(): Promise<void> {
    try {
      await this.dataSource.destroy();
      await this.dataSource.initialize();
      this.logger.log('✅ Database reconnected successfully');
    } catch (error) {
      this.logger.error('Failed to reconnect to database:', error);
      // Schedule retry with backoff
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.reconnect();
        }, 5000);
      }
    }
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.logger.log(`Database shutting down due to: ${signal}`);
  }
}