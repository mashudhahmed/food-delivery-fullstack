import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

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

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST');
        const isNeon = host?.includes('neon.tech');
        const isProduction = configService.get('NODE_ENV') === 'production';

        const baseConfig = {
          type: 'postgres' as const,
          host: host,
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          logging: !isProduction,
          maxQueryExecutionTime: 1000,
          poolSize: configService.get('DB_POOL_SIZE', 20),
          extra: {
            max: configService.get('DB_POOL_SIZE', 20),
            idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 30000),
            connectionTimeoutMillis: configService.get(
              'DB_CONNECTION_TIMEOUT',
              5000,
            ),
          },
        };

        if (isNeon) {
          return {
            ...baseConfig,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        return baseConfig;
      },
      inject: [ConfigService],
    }),

    // Rate Limiting (multiple tiers)
    // Generous defaults so normal app usage never hits a global limit.
    // Sensitive routes (login/register/forgot-password) get their own
    // stricter @Throttle() overrides in their controllers.
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: isProd ? 5 : 30,
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: isProd ? 20 : 100,
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: isProd ? 100 : 300,
      },
    ]),

    // Feature modules
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply ThrottlerGuard globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}