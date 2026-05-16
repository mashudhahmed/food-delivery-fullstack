// backend/src/orders/orders.service.ts

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { MenuService } from '../menu/menu.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

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
    private notificationsService: NotificationsService,
  ) {}

  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    try {
      const restaurant = await this.restaurantsService.findOne(createOrderDto.restaurantId);
      if (!restaurant.isOpen) {
        throw new BadRequestException('Restaurant is currently closed');
      }

      let subtotal = 0;
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
        subtotal += itemTotal;

        orderItems.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
        });
      }

      const deliveryFee = 50;
      const platformFee = 20;
      const totalAmount = subtotal + deliveryFee + platformFee;

      const order = this.orderRepository.create({
        customerId,
        restaurantId: createOrderDto.restaurantId,
        deliveryAddress: createOrderDto.deliveryAddress,
        subtotal,
        deliveryFee,
        platformFee,
        totalAmount,
        status: OrderStatus.PENDING,
        deliveryInstructions: createOrderDto.deliveryInstructions || null,
        customerName: createOrderDto.customerInfo?.fullName || null,
        customerEmail: createOrderDto.customerInfo?.email || null,
        customerPhone: createOrderDto.customerInfo?.phone || null,
        paymentMethod: createOrderDto.paymentMethod || null,
      });

      const savedOrder = await this.orderRepository.save(order);

      for (const item of orderItems) {
        const orderItem = this.orderItemRepository.create({
          ...item,
          orderId: savedOrder.id,
        });
        await this.orderItemRepository.save(orderItem);
      }

      const completeOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'restaurant', 'items', 'items.menuItem'],
      });

      if (!completeOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      try {
        await this.mailService.sendOrderConfirmation(completeOrder);
      } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
      }

      try {
        await this.notificationsService.notifyOrderPlaced(customerId, savedOrder.id);
        await this.notificationsService.notifyNewOrder(restaurant.ownerId, savedOrder.id, restaurant.name);
      } catch (notificationError) {
        console.error('Notification sending failed:', notificationError.message);
      }

      return completeOrder;
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  }

  async getCustomerOrders(customerId: string) {
    return await this.orderRepository.find({
      where: { customerId },
      relations: ['restaurant', 'items', 'items.menuItem'],
      order: { placedAt: 'DESC' },
    });
  }

  async findAllOrders() {
    return await this.orderRepository.find({
      relations: ['restaurant', 'items', 'items.menuItem', 'customer', 'agent'],
      order: { placedAt: 'DESC' },
    });
  }

  async getOwnerRestaurantOrders(ownerId: string) {
    const restaurants = await this.restaurantsService.findByOwnerId(ownerId);
    const restaurantIds = restaurants.map(r => r.id);
    
    if (restaurantIds.length === 0) {
      return [];
    }
    
    return await this.orderRepository.find({
      where: { restaurantId: In(restaurantIds) },
      relations: ['restaurant', 'items', 'items.menuItem', 'customer', 'agent'],
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

    if (userRole === UserRole.OWNER) {
      const restaurants = await this.restaurantsService.findByOwnerId(userId);
      const restaurantIds = restaurants.map(r => r.id);
      if (!restaurantIds.includes(order.restaurantId)) {
        throw new ForbiddenException('You do not own this restaurant');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update order status');
    }

    if (order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(`Cannot update order that is already ${order.status}`);
    }

    const previousStatus = order.status;
    order.status = status;
    await this.orderRepository.save(order);

    await this.mailService.sendOrderStatusUpdate(order);

    try {
      await this.notificationsService.notifyOrderStatusUpdate(order.customerId, id, status);
      
      if (status === OrderStatus.READY && previousStatus !== OrderStatus.READY) {
        const earnings = order.deliveryFee || 50;
        console.log(`📢 Order #${id.slice(-8)} is READY! Notifying all agents...`);
        await this.notificationsService.notifyOrderReadyForAgents(id, order.restaurant.name, earnings);
      }
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
    }

    return order;
  }

  async assignDeliveryAgent(orderId: string, agentId: string, userRole: UserRole) {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
      throw new ForbiddenException('Only admins or delivery agents can assign delivery agents');
    }

    const order = await this.getOrderWithDetails(orderId);

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order must be ready before assigning a delivery agent');
    }

    if (order.agentId && order.agentId !== agentId) {
      throw new BadRequestException('Order already assigned to another agent');
    }

    // ✅ FIX: ONLY assign the agent - DO NOT change status to picked_up
    // Status changes only when agent physically picks up the order
    order.agentId = agentId;
    // REMOVED: order.status = OrderStatus.PICKED_UP;
    await this.orderRepository.save(order);

    const restaurant = await this.restaurantsService.findOne(order.restaurantId);

    try {
      await this.notificationsService.sendToUser(restaurant.ownerId, {
        type: 'agent_assigned',
        title: 'Delivery Agent Assigned',
        message: `Agent has been assigned to order #${orderId.slice(-8)} and is on the way`,
        data: { orderId, agentId },
      });
      
      await this.notificationsService.sendToUser(order.customerId, {
        type: 'order_assigned',
        title: 'Delivery Agent Assigned',
        message: `A delivery agent has been assigned to your order`,
        data: { orderId },
      });
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
    }

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

    try {
      if (status === OrderStatus.PICKED_UP) {
        await this.notificationsService.sendToUser(order.customerId, {
          type: 'order_on_the_way',
          title: 'Order On The Way!',
          message: `Your order has been picked up and is on its way to you`,
          data: { orderId },
        });
        
        const restaurant = await this.restaurantsService.findOne(order.restaurantId);
        await this.notificationsService.sendToUser(restaurant.ownerId, {
          type: 'order_picked_up',
          title: 'Order Picked Up',
          message: `Order #${orderId.slice(-8)} has been picked up by the delivery agent`,
          data: { orderId },
        });
      }
      
      if (status === OrderStatus.DELIVERED) {
        const earnings = order.deliveryFee || 50;
        
        await this.notificationsService.notifyAgentEarnings(agentId, orderId, earnings);
        
        await this.notificationsService.sendToUser(order.customerId, {
          type: 'order_delivered',
          title: 'Order Delivered!',
          message: `Your order has been delivered. Enjoy your meal!`,
          data: { orderId },
        });
        
        const restaurant = await this.restaurantsService.findOne(order.restaurantId);
        await this.notificationsService.sendToUser(restaurant.ownerId, {
          type: 'order_completed',
          title: 'Order Completed',
          message: `Order #${orderId.slice(-8)} has been delivered successfully`,
          data: { orderId },
        });
      }
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
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

    try {
      await this.notificationsService.notifyOrderStatusUpdate(order.customerId, id, OrderStatus.CANCELLED);
      
      const restaurant = await this.restaurantsService.findOne(order.restaurantId);
      await this.notificationsService.sendToUser(restaurant.ownerId, {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order #${id.slice(-8)} has been cancelled`,
        data: { id },
      });
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
    }

    return { message: 'Order cancelled successfully' };
  }
}