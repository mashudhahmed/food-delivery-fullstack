import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MenuService } from '../menu/menu.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private menuService: MenuService,
    private restaurantsService: RestaurantsService,
    private mailService: MailService,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    const restaurant = await this.restaurantsService.findOne(createOrderDto.restaurantId);

    if (!restaurant.isOpen) {
      throw new BadRequestException('Restaurant is currently closed');
    }

    let totalAmount = 0;
    const orderItems = [];

    for (const item of createOrderDto.items) {
      const menuItem = await this.menuService.getMenuItem(item.menuItemId);

      if (!menuItem.isAvailable) {
        throw new BadRequestException(`Menu item ${menuItem.name} is not available`);
      }

      if (menuItem.restaurantId !== createOrderDto.restaurantId) {
        throw new BadRequestException(`Menu item ${menuItem.name} does not belong to this restaurant`);
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
      });
    }

    const order = this.orderRepository.create({
      customerId,
      restaurantId: createOrderDto.restaurantId,
      deliveryAddress: createOrderDto.deliveryAddress,
      totalAmount,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    for (const item of orderItems) {
      const orderItem = this.orderItemRepository.create({
        ...item,
        orderId: savedOrder.id,
      });
      await this.orderItemRepository.save(orderItem);
    }

   const customer = await this.orderRepository.findOne({
  where: { id: savedOrder.id },
  relations: ['customer', 'restaurant', 'items', 'items.menuItem'],
});

if (!customer) {
  throw new NotFoundException('Order not found after creation');
}

    await this.mailService.sendOrderConfirmation(customer);

    return this.getOrderWithDetails(savedOrder.id);
  }

  async getCustomerOrders(customerId: string) {
    return await this.orderRepository.find({
      where: { customerId },
      relations: ['restaurant', 'items', 'items.menuItem'],
      order: { placedAt: 'DESC' },
    });
  }

  async getOrderWithDetails(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'restaurant', 'agent', 'items', 'items.menuItem'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(id: string, status: OrderStatus, userId: string, userRole: UserRole) {
    const order = await this.getOrderWithDetails(id);

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.OWNER) {
      throw new ForbiddenException('You do not have permission to update order status');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update order that is already ${order.status}`);
    }

    order.status = status;
    await this.orderRepository.save(order);

    await this.mailService.sendOrderStatusUpdate(order);

    return order;
  }

  async assignDeliveryAgent(orderId: string, agentId: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can assign delivery agents');
    }

    const order = await this.getOrderWithDetails(orderId);

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order must be ready before assigning a delivery agent');
    }

    order.agentId = agentId;
    await this.orderRepository.save(order);

    return order;
  }

  async updateDeliveryStatus(orderId: string, status: OrderStatus, agentId: string) {
    const order = await this.getOrderWithDetails(orderId);

    if (order.agentId !== agentId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    if (status !== OrderStatus.PICKED_UP && status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Agents can only update to picked_up or delivered');
    }

    order.status = status;
    await this.orderRepository.save(order);

    if (status === OrderStatus.DELIVERED) {
      await this.mailService.sendOrderDelivered(order);
    }

    return order;
  }

  async cancelOrder(id: string, userId: string, userRole: UserRole) {
    const order = await this.getOrderWithDetails(id);

    if (order.customerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { message: 'Order cancelled successfully' };
  }
}