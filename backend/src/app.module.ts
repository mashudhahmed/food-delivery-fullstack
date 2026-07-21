import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' 
        ? '.env.production' 
        : process.env.NODE_ENV === 'neon' 
          ? '.env.neon' 
          : '.env.local',
    }),
    
    // Database with production-safe settings
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
          synchronize: false, // ⚠️ ALWAYS false in production
          logging: !isProduction,
          maxQueryExecutionTime: 1000,
          poolSize: configService.get('DB_POOL_SIZE', 20),
          extra: {
            max: configService.get('DB_POOL_SIZE', 20),
            idleTimeoutMillis: configService.get('DB_IDLE_TIMEOUT', 30000),
            connectionTimeoutMillis: configService.get('DB_CONNECTION_TIMEOUT', 5000),
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
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
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
  providers: [AppService],
})
export class AppModule {}