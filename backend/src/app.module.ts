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

@Module({
  imports: [
    // Load different .env file based on NODE_ENV
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'neon' ? '.env.neon' : '.env.local',
    }),
    
    // Database configuration with dual support
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get('DB_HOST');
        const isNeon = host?.includes('neon.tech');
        
        const baseConfig = {
          type: 'postgres' as const,
          host: host,
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USERNAME'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_DATABASE'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,  // Set to false in production
          logging: true,
        };

        // Add SSL only for Neon
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
    
    ThrottlerModule.forRoot([{
      ttl: 60,
      limit: 10,
    }]),
    
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
    FavoritesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}