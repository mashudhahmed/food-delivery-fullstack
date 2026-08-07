import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource, IsNull } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateMultiOrderDto } from './dto/create-multi-order.dto';
import { MenuService } from '../menu/menu.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UserRole } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { assertCanTransition } from './order-status.machine';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly menuService: MenuService,
    private readonly restaurantsService: RestaurantsService,
    // REMOVED: private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE SINGLE ORDER (existing)
  // ─────────────────────────────────────────────
  async createOrder(customerId: string, createOrderDto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const restaurant = await this.restaurantsService.findOne(
        createOrderDto.restaurantId,
      );

      if (!restaurant.isOpen) {
        throw new BadRequestException('Restaurant is currently closed');
      }

      if (restaurant.isDeleted) {
        throw new BadRequestException('Restaurant is no longer available');
      }

      let subtotal = 0;
      const orderItemsData: Partial<OrderItem>[] = [];

      for (const item of createOrderDto.items) {
        const menuItem = await this.menuService.getMenuItem(item.menuItemId);

        if (!menuItem.isAvailable) {
          throw new BadRequestException(
            `Menu item "${menuItem.name}" is not available`,
          );
        }

        if (menuItem.restaurantId !== createOrderDto.restaurantId) {
          throw new BadRequestException(
            `Menu item "${menuItem.name}" does not belong to this restaurant`,
          );
        }

        const itemTotal = Number(menuItem.price) * item.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price,
        });
      }

      if (orderItemsData.length === 0) {
        throw new BadRequestException('Order must contain at least one item');
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

      const savedOrder = await queryRunner.manager.save(order);

      for (const itemData of orderItemsData) {
        const orderItem = this.orderItemRepository.create({
          ...itemData,
          orderId: savedOrder.id,
        });
        await queryRunner.manager.save(orderItem);
      }

      await queryRunner.commitTransaction();

      const completeOrder = await this.orderRepository.findOne({
        where: { id: savedOrder.id },
        relations: ['customer', 'restaurant', 'items', 'items.menuItem'],
      });

      if (!completeOrder) {
        throw new NotFoundException('Order not found after creation');
      }

      try {
        await this.notificationsService.notifyOrderPlaced(
          customerId,
          savedOrder.id,
        );
        await this.notificationsService.notifyNewOrder(
          restaurant.ownerId,
          savedOrder.id,
          restaurant.name,
        );
      } catch (err) {
        console.error('Notification sending failed:', err.message);
      }

      return completeOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // CREATE MULTI-RESTAURANT ORDER (NEW)
  // ─────────────────────────────────────────────
  async createMultiRestaurantOrder(
    customerId: string,
    createMultiOrderDto: CreateMultiOrderDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const createdOrders: Order[] = [];
    const allErrors: string[] = [];

    try {
      const { restaurants, deliveryAddress, deliveryInstructions, customerInfo, paymentMethod } = createMultiOrderDto;

      // Process each restaurant's cart
      for (const restaurantCart of restaurants) {
        try {
          const restaurant = await this.restaurantsService.findOne(restaurantCart.restaurantId);

          if (!restaurant.isOpen) {
            allErrors.push(`"${restaurant.name}" is currently closed`);
            continue;
          }

          if (restaurant.isDeleted) {
            allErrors.push(`"${restaurant.name}" is no longer available`);
            continue;
          }

          // Calculate subtotal for this restaurant
          let subtotal = 0;
          const orderItemsData: Partial<OrderItem>[] = [];

          for (const item of restaurantCart.items) {
            const menuItem = await this.menuService.getMenuItem(item.menuItemId);

            if (!menuItem.isAvailable) {
              allErrors.push(`"${menuItem.name}" from "${restaurant.name}" is not available`);
              continue;
            }

            if (menuItem.restaurantId !== restaurantCart.restaurantId) {
              allErrors.push(`"${menuItem.name}" does not belong to "${restaurant.name}"`);
              continue;
            }

            const itemTotal = Number(menuItem.price) * item.quantity;
            subtotal += itemTotal;

            orderItemsData.push({
              menuItemId: item.menuItemId,
              quantity: item.quantity,
              unitPrice: menuItem.price,
            });
          }

          if (orderItemsData.length === 0) {
            allErrors.push(`"${restaurant.name}" has no valid items in cart`);
            continue;
          }

          // Calculate fees per restaurant
          const deliveryFee = 50;
          const platformFee = 20;
          const totalAmount = subtotal + deliveryFee + platformFee;

          // Create individual order for this restaurant
          const order = this.orderRepository.create({
            customerId,
            restaurantId: restaurantCart.restaurantId,
            deliveryAddress,
            subtotal,
            deliveryFee,
            platformFee,
            totalAmount,
            status: OrderStatus.PENDING,
            deliveryInstructions: restaurantCart.deliveryInstructions || deliveryInstructions || null,
            customerName: customerInfo?.fullName || null,
            customerEmail: customerInfo?.email || null,
            customerPhone: customerInfo?.phone || null,
            paymentMethod: paymentMethod || null,
          });

          const savedOrder = await queryRunner.manager.save(order);

          // Save order items
          for (const itemData of orderItemsData) {
            const orderItem = this.orderItemRepository.create({
              ...itemData,
              orderId: savedOrder.id,
            });
            await queryRunner.manager.save(orderItem);
          }

          // Get complete order with relations
          const completeOrder = await this.orderRepository.findOne({
            where: { id: savedOrder.id },
            relations: ['customer', 'restaurant', 'items', 'items.menuItem'],
          });

          if (completeOrder) {
            createdOrders.push(completeOrder);
          }

          try {
            await this.notificationsService.notifyOrderPlaced(customerId, savedOrder.id);
            await this.notificationsService.notifyNewOrder(restaurant.ownerId, savedOrder.id, restaurant.name);
          } catch (err) {
            console.error('Notification failed for order', savedOrder.id, err.message);
          }

        } catch (error) {
          allErrors.push(`Error processing "${restaurantCart.restaurantId}": ${error.message}`);
        }
      }

      if (createdOrders.length === 0) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException(
          `No orders could be placed. Errors: ${allErrors.join('; ')}`
        );
      }

      await queryRunner.commitTransaction();

      // Calculate total summary
      const totalAmount = createdOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const totalItems = createdOrders.reduce((sum, o) => 
        sum + (o.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0
      );

      return {
        message: `${createdOrders.length} order(s) placed successfully`,
        orders: createdOrders,
        summary: {
          totalAmount,
          totalItems,
          restaurantCount: createdOrders.length,
          orderIds: createdOrders.map(o => o.id),
        },
        errors: allErrors.length > 0 ? allErrors : undefined,
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // GET ALL ORDERS FROM MULTI-RESTAURANT CHECKOUT
  // ─────────────────────────────────────────────
  async getMultiRestaurantOrders(customerId: string, orderIds: string[]) {
    if (!orderIds || orderIds.length === 0) {
      throw new BadRequestException('No order IDs provided');
    }

    const orders = await this.orderRepository.find({
      where: { 
        id: In(orderIds),
        customerId,
      },
      relations: ['restaurant', 'items', 'items.menuItem', 'agent'],
      order: { placedAt: 'DESC' },
    });

    if (orders.length !== orderIds.length) {
      throw new NotFoundException('Some orders not found or not owned by you');
    }

    return {
      orders,
      summary: {
        totalOrders: orders.length,
        totalAmount: orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
        statuses: orders.reduce((acc, o) => {
          acc[o.status] = (acc[o.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      },
    };
  }

  // ─────────────────────────────────────────────
  // UPDATE ORDER STATUS
  // ─────────────────────────────────────────────
  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    userId: string,
    userRole: UserRole,
  ) {
    const order = await this.getOrderWithDetails(id);

    if (userRole === UserRole.OWNER) {
      const restaurants = await this.restaurantsService.findByOwnerId(userId);
      const restaurantIds = restaurants.map((r) => r.id);
      if (!restaurantIds.includes(order.restaurantId)) {
        throw new ForbiddenException('You do not own this restaurant');
      }
    } else if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update order status',
      );
    }

    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot update order that is already ${order.status}`,
      );
    }

    assertCanTransition(order.status, status);

    const previousStatus = order.status;
    order.status = status;
    await this.orderRepository.save(order);

    try {
      await this.notificationsService.notifyOrderStatusUpdate(
        order.customerId,
        id,
        status,
      );

      if (status === OrderStatus.READY && previousStatus !== OrderStatus.READY) {
        const earnings = order.deliveryFee || 50;
        await this.notificationsService.notifyOrderReadyForAgents(
          id,
          order.restaurant.name,
          earnings,
        );
      }
    } catch (err) {
      console.error('Notification sending failed:', err.message);
    }

    return order;
  }

  // ─────────────────────────────────────────────
  // LIST / DETAIL HELPERS
  // ─────────────────────────────────────────────

  async getCustomerOrders(customerId: string) {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['restaurant', 'items', 'items.menuItem'],
      order: { placedAt: 'DESC' },
    });
  }

  async findAllOrders() {
    return this.orderRepository.find({
      relations: ['restaurant', 'items', 'items.menuItem', 'customer', 'agent'],
      order: { placedAt: 'DESC' },
    });
  }

  async getOwnerRestaurantOrders(ownerId: string) {
    const restaurants = await this.restaurantsService.findByOwnerId(ownerId);
    const restaurantIds = restaurants.map((r) => r.id);

    if (restaurantIds.length === 0) return [];

    return this.orderRepository.find({
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

  // ─────────────────────────────────────────────
  // AGENT: available + my orders + accept
  // ─────────────────────────────────────────────

  async getAvailableOrders() {
    return this.orderRepository.find({
      where: {
        status: OrderStatus.READY,
        agentId: IsNull(),
      },
      relations: ['restaurant', 'items', 'items.menuItem', 'customer'],
      order: { placedAt: 'ASC' },
    });
  }

  async getAgentOrders(agentId: string) {
    return this.orderRepository.find({
      where: { agentId },
      relations: ['restaurant', 'items', 'items.menuItem', 'customer'],
      order: { placedAt: 'DESC' },
    });
  }

  async acceptOrder(orderId: string, agentId: string) {
    const order = await this.getOrderWithDetails(orderId);

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Order is not ready for pickup');
    }
    if (order.agentId) {
      throw new BadRequestException('Order already assigned to another agent');
    }

    order.agentId = agentId;
    await this.orderRepository.save(order);

    try {
      await this.notificationsService.sendToUser(order.customerId, {
        type: 'order_assigned',
        title: 'Delivery Agent Assigned',
        message: 'A delivery agent has been assigned to your order',
        data: { orderId },
      });
    } catch (err) {
      console.error('Notification failed:', err?.message);
    }

    return order;
  }

  // ─────────────────────────────────────────────
  // AGENT ASSIGNMENT / DELIVERY
  // ─────────────────────────────────────────────

  async assignDeliveryAgent(
    orderId: string,
    agentId: string,
    userRole: UserRole,
  ) {
    if (userRole !== UserRole.ADMIN && userRole !== UserRole.AGENT) {
      throw new ForbiddenException(
        'Only admins or delivery agents can assign delivery agents',
      );
    }

    const order = await this.getOrderWithDetails(orderId);

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException(
        'Order must be ready before assigning a delivery agent',
      );
    }

    if (order.agentId && order.agentId !== agentId) {
      throw new BadRequestException('Order already assigned to another agent');
    }

    order.agentId = agentId;
    await this.orderRepository.save(order);

    const restaurant = await this.restaurantsService.findOne(order.restaurantId);

    try {
      await this.notificationsService.sendToUser(restaurant.ownerId, {
        type: 'agent_assigned',
        title: 'Delivery Agent Assigned',
        message: `Agent has been assigned to order #${orderId.slice(-8)}`,
        data: { orderId, agentId },
      });

      await this.notificationsService.sendToUser(order.customerId, {
        type: 'order_assigned',
        title: 'Delivery Agent Assigned',
        message: `A delivery agent has been assigned to your order`,
        data: { orderId },
      });
    } catch (err) {
      console.error('Notification sending failed:', err.message);
    }

    return order;
  }

  async updateDeliveryStatus(
    orderId: string,
    status: string,
    agentId: string,
  ) {
    const order = await this.getOrderWithDetails(orderId);

    if (order.agentId !== agentId) {
      throw new ForbiddenException('You are not assigned to this order');
    }

    const orderStatus = status as OrderStatus;

    if (
      orderStatus !== OrderStatus.PICKED_UP &&
      orderStatus !== OrderStatus.ON_THE_WAY &&
      orderStatus !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Agents can only update to picked_up, on_the_way or delivered',
      );
    }

    assertCanTransition(order.status, orderStatus);

    order.status = orderStatus;
    await this.orderRepository.save(order);

    try {
      if (orderStatus === OrderStatus.PICKED_UP) {
        await this.notificationsService.sendToUser(order.customerId, {
          type: 'order_picked_up',
          title: 'Order Picked Up',
          message: `Your order has been picked up by the delivery agent`,
          data: { orderId },
        });
      }

      if (orderStatus === OrderStatus.DELIVERED) {
        const earnings = order.deliveryFee || 50;

        await this.notificationsService.notifyAgentEarnings(
          agentId,
          orderId,
          earnings,
        );

        await this.notificationsService.sendToUser(order.customerId, {
          type: 'order_delivered',
          title: 'Order Delivered!',
          message: `Your order has been delivered. Enjoy your meal!`,
          data: { orderId },
        });
      }
    } catch (err) {
      console.error('Notification error:', err.message);
    }

    return order;
  }

  // ─────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────

  async cancelOrder(id: string, userId: string, userRole: UserRole) {
    const order = await this.getOrderWithDetails(id);

    if (order.customerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to cancel this order',
      );
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    assertCanTransition(order.status, OrderStatus.CANCELLED);

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    try {
      await this.notificationsService.notifyOrderStatusUpdate(
        order.customerId,
        id,
        OrderStatus.CANCELLED,
      );

      const restaurant = await this.restaurantsService.findOne(
        order.restaurantId,
      );
      await this.notificationsService.sendToUser(restaurant.ownerId, {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order #${id.slice(-8)} has been cancelled`,
        data: { id },
      });
    } catch (err) {
      console.error('Notification sending failed:', err.message);
    }

    return { message: 'Order cancelled successfully' };
  }

  // ─────────────────────────────────────────────
  // CANCEL MULTI-RESTAURANT ORDER
  // ─────────────────────────────────────────────
  async cancelMultiRestaurantOrders(orderIds: string[], userId: string, userRole: UserRole) {
    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        const result = await this.cancelOrder(orderId, userId, userRole);
        results.push({ orderId, success: true, ...result });
      } catch (error) {
        errors.push({ orderId, error: error.message });
      }
    }

    return {
      message: `${results.length} order(s) cancelled successfully`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ─────────────────────────────────────────────
  // OWNER ANALYTICS
  // ─────────────────────────────────────────────

  async getOwnerAnalytics(
    ownerId: string,
    restaurantId?: string,
    period: 'week' | 'month' | 'year' = 'week',
  ): Promise<any> {
    const restaurants = await this.restaurantsService.findByOwnerId(ownerId);

    if (restaurants.length === 0) {
      return this.emptyAnalytics();
    }

    const ownedIds = restaurants.map((r) => r.id);

    let restaurantIds: string[];
    if (restaurantId) {
      if (!ownedIds.includes(restaurantId)) {
        throw new ForbiddenException(
          'You do not have access to this restaurant',
        );
      }
      restaurantIds = [restaurantId];
    } else {
      restaurantIds = ownedIds;
    }

    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;

    if (period === 'week') {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 7);
      previousStart = new Date(now);
      previousStart.setDate(now.getDate() - 14);
    } else if (period === 'month') {
      currentStart = new Date(now);
      currentStart.setMonth(now.getMonth() - 1);
      previousStart = new Date(now);
      previousStart.setMonth(now.getMonth() - 2);
    } else {
      currentStart = new Date(now);
      currentStart.setFullYear(now.getFullYear() - 1);
      previousStart = new Date(now);
      previousStart.setFullYear(now.getFullYear() - 2);
    }

    const allOrders = await this.orderRepository.find({
      where: { restaurantId: In(restaurantIds) },
      relations: ['items', 'items.menuItem'],
      order: { placedAt: 'DESC' },
    });

    const completed = allOrders.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    );

    const totalRevenue = completed.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0,
    );
    const totalOrders = allOrders.length;
    const avgOrderValue = completed.length
      ? Math.round(totalRevenue / completed.length)
      : 0;
    const completionRate = totalOrders
      ? Math.round((completed.length / totalOrders) * 100)
      : 0;

    const currentOrders = allOrders.filter(
      (o) => new Date(o.placedAt) >= currentStart,
    );
    const previousOrders = allOrders.filter((o) => {
      const d = new Date(o.placedAt);
      return d >= previousStart && d < currentStart;
    });

    const currentRevenue = currentOrders
      .filter((o) => o.status === OrderStatus.DELIVERED)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const previousRevenue = previousOrders
      .filter((o) => o.status === OrderStatus.DELIVERED)
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const revenueGrowth = previousRevenue
      ? Number(
          (
            ((currentRevenue - previousRevenue) / previousRevenue) *
            100
          ).toFixed(1),
        )
      : 0;

    const orderGrowth = previousOrders.length
      ? Number(
          (
            ((currentOrders.length - previousOrders.length) /
              previousOrders.length) *
            100
          ).toFixed(1),
        )
      : 0;

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const revenueTrend = last7Days.map((date) => {
      const dayOrders = allOrders.filter((o) => {
        const od = new Date(o.placedAt);
        return od.toDateString() === date.toDateString();
      });

      const dayRevenue = dayOrders
        .filter((o) => o.status === OrderStatus.DELIVERED)
        .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

      return {
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayRevenue,
        orders: dayOrders.length,
      };
    });

    const orderStatusData = [
      { name: 'Completed', value: completed.length, color: '#10b981' },
      {
        name: 'Pending',
        value: allOrders.filter((o) => o.status === OrderStatus.PENDING).length,
        color: '#eab308',
      },
      {
        name: 'Preparing',
        value: allOrders.filter((o) => o.status === OrderStatus.PREPARING)
          .length,
        color: '#3b82f6',
      },
      {
        name: 'Cancelled',
        value: allOrders.filter((o) => o.status === OrderStatus.CANCELLED)
          .length,
        color: '#ef4444',
      },
    ].filter((i) => i.value > 0);

    const itemMap = new Map<
      string,
      { name: string; sales: number; revenue: number }
    >();

    for (const order of completed) {
      if (!order.items) continue;
      for (const item of order.items) {
        const key = item.menuItemId;
        const itemName =
          item.menuItem?.name || (item as any).name || 'Unknown';
        const existing = itemMap.get(key) || {
          name: itemName,
          sales: 0,
          revenue: 0,
        };
        existing.sales += item.quantity || 1;
        existing.revenue += Number(item.unitPrice) * (item.quantity || 1);
        itemMap.set(key, existing);
      }
    }

    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      completionRate,
      revenueGrowth,
      orderGrowth,
      avgOrderGrowth: 0,
      conversionGrowth: 0,
      revenueTrend,
      orderStatusData,
      popularItems,
      categoryData: [],
    };
  }

  private emptyAnalytics() {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      completionRate: 0,
      revenueGrowth: 0,
      orderGrowth: 0,
      avgOrderGrowth: 0,
      conversionGrowth: 0,
      revenueTrend: [],
      orderStatusData: [],
      popularItems: [],
      categoryData: [],
    };
  }

  async getRestaurantsByOwner(ownerId: string) {
    return this.restaurantsService.findByOwnerId(ownerId);
  }
}