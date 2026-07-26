import { OrderStatus } from './entities/order.entity';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED],
  [OrderStatus.ON_THE_WAY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [], // terminal
  [OrderStatus.CANCELLED]: [], // terminal
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCanTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new BadRequestException(
      `Invalid status transition: ${from} → ${to}`,
    );
  }
}

export function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] || [];
}