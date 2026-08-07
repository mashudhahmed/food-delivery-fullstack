// src/app.module.ts
import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MailModule } from './mail/mail.module';
import { UploadsModule } from './uploads/uploads.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FavoritesModule } from './favorites/favorites.module';
import { HealthModule } from './health/health.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthService } from './auth/auth.service';
import { AuditLog } from './common/entities/audit-log.entity';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { DatabaseProvider } from './common/providers/database.provider';
import { CacheModule } from './common/cache/cache.module'; // 👈 add
import { FeatureFlagsService } from './common/services/feature-flags.service';
import { QueueModule } from './common/queue/queue.module';
import { PerformanceModule } from './performance/performance.module';
import { CircuitBreakerInterceptor } from './common/interceptors/circuit-breaker.interceptor';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production'
          ? '.env.production'
          : process.env.NODE_ENV === 'neon'
            ? '.env.neon'
            : '.env.local',
    }),

    // Event Emitter (needed for PerformanceService and any other EventEmitter2 consumers)
    EventEmitterModule.forRoot(),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST');
        const isNeon = host?.includes('neon.tech');
        const isProduction = configService.get('NODE_ENV') === 'production';
        const readReplicaHost = configService.get('DB_READ_REPLICA_HOST');

        const baseConfig = {
          type: 'postgres' as const,
          host: host,
          port: +configService.get('DB_PORT') || 5432,
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}', AuditLog],
          synchronize: false,
          logging: !isProduction,
          maxQueryExecutionTime: 1000,
          poolSize: +configService.get('DB_POOL_SIZE') || 20,
          extra: {
            max: +configService.get('DB_POOL_SIZE') || 20,
            idleTimeoutMillis: +configService.get('DB_IDLE_TIMEOUT') || 30000,
            connectionTimeoutMillis:
              +configService.get('DB_CONNECTION_TIMEOUT') || 5000,
            keepalive: true,
            keepaliveInitialDelayMillis: 10000,
          },
          retryAttempts: isProduction ? 10 : 3,
          retryDelay: isProduction ? 1000 : 100,
          autoLoadEntities: false,
          keepConnectionAlive: true,
        };

        if (readReplicaHost && isProduction) {
          return {
            ...baseConfig,
            replication: {
              master: {
                host: host,
                port: +configService.get('DB_PORT') || 5432,
                username: configService.get('DB_USERNAME'),
                password: configService.get('DB_PASSWORD'),
                database: configService.get('DB_DATABASE'),
              },
              slaves: [
                {
                  host: readReplicaHost,
                  port: +configService.get('DB_REPLICA_PORT') || 5432,
                  username: configService.get('DB_REPLICA_USERNAME') || configService.get('DB_USERNAME'),
                  password: configService.get('DB_REPLICA_PASSWORD') || configService.get('DB_PASSWORD'),
                  database: configService.get('DB_REPLICA_DATABASE') || configService.get('DB_DATABASE'),
                },
              ],
              selector: 'RR' as any,
            },
          };
        }

        if (isNeon || isProduction) {
          const sslConfig: any = {
            rejectUnauthorized: isProduction ? true : false,
          };

          const caCert = configService.get('DB_CA_CERT');
          if (caCert) {
            sslConfig.ca = caCert;
          }

          return {
            ...baseConfig,
            ssl: sslConfig,
          };
        }

        return baseConfig;
      },
      inject: [ConfigService],
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: isProd ? 5 : 30,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: isProd ? 20 : 100,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: isProd ? 100 : 300,
      },
    ]),

    // Feature modules
    CacheModule, // 👈 add — global, provides CacheService + RedisProvider
    CloudinaryModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RestaurantsModule,
    MenuModule,
    OrdersModule,
    ReviewsModule,
    MailModule,
    UploadsModule,
    AdminModule,
    NotificationsModule,
    FavoritesModule,
    QueueModule,
    PerformanceModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseProvider,
    // RedisProvider removed — now provided globally by CacheModule
    // CacheService removed — now provided globally by CacheModule
    FeatureFlagsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CircuitBreakerInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppModule.name);

  constructor(private readonly authService: AuthService) {}

  async onApplicationBootstrap() {
    this.logger.log('✅ Application bootstrapped successfully');
    this.logger.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
    this.logger.log(`📊 Database: ${process.env.DB_HOST}`);

    // Schedule token cleanup (runs every day at 2 AM)
    this.scheduleTokenCleanup();
  }

  private scheduleTokenCleanup() {
    const now = new Date();
    const twoAM = new Date();
    twoAM.setHours(2, 0, 0, 0);

    let delay = twoAM.getTime() - now.getTime();
    if (delay < 0) {
      delay += 24 * 60 * 60 * 1000;
    }

    setTimeout(() => {
      this.logger.log('🔄 Running scheduled token cleanup...');
      this.authService.cleanupExpiredTokens().then(result => {
        this.logger.log(`✅ Cleaned up ${result.deleted} expired tokens`);
      }).catch(err => {
        this.logger.error('❌ Token cleanup failed:', err);
      });

      setInterval(() => {
        this.authService.cleanupExpiredTokens().then(result => {
          this.logger.log(`✅ Cleaned up ${result.deleted} expired tokens`);
        }).catch(err => {
          this.logger.error('❌ Token cleanup failed:', err);
        });
      }, 24 * 60 * 60 * 1000);
    }, delay);

    this.logger.log(`⏰ Token cleanup scheduled for ${twoAM.toLocaleString()}`);
  }
}