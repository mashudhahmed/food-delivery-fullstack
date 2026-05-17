// backend/src/admin/admin.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { NotificationDto } from './dto/notification.dto';
import {
  RevenueChartDataDto,
  OrderChartDataDto,
  UserChartDataDto,
} from './dto/chart-data.dto';

@Injectable()
export class AdminService {
  verifyAgentDocument(agentId: string, documentType: string, verified: boolean) {
    throw new Error('Method not implemented.');
  }
  verifyRestaurant(restaurantId: string, verified: boolean) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
  ) {}

  // ==================== DASHBOARD STATS ====================
  
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      pendingOwners,
      pendingAgents,
      activeAgents,
      avgRating,
      completedOrders,
      totalRevenue,
    ] = await Promise.all([
      this.userRepository.count(),
      this.restaurantRepository.count(),
      this.orderRepository.count(),
      this.userRepository.count({
        where: { role: UserRole.OWNER, status: UserStatus.PENDING },
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.PENDING },
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.APPROVED },
      }),
      this.restaurantRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .getRawOne(),
      this.orderRepository.count({
        where: { status: OrderStatus.DELIVERED },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
    ]);

    // Previous month calculations
    const prevMonthOrders = await this.orderRepository.count({
      where: {
        placedAt: Between(lastMonthStart, lastMonthEnd),
        status: OrderStatus.DELIVERED,
      },
    });

    const prevMonthRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.placedAt BETWEEN :start AND :end', {
        start: lastMonthStart,
        end: lastMonthEnd,
      })
      .getRawOne();

    const prevMonthUsers = await this.userRepository.count({
      where: {
        createdAt: Between(lastMonthStart, lastMonthEnd),
      },
    });

    const currentMonthOrders = await this.orderRepository.count({
      where: {
        placedAt: Between(thisMonthStart, now),
        status: OrderStatus.DELIVERED,
      },
    });

    const currentMonthRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: OrderStatus.DELIVERED })
      .andWhere('order.placedAt >= :start', { start: thisMonthStart })
      .getRawOne();

    const currentMonthUsers = await this.userRepository.count({
      where: {
        createdAt: Between(thisMonthStart, now),
      },
    });

    const revenueGrowth = prevMonthRevenue?.total
      ? ((currentMonthRevenue?.total || 0) - prevMonthRevenue.total) / prevMonthRevenue.total * 100
      : 0;

    const orderGrowth = prevMonthOrders
      ? (currentMonthOrders - prevMonthOrders) / prevMonthOrders * 100
      : 0;

    const userGrowth = prevMonthUsers
      ? (currentMonthUsers - prevMonthUsers) / prevMonthUsers * 100
      : 0;

    const completionRate = totalOrders
      ? (completedOrders / totalOrders) * 100
      : 0;

    return {
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue: Number(totalRevenue?.total) || 0,
      pendingOwners,
      pendingAgents,
      activeAgents,
      avgRating: Number(avgRating?.avg) || 0,
      revenueGrowth: Math.round(revenueGrowth),
      orderGrowth: Math.round(orderGrowth),
      userGrowth: Math.round(userGrowth),
      completionRate: Math.round(completionRate),
    };
  }

  async getSystemStats() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    
    const [
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      weekOrders,
      weekRevenue,
      pendingCount,
      activeAgents,
      activeRestaurants,
    ] = await Promise.all([
      this.userRepository.count(),
      this.restaurantRepository.count(),
      this.orderRepository.count(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.orderRepository.count({
        where: { placedAt: Between(todayStart, now) },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.placedAt >= :start', { start: todayStart })
        .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.orderRepository.count({
        where: { placedAt: Between(weekStart, now) },
      }),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.placedAt BETWEEN :start AND :end', { start: weekStart, end: now })
        .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.userRepository.count({
        where: [
          { role: UserRole.OWNER, status: UserStatus.PENDING },
          { role: UserRole.AGENT, status: UserStatus.PENDING },
        ],
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.APPROVED },
      }),
      this.restaurantRepository.count({
        where: { isOpen: true },
      }),
    ]);

    return {
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue: Number(totalRevenue?.total) || 0,
      todayOrders,
      todayRevenue: Number(todayRevenue?.total) || 0,
      weekOrders,
      weekRevenue: Number(weekRevenue?.total) || 0,
      pendingApprovals: pendingCount,
      activeAgents,
      activeRestaurants,
    };
  }

  // ==================== USER MANAGEMENT ====================

  async getAllUsers(role?: string) {
    const whereCondition: any = {};
    if (role && role !== 'all') {
      whereCondition.role = role;
    }

    const users = await this.userRepository.find({
      where: whereCondition,
      select: [
        'id', 'fullName', 'email', 'phone', 'role', 'status', 
        'createdAt', 'lastLogin', 'businessName', 'vehicleType',
      ],
      order: { createdAt: 'DESC' },
    });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orders = await this.orderRepository.count({
          where: { customerId: user.id },
        });
        
        const totalSpent = await this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.customerId = :userId', { userId: user.id })
          .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
          .getRawOne();

        return {
          ...user,
          orders,
          totalSpent: Number(totalSpent?.total) || 0,
        };
      }),
    );

    return usersWithStats;
  }

  async getUserDetails(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['restaurants'],
    });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const orders = await this.orderRepository.find({
      where: { customerId: userId },
      relations: ['restaurant'],
      take: 20,
      order: { placedAt: 'DESC' },
    });

    const stats = {
      totalOrders: orders.length,
      completedOrders: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      totalSpent: orders
        .filter(o => o.status === OrderStatus.DELIVERED)
        .reduce((sum, o) => sum + Number(o.totalAmount), 0),
      averageOrderValue: orders.length 
        ? orders.reduce((sum, o) => sum + Number(o.totalAmount), 0) / orders.length 
        : 0,
    };

    return { user, recentOrders: orders.slice(0, 10), stats };
  }

  async updateUserStatus(userId: string, status: string, reason?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status as UserStatus;
    await this.userRepository.save(user);

    return { success: true, message: `User status updated to ${status}` };
  }

  async updateUserRole(userId: string, role: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot change admin role');
    }

    user.role = role as UserRole;
    await this.userRepository.save(user);

    return { success: true, message: `User role updated to ${role}` };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin user');
    }

    // Soft delete - just update status
    user.status = UserStatus.REJECTED;
    await this.userRepository.save(user);

    return { success: true, message: 'User deleted successfully' };
  }

  // ==================== PENDING APPROVALS ====================

  async getPendingApprovals() {
    const pendingUsers = await this.userRepository.find({
      where: [
        { role: UserRole.OWNER, status: UserStatus.PENDING },
        { role: UserRole.AGENT, status: UserStatus.PENDING },
      ],
      select: [
        'id', 'fullName', 'email', 'phone', 'role', 'createdAt',
        'businessName', 'businessAddress', 'nidNumber',
        'vehicleType', 'vehicleNumber', 'drivingLicense',
      ],
      order: { createdAt: 'ASC' },
    });

    return {
      users: pendingUsers,
      total: pendingUsers.length,
    };
  }

  async approveUser(userId: string, role?: string, notes?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (role) {
      user.role = role as UserRole;
    }
    
    user.status = UserStatus.APPROVED;
    await this.userRepository.save(user);

    return { success: true, message: 'User approved successfully', user };
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.REJECTED;
    await this.userRepository.save(user);

    return { success: true, message: 'User rejected successfully' };
  }

  // ==================== RESTAURANT MANAGEMENT ====================

  async getAllRestaurants(status?: string) {
    const whereCondition: any = {};
    
    if (status === 'active') {
      whereCondition.isOpen = true;
    } else if (status === 'inactive') {
      whereCondition.isOpen = false;
    }

    const restaurants = await this.restaurantRepository.find({
      where: whereCondition,
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    const restaurantsWithStats = await Promise.all(
      restaurants.map(async (restaurant) => {
        const orders = await this.orderRepository.count({
          where: { restaurantId: restaurant.id },
        });
        
        const revenue = await this.orderRepository
          .createQueryBuilder('order')
          .select('SUM(order.totalAmount)', 'total')
          .where('order.restaurantId = :restaurantId', { restaurantId: restaurant.id })
          .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
          .getRawOne();

        return {
          id: restaurant.id,
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          description: restaurant.description,
          cuisineType: restaurant.cuisineType,
          rating: restaurant.rating,
          isOpen: restaurant.isOpen,
          imageUrl: restaurant.imageUrl,
          ownerName: restaurant.owner?.fullName,
          ownerEmail: restaurant.owner?.email,
          ownerPhone: restaurant.owner?.phone,
          totalOrders: orders,
          totalRevenue: Number(revenue?.total) || 0,
          createdAt: restaurant.createdAt,
        };
      }),
    );

    return restaurantsWithStats;
  }

  async getRestaurantDetails(restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
      relations: ['owner'],
    });
    
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    const orders = await this.orderRepository.find({
      where: { restaurantId },
      relations: ['customer'],
      take: 50,
      order: { placedAt: 'DESC' },
    });

    const completedOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
    const totalRevenue = completedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      ...restaurant,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      averageOrderValue: completedOrders.length ? totalRevenue / completedOrders.length : 0,
      recentOrders: orders.slice(0, 20),
    };
  }

  async updateRestaurantStatus(restaurantId: string, status: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });
    
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    restaurant.isOpen = status === 'active';
    await this.restaurantRepository.save(restaurant);

    return { success: true, message: `Restaurant ${status === 'active' ? 'opened' : 'closed'} successfully` };
  }

  async deleteRestaurant(restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });
    
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    await this.restaurantRepository.delete(restaurantId);
    return { success: true, message: 'Restaurant deleted successfully' };
  }

  // ==================== ORDER MANAGEMENT ====================

  async getAllOrders(status?: string, limit: number = 50, page: number = 1) {
    const whereCondition: any = {};
    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    const [orders, total] = await this.orderRepository.findAndCount({
      where: whereCondition,
      relations: ['customer', 'restaurant', 'agent'],
      order: { placedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: orders.map(order => ({
        id: order.id,
        orderNumber: `#${order.id.slice(-8)}`,
        customerName: order.customer?.fullName || order.customerName || 'Guest',
        customerEmail: order.customer?.email || order.customerEmail,
        restaurantName: order.restaurant?.name,
        agentName: order.agent?.fullName,
        totalAmount: order.totalAmount,
        status: order.status,
        placedAt: order.placedAt,
        paymentMethod: order.paymentMethod,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderDetails(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'restaurant', 'agent', 'items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'restaurant'],
    });
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = status as OrderStatus;
    await this.orderRepository.save(order);

    return { success: true, message: `Order status updated to ${status}` };
  }

  async cancelOrder(orderId: string, reason: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel delivered order');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { success: true, message: 'Order cancelled successfully' };
  }

  // ==================== DELIVERY AGENT MANAGEMENT ====================

  async getDeliveryAgents(status?: string) {
    const whereCondition: any = { role: UserRole.AGENT };
    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    const agents = await this.userRepository.find({
      where: whereCondition,
      select: [
        'id', 'fullName', 'email', 'phone', 'status', 'createdAt',
        'vehicleType', 'vehicleNumber', 'drivingLicense',
      ],
      order: { createdAt: 'DESC' },
    });

    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const deliveries = await this.orderRepository.find({
          where: { agentId: agent.id },
        });
        
        const completedDeliveries = deliveries.filter(o => o.status === OrderStatus.DELIVERED);
        const totalEarnings = completedDeliveries.reduce((sum, o) => sum + Number(o.deliveryFee), 0);

        return {
          ...agent,
          totalDeliveries: deliveries.length,
          completedDeliveries: completedDeliveries.length,
          totalEarnings,
          isActive: agent.status === UserStatus.APPROVED,
        };
      }),
    );

    return agentsWithStats;
  }

  async getDeliveryAgentDetails(agentId: string) {
    const agent = await this.userRepository.findOne({
      where: { id: agentId, role: UserRole.AGENT },
    });
    
    if (!agent) {
      throw new NotFoundException('Delivery agent not found');
    }

    const deliveries = await this.orderRepository.find({
      where: { agentId },
      relations: ['restaurant', 'customer'],
      order: { placedAt: 'DESC' },
    });

    const completedDeliveries = deliveries.filter(o => o.status === OrderStatus.DELIVERED);
    const totalEarnings = completedDeliveries.reduce((sum, o) => sum + Number(o.deliveryFee), 0);

    return {
      ...agent,
      totalDeliveries: deliveries.length,
      completedDeliveries: completedDeliveries.length,
      totalEarnings,
      recentDeliveries: deliveries.slice(0, 20),
    };
  }

  async updateAgentStatus(agentId: string, status: string) {
    const agent = await this.userRepository.findOne({
      where: { id: agentId, role: UserRole.AGENT },
    });
    
    if (!agent) {
      throw new NotFoundException('Delivery agent not found');
    }

    agent.status = status as UserStatus;
    await this.userRepository.save(agent);

    return { success: true, message: `Agent status updated to ${status}` };
  }

  // ==================== CHART DATA ====================

  async getRevenueChartData(): Promise<RevenueChartDataDto[]> {
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('order.placedAt BETWEEN :start AND :end', {
          start: monthStart,
          end: monthEnd,
        })
        .getRawOne();

      const orders = await this.orderRepository.count({
        where: {
          placedAt: Between(monthStart, monthEnd),
          status: OrderStatus.DELIVERED,
        },
      });

      last6Months.push({
        date: monthStart.toLocaleString('default', { month: 'short' }),
        revenue: Number(revenue?.total) || 0,
        orders,
      });
    }

    return last6Months;
  }

  async getOrderChartData(): Promise<OrderChartDataDto[]> {
    const last30Days = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const orders = await this.orderRepository.count({
        where: {
          placedAt: Between(date, nextDate),
        },
      });

      const amount = await this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.placedAt BETWEEN :start AND :end', {
          start: date,
          end: nextDate,
        })
        .getRawOne();

      last30Days.push({
        date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        orders,
        amount: Number(amount?.total) || 0,
      });
    }

    return last30Days;
  }

  async getUserChartData(): Promise<UserChartDataDto[]> {
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const customers = await this.userRepository.count({
        where: {
          role: UserRole.CUSTOMER,
          createdAt: Between(monthStart, monthEnd),
        },
      });

      const owners = await this.userRepository.count({
        where: {
          role: UserRole.OWNER,
          createdAt: Between(monthStart, monthEnd),
        },
      });

      const agents = await this.userRepository.count({
        where: {
          role: UserRole.AGENT,
          createdAt: Between(monthStart, monthEnd),
        },
      });

      last6Months.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        customers,
        owners,
        agents,
      });
    }

    return last6Months;
  }

  // ==================== NOTIFICATIONS ====================

  async getNotifications(): Promise<NotificationDto[]> {
    const mockNotifications: NotificationDto[] = [
      {
        id: '1',
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Restaurant "Pizza Palace" is running low on ingredients',
        timestamp: new Date(),
        read: false,
      },
      {
        id: '2',
        type: 'success',
        title: 'New Order',
        message: 'Order #ORD-1234 has been placed successfully',
        timestamp: new Date(Date.now() - 3600000),
        read: false,
      },
      {
        id: '3',
        type: 'info',
        title: 'New User Registration',
        message: '3 new users registered in the last hour',
        timestamp: new Date(Date.now() - 7200000),
        read: true,
      },
    ];

    return mockNotifications;
  }

  async sendNotification(notification: any) {
    return { success: true, message: 'Notification sent successfully' };
  }

  async markNotificationAsRead(notificationId: string) {
    return { success: true, message: 'Notification marked as read' };
  }

  // ==================== EXPORT DATA ====================

  async exportData(type: string): Promise<string> {
    let data: any[] = [];

    switch (type) {
      case 'users':
        data = await this.getAllUsers();
        break;
      case 'orders':
        const orders = await this.getAllOrders('all', 10000);
        data = orders.data;
        break;
      case 'restaurants':
        data = await this.getAllRestaurants();
        break;
      case 'applications':
        const approvals = await this.getPendingApprovals();
        data = approvals.users;
        break;
      case 'agents':
        data = await this.getDeliveryAgents();
        break;
      default:
        throw new BadRequestException('Invalid export type');
    }

    if (data.length === 0) {
      return 'No data available';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/,/g, ';');
        }
        return String(value).replace(/,/g, ';');
      }).join(',')),
    ];

    return csvRows.join('\n');
  }

  // ==================== ACTIVITY FEED ====================

  async getActivityFeed(limit: number = 20) {
    const recentOrders = await this.orderRepository.find({
      relations: ['customer', 'restaurant'],
      order: { placedAt: 'DESC' },
      take: limit,
    });

    const recentUsers = await this.userRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.floor(limit / 2),
    });

    const activities = [
      ...recentOrders.map(order => ({
        id: `order-${order.id}`,
        type: 'order',
        message: `New order #${order.id.slice(-8)} from ${order.customer?.fullName || order.customerName || 'Guest'} at ${order.restaurant?.name}`,
        timestamp: order.placedAt,
        icon: 'shopping-bag',
      })),
      ...recentUsers.map(user => ({
        id: `user-${user.id}`,
        type: 'user',
        message: `${user.fullName} joined as ${user.role}`,
        timestamp: user.createdAt,
        icon: 'user-plus',
      })),
    ];

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  }
}