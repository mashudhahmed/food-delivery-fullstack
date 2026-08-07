import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { NotificationPreferencesModule } from './notification-preferences.module';
import { TwoFactorService } from '../common/services/two-factor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(() => AuthModule),
    CloudinaryModule,
    NotificationPreferencesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, TwoFactorService],
  exports: [TypeOrmModule, UsersService, NotificationPreferencesModule],
})
export class UsersModule {}