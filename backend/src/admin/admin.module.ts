import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { MenuItem } from '../menu/entities/menu-item.entity';
import { DeliveryAgent } from '../delivery/entities/delivery-agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Order,
      Restaurant,
      MenuItem,
      DeliveryAgent,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}