import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
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
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
  ) {}

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
      totalRevenue: totalRevenue?.total || 0,
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

  async getPendingApprovals() {
    return await this.userRepository.find({
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
  }

  async approveUser(userId: string, role: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.APPROVED;
    user.approvedAt = new Date();
    await this.userRepository.save(user);

    return { success: true, message: 'User approved successfully' };
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.REJECTED;
    user.rejectionReason = reason;
    await this.userRepository.save(user);

    return { success: true, message: 'User rejected successfully' };
  }

  async getAllUsers() {
    const users = await this.userRepository.find({
      select: [
        'id', 'fullName', 'email', 'role', 'status', 'createdAt', 'lastLogin',
      ],
      order: { createdAt: 'DESC' },
    });

    const usersWithOrders = await Promise.all(
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
          totalSpent: totalSpent?.total || 0,
        };
      }),
    );

    return usersWithOrders;
  }

  async updateUserStatus(userId: string, status: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status as UserStatus;
    await this.userRepository.save(user);

    return { success: true, message: 'User status updated successfully' };
  }

  async getAllRestaurants() {
    const restaurants = await this.restaurantRepository.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });

    return restaurants.map(restaurant => ({
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
      createdAt: restaurant.createdAt,
      status: restaurant.isOpen ? 'active' : 'inactive',
    }));
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

    return { success: true, message: 'Restaurant status updated successfully' };
  }

  async getRecentOrders(limit: number = 10) {
    const orders = await this.orderRepository.find({
      relations: ['customer', 'restaurant'],
      order: { placedAt: 'DESC' },
      take: limit,
    });

    return orders.map(order => ({
      id: order.id,
      totalAmount: order.totalAmount,
      status: order.status,
      placedAt: order.placedAt,
      customer: order.customer ? {
        fullName: order.customer.fullName,
        email: order.customer.email,
        phone: order.customer.phone,
      } : null,
      restaurant: order.restaurant ? {
        name: order.restaurant.name,
        address: order.restaurant.address,
      } : null,
    }));
  }

  async getOrderDetails(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'restaurant', 'items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async getDeliveryAgents() {
    const agents = await this.userRepository.find({
      where: { role: UserRole.AGENT, status: UserStatus.APPROVED },
      select: ['id', 'fullName', 'email', 'phone', 'vehicleType', 'vehicleNumber', 'drivingLicense', 'createdAt'],
    });

    return agents.map(agent => ({
      id: agent.id,
      fullName: agent.fullName,
      phone: agent.phone,
      email: agent.email,
      vehicleType: agent.vehicleType || 'Not specified',
      vehicleNumber: agent.vehicleNumber || 'Not specified',
      drivingLicense: agent.drivingLicense || 'Not specified',
      status: 'active',
      totalDeliveries: 0,
      rating: 0,
      createdAt: agent.createdAt,
    }));
  }

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

  async markNotificationAsRead(notificationId: string) {
    return { success: true, message: 'Notification marked as read' };
  }

  async exportData(type: string): Promise<string> {
    let data: any[] = [];

    switch (type) {
      case 'users':
        data = await this.getAllUsers();
        break;
      case 'orders':
        data = await this.getRecentOrders(1000);
        break;
      case 'restaurants':
        data = await this.getAllRestaurants();
        break;
      case 'applications':
        data = await this.getPendingApprovals();
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
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(',')),
    ];

    return csvRows.join('\n');
  }

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
        message: `New order #${order.id.slice(-8)} from ${order.customer?.fullName} at ${order.restaurant?.name}`,
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