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
      // 1. Validate restaurant is open
      const restaurant = await this.restaurantsService.findOne(createOrderDto.restaurantId);
      if (!restaurant.isOpen) {
        throw new BadRequestException('Restaurant is currently closed');
      }

      // 2. Calculate subtotal from items
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

      // 3. Calculate fees
      const deliveryFee = 50;
      const platformFee = 20;
      const totalAmount = subtotal + deliveryFee + platformFee;

      // 4. Create and save order with all price fields
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

      // 5. Save order items
      for (const item of orderItems) {
        const orderItem = this.orderItemRepository.create({
          ...item,
          orderId: savedOrder.id,
        });
        await this.orderItemRepository.save(orderItem);
      }

      // 6. Fetch complete order with ALL relations
      const completeOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'restaurant', 'items', 'items.menuItem'],
      });

      if (!completeOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      // 7. Send email confirmation (don't let email failure break the order)
      try {
        await this.mailService.sendOrderConfirmation(completeOrder);
      } catch (emailError) {
        console.error('Email sending failed:', emailError.message);
      }

      // 8. Send real-time notifications
      try {
        // Notify customer
        await this.notificationsService.notifyOrderPlaced(customerId, savedOrder.id);
        
        // Notify restaurant owner
        await this.notificationsService.notifyNewOrder(restaurant.ownerId, savedOrder.id, restaurant.name);
      } catch (notificationError) {
        console.error('Notification sending failed:', notificationError.message);
      }

      // 9. Return the complete order
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

  // Get orders for owner's restaurants
  async getOwnerRestaurantOrders(ownerId: string) {
    // First get all restaurants owned by this owner
    const restaurants = await this.restaurantsService.findByOwnerId(ownerId);
    const restaurantIds = restaurants.map(r => r.id);
    
    if (restaurantIds.length === 0) {
      return [];
    }
    
    // Then get orders for those restaurants
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

    // Check permission for owner - verify they own the restaurant
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

    order.status = status;
    await this.orderRepository.save(order);

    // Send email notification
    await this.mailService.sendOrderStatusUpdate(order);

    // Send real-time notification to customer
    try {
      await this.notificationsService.notifyOrderStatusUpdate(order.customerId, id, status);
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
    }

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

    // Send real-time notification to agent
    try {
      await this.notificationsService.notifyNewDelivery(agentId, orderId);
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

    // Send real-time notification to customer
    try {
      await this.notificationsService.notifyOrderStatusUpdate(order.customerId, orderId, status);
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

    // Send real-time notification to customer
    try {
      await this.notificationsService.notifyOrderStatusUpdate(order.customerId, id, OrderStatus.CANCELLED);
    } catch (notificationError) {
      console.error('Notification sending failed:', notificationError.message);
    }

    return { message: 'Order cancelled successfully' };
  }
}