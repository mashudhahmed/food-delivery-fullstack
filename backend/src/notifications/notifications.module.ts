import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { Notification } from './entities/notification.entity';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module'; // <-- ADD THIS IMPORT

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    UsersModule,
    AuthModule, // <-- ADD THIS TO IMPORTS (Provides JwtService for the Gateway)
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway],
  exports: [NotificationsService],
})
export class NotificationsModule {}