import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from './entities/delivery.entity';
import { DeliveryAgent } from './entities/delivery-agent.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Delivery, DeliveryAgent])],
  providers: [],
  controllers: [],
  exports: [TypeOrmModule],
})
export class DeliveryModule {}