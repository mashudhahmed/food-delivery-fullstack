import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from './entities/order.entity';

export function assertCanTransition(current: OrderStatus, next: OrderStatus) {
  const allowedTransitions = {
    [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
    [OrderStatus.READY]: [OrderStatus.PICKED_UP],
    [OrderStatus.PICKED_UP]: [OrderStatus.ON_THE_WAY],
    [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };
  if (!allowedTransitions[current]?.includes(next)) {
    throw new BadRequestException(`Cannot transition from ${current} to ${next}`);
  }
}