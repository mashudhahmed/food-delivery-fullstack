// src/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import {
  RevenueChartDataDto,
  OrderChartDataDto,
  UserChartDataDto,
} from './dto/chart-data.dto';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { assertCanTransition } from '../orders/order-status.machine';
// REMOVED: import { EmailQueueService } from '../common/queue/email-queue.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    // REMOVED: private readonly emailQueue: EmailQueueService,
  ) {}

  // ====================== DASHBOARD ======================

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
      avgRatingResult,
      completedOrders,
      totalRevenueResult,
      prevMonthOrders,
      prevMonthRevenueResult,
      prevMonthUsers,
      currentMonthOrders,
      currentMonthRevenueResult,
      currentMonthUsers,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: false } }),
      this.restaurantRepository.count({ where: { isDeleted: false } }),
      this.orderRepository.count(),
      this.userRepository.count({
        where: { role: UserRole.OWNER, status: UserStatus.PENDING, isDeleted: false },
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.PENDING, isDeleted: false },
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.APPROVED, isDeleted: false },
      }),
      this.restaurantRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .where('r.isDeleted = false')
        .getRawOne(),
      this.orderRepository.count({ where: { status: OrderStatus.DELIVERED } }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.orderRepository.count({
        where: {
          placedAt: Between(lastMonthStart, lastMonthEnd),
          status: OrderStatus.DELIVERED,
        },
      }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.placedAt BETWEEN :start AND :end', {
          start: lastMonthStart,
          end: lastMonthEnd,
        })
        .getRawOne(),
      this.userRepository.count({
        where: {
          createdAt: Between(lastMonthStart, lastMonthEnd),
          isDeleted: false,
        },
      }),
      this.orderRepository.count({
        where: {
          placedAt: Between(thisMonthStart, now),
          status: OrderStatus.DELIVERED,
        },
      }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('o.placedAt >= :start', { start: thisMonthStart })
        .getRawOne(),
      this.userRepository.count({
        where: {
          createdAt: Between(thisMonthStart, now),
          isDeleted: false,
        },
      }),
    ]);

    const totalRevenue = Number(totalRevenueResult?.total) || 0;
    const prevMonthRevenue = Number(prevMonthRevenueResult?.total) || 0;
    const currentMonthRevenue = Number(currentMonthRevenueResult?.total) || 0;

    const revenueGrowth = prevMonthRevenue
      ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : 0;
    const orderGrowth = prevMonthOrders
      ? ((currentMonthOrders - prevMonthOrders) / prevMonthOrders) * 100
      : 0;
    const userGrowth = prevMonthUsers
      ? ((currentMonthUsers - prevMonthUsers) / prevMonthUsers) * 100
      : 0;
    const completionRate = totalOrders
      ? (completedOrders / totalOrders) * 100
      : 0;

    return {
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue,
      pendingOwners,
      pendingAgents,
      activeAgents,
      avgRating: Number(avgRatingResult?.avg) || 0,
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
      totalRevenueResult,
      todayOrders,
      todayRevenueResult,
      weekOrders,
      weekRevenueResult,
      pendingCount,
      activeAgents,
      activeRestaurants,
    ] = await Promise.all([
      this.userRepository.count({ where: { isDeleted: false } }),
      this.restaurantRepository.count({ where: { isDeleted: false } }),
      this.orderRepository.count(),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.orderRepository.count({
        where: { placedAt: Between(todayStart, now) },
      }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.placedAt >= :start', { start: todayStart })
        .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.orderRepository.count({
        where: { placedAt: Between(weekStart, now) },
      }),
      this.orderRepository
        .createQueryBuilder('o')
        .select('SUM(o.totalAmount)', 'total')
        .where('o.placedAt BETWEEN :start AND :end', { start: weekStart, end: now })
        .andWhere('o.status = :status', { status: OrderStatus.DELIVERED })
        .getRawOne(),
      this.userRepository.count({
        where: [
          { role: UserRole.OWNER, status: UserStatus.PENDING, isDeleted: false },
          { role: UserRole.AGENT, status: UserStatus.PENDING, isDeleted: false },
        ],
      }),
      this.userRepository.count({
        where: { role: UserRole.AGENT, status: UserStatus.APPROVED, isDeleted: false },
      }),
      this.restaurantRepository.count({
        where: { isOpen: true, isDeleted: false },
      }),
    ]);

    return {
      totalUsers,
      totalRestaurants,
      totalOrders,
      totalRevenue: Number(totalRevenueResult?.total) || 0,
      todayOrders,
      todayRevenue: Number(todayRevenueResult?.total) || 0,
      weekOrders,
      weekRevenue: Number(weekRevenueResult?.total) || 0,
      pendingApprovals: pendingCount,
      activeAgents,
      activeRestaurants,
    };
  }

  // ====================== USERS ======================

  async getAllUsers(role?: string, limit = 20, page = 1) {
    const whereCondition: any = { isDeleted: false };
    if (role && role !== 'all') {
      whereCondition.role = role;
    }

    const [users, total] = await this.userRepository.findAndCount({
      where: whereCondition,
      select: [
        'id', 'fullName', 'email', 'phone', 'role', 'status',
        'createdAt', 'lastLogin', 'businessName', 'vehicleType',
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const userIds = users.map((u) => u.id);
    let orderStats: Record<string, { orders: number; totalSpent: number }> = {};

    if (userIds.length > 0) {
      const stats = await this.orderRepository
        .createQueryBuilder('o')
        .select('o.customerId', 'customerId')
        .addSelect('COUNT(*)', 'orders')
        .addSelect(
          `SUM(CASE WHEN o.status = '${OrderStatus.DELIVERED}' THEN o.totalAmount ELSE 0 END)`,
          'totalSpent',
        )
        .where('o.customerId IN (:...userIds)', { userIds })
        .groupBy('o.customerId')
        .getRawMany();

      orderStats = stats.reduce((acc, row) => {
        acc[row.customerId] = {
          orders: Number(row.orders) || 0,
          totalSpent: Number(row.totalSpent) || 0,
        };
        return acc;
      }, {});
    }

    const usersWithStats = users.map((user) => ({
      ...user,
      orders: orderStats[user.id]?.orders || 0,
      totalSpent: orderStats[user.id]?.totalSpent || 0,
    }));

    return {
      data: usersWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserStats() {
    const [totalUsers, customers, owners, agents, admins, pendingOwners, pendingAgents] =
      await Promise.all([
        this.userRepository.count({ where: { isDeleted: false } }),
        this.userRepository.count({ where: { role: UserRole.CUSTOMER, isDeleted: false } }),
        this.userRepository.count({ where: { role: UserRole.OWNER, isDeleted: false } }),
        this.userRepository.count({ where: { role: UserRole.AGENT, isDeleted: false } }),
        this.userRepository.count({ where: { role: UserRole.ADMIN, isDeleted: false } }),
        this.userRepository.count({
          where: { role: UserRole.OWNER, status: UserStatus.PENDING, isDeleted: false },
        }),
        this.userRepository.count({
          where: { role: UserRole.AGENT, status: UserStatus.PENDING, isDeleted: false },
        }),
      ]);

    return {
      totalUsers,
      customers,
      owners,
      agents,
      admins,
      pendingApprovals: pendingOwners + pendingAgents,
    };
  }

  async getUserDetails(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['restaurants'],
    });

    if (!user) throw new NotFoundException('User not found');

    const orders = await this.orderRepository.find({
      where: { customerId: userId },
      relations: ['restaurant'],
      take: 20,
      order: { placedAt: 'DESC' },
    });

    const completed = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const totalSpent = completed.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    return {
      user,
      recentOrders: orders.slice(0, 10),
      stats: {
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalSpent,
        averageOrderValue: completed.length ? totalSpent / completed.length : 0,
      },
    };
  }

  async updateUserStatus(userId: string, status: string, reason?: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    user.status = status as UserStatus;
    await this.userRepository.save(user);

    return { success: true, message: `User status updated to ${status}` };
  }

  async updateUserRole(userId: string, role: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot change admin role');
    }

    user.role = role as UserRole;
    await this.userRepository.save(user);

    return { success: true, message: `User role updated to ${role}` };
  }

  async deleteUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin user');
    }

    user.isDeleted = true;
    user.status = UserStatus.REJECTED;
    await this.userRepository.save(user);

    return { success: true, message: 'User deleted successfully' };
  }

  // ====================== PENDING APPROVALS ======================

  async getPendingApprovals() {
    const pendingUsers = await this.userRepository.find({
      where: [
        { role: UserRole.OWNER, status: UserStatus.PENDING, isDeleted: false },
        { role: UserRole.AGENT, status: UserStatus.PENDING, isDeleted: false },
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
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    if (role) user.role = role as UserRole;
    user.status = UserStatus.APPROVED;
    user.approvedAt = new Date();
    await this.userRepository.save(user);

    // Email queue removed to prevent crash
    // try {
    //   await this.emailQueue.sendApprovalEmail(user, user.role, notes);
    // } catch (err) {
    //   console.error('Failed to queue approval email:', err.message);
    // }

    return { success: true, message: 'User approved successfully', user };
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    user.status = UserStatus.REJECTED;
    user.rejectionReason = reason;
    await this.userRepository.save(user);

    // Email queue removed to prevent crash
    // try {
    //   await this.emailQueue.sendRejectionEmail(user, reason);
    // } catch (err) {
    //   console.error('Failed to queue rejection email:', err.message);
    // }

    return { success: true, message: 'User rejected successfully' };
  }

  // ====================== RESTAURANTS ======================

  async getAllRestaurants(status?: string, limit = 20, page = 1) {
    const whereCondition: any = { isDeleted: false };

    if (status === 'active') whereCondition.isOpen = true;
    else if (status === 'inactive') whereCondition.isOpen = false;

    const [restaurants, total] = await this.restaurantRepository.findAndCount({
      where: whereCondition,
      relations: ['owner'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const restaurantIds = restaurants.map((r) => r.id);
    let statsMap: Record<string, { totalOrders: number; totalRevenue: number }> = {};

    if (restaurantIds.length > 0) {
      const stats = await this.orderRepository
        .createQueryBuilder('o')
        .select('o.restaurantId', 'restaurantId')
        .addSelect('COUNT(*)', 'totalOrders')
        .addSelect(
          `SUM(CASE WHEN o.status = '${OrderStatus.DELIVERED}' THEN o.totalAmount ELSE 0 END)`,
          'totalRevenue',
        )
        .where('o.restaurantId IN (:...ids)', { ids: restaurantIds })
        .groupBy('o.restaurantId')
        .getRawMany();

      statsMap = stats.reduce((acc, row) => {
        acc[row.restaurantId] = {
          totalOrders: Number(row.totalOrders) || 0,
          totalRevenue: Number(row.totalRevenue) || 0,
        };
        return acc;
      }, {});
    }

    const restaurantsWithStats = restaurants.map((restaurant) => ({
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      phone: restaurant.phone,
      description: restaurant.description,
      cuisineType: restaurant.cuisineType,
      rating: restaurant.rating,
      isOpen: restaurant.isOpen,
      isVerified: restaurant.isVerified,
      imageUrl: restaurant.imageUrl,
      ownerName: restaurant.owner?.fullName,
      ownerEmail: restaurant.owner?.email,
      ownerPhone: restaurant.owner?.phone,
      totalOrders: statsMap[restaurant.id]?.totalOrders || 0,
      totalRevenue: statsMap[restaurant.id]?.totalRevenue || 0,
      createdAt: restaurant.createdAt,
    }));

    return {
      data: restaurantsWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRestaurantStats() {
    const [total, open, verified] = await Promise.all([
      this.restaurantRepository.count({ where: { isDeleted: false } }),
      this.restaurantRepository.count({ where: { isDeleted: false, isOpen: true } }),
      this.restaurantRepository.count({ where: { isDeleted: false, isVerified: true } }),
    ]);

    return {
      total,
      open,
      closed: total - open,
      verified,
    };
  }

  async getRestaurantDetails(restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId, isDeleted: false },
      relations: ['owner'],
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const orders = await this.orderRepository.find({
      where: { restaurantId },
      relations: ['customer'],
      take: 50,
      order: { placedAt: 'DESC' },
    });

    const completedOrders = orders.filter((o) => o.status === OrderStatus.DELIVERED);
    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );

    return {
      ...restaurant,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      totalRevenue,
      averageOrderValue: completedOrders.length
        ? totalRevenue / completedOrders.length
        : 0,
      recentOrders: orders.slice(0, 20),
    };
  }

  async updateRestaurantStatus(restaurantId: string, status: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId, isDeleted: false },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    restaurant.isOpen = status === 'active';
    await this.restaurantRepository.save(restaurant);

    return {
      success: true,
      message: `Restaurant ${status === 'active' ? 'opened' : 'closed'} successfully`,
    };
  }

  async verifyRestaurant(restaurantId: string, verified: boolean) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId, isDeleted: false },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    restaurant.isVerified = verified;
    await this.restaurantRepository.save(restaurant);

    return {
      success: true,
      message: `Restaurant ${verified ? 'verified' : 'unverified'} successfully`,
    };
  }

  async deleteRestaurant(restaurantId: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id: restaurantId },
    });

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    restaurant.isDeleted = true;
    restaurant.isOpen = false;
    await this.restaurantRepository.save(restaurant);

    return { success: true, message: 'Restaurant deleted successfully' };
  }

  // ====================== ORDERS ======================

  async getAllOrders(status?: string, limit = 50, page = 1) {
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
      data: orders.map((order) => ({
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
      relations: ['customer', 'restaurant', 'agent', 'items', 'items.menuItem'],
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer', 'restaurant'],
    });

    if (!order) throw new NotFoundException('Order not found');

    assertCanTransition(order.status, status as any);

    order.status = status as any;
    await this.orderRepository.save(order);

    return { success: true, message: `Order status updated to ${status}` };
  }

  async cancelOrder(orderId: string, reason: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['customer'],
    });

    if (!order) throw new NotFoundException('Order not found');

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel delivered order');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    return { success: true, message: 'Order cancelled successfully' };
  }

  // ====================== DELIVERY AGENTS ======================

  async getDeliveryAgents(status?: string, limit = 20, page = 1) {
    const whereCondition: any = { role: UserRole.AGENT, isDeleted: false };
    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    const [agents, total] = await this.userRepository.findAndCount({
      where: whereCondition,
      select: [
        'id', 'fullName', 'email', 'phone', 'status', 'createdAt',
        'vehicleType', 'vehicleNumber', 'drivingLicense',
      ],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    const agentIds = agents.map((a) => a.id);
    let statsMap: Record<string, { totalDeliveries: number; completedDeliveries: number; totalEarnings: number }> = {};

    if (agentIds.length > 0) {
      const stats = await this.orderRepository
        .createQueryBuilder('o')
        .select('o.agentId', 'agentId')
        .addSelect('COUNT(*)', 'totalDeliveries')
        .addSelect(
          `SUM(CASE WHEN o.status = '${OrderStatus.DELIVERED}' THEN 1 ELSE 0 END)`,
          'completedDeliveries',
        )
        .addSelect(
          `SUM(CASE WHEN o.status = '${OrderStatus.DELIVERED}' THEN o.deliveryFee ELSE 0 END)`,
          'totalEarnings',
        )
        .where('o.agentId IN (:...ids)', { ids: agentIds })
        .groupBy('o.agentId')
        .getRawMany();

      statsMap = stats.reduce((acc, row) => {
        acc[row.agentId] = {
          totalDeliveries: Number(row.totalDeliveries) || 0,
          completedDeliveries: Number(row.completedDeliveries) || 0,
          totalEarnings: Number(row.totalEarnings) || 0,
        };
        return acc;
      }, {});
    }

    const agentsWithStats = agents.map((agent) => ({
      ...agent,
      totalDeliveries: statsMap[agent.id]?.totalDeliveries || 0,
      completedDeliveries: statsMap[agent.id]?.completedDeliveries || 0,
      totalEarnings: statsMap[agent.id]?.totalEarnings || 0,
      isActive: agent.status === UserStatus.APPROVED,
    }));

    return {
      data: agentsWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAgentStats() {
    const [total, active] = await Promise.all([
      this.userRepository.count({
        where: { role: UserRole.AGENT, isDeleted: false },
      }),
      this.userRepository.count({
        where: {
          role: UserRole.AGENT,
          status: UserStatus.APPROVED,
          isDeleted: false,
        },
      }),
    ]);

    return { total, active };
  }

  async getDeliveryAgentDetails(agentId: string) {
    const agent = await this.userRepository.findOne({
      where: { id: agentId, role: UserRole.AGENT, isDeleted: false },
    });

    if (!agent) throw new NotFoundException('Delivery agent not found');

    const deliveries = await this.orderRepository.find({
      where: { agentId },
      relations: ['restaurant', 'customer'],
      order: { placedAt: 'DESC' },
    });

    const completedDeliveries = deliveries.filter(
      (o) => o.status === OrderStatus.DELIVERED,
    );
    const totalEarnings = completedDeliveries.reduce(
      (sum, o) => sum + Number(o.deliveryFee),
      0,
    );

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
      where: { id: agentId, role: UserRole.AGENT, isDeleted: false },
    });

    if (!agent) throw new NotFoundException('Delivery agent not found');

    agent.status = status as UserStatus;
    await this.userRepository.save(agent);

    return { success: true, message: `Agent status updated to ${status}` };
  }

  async verifyAgentDocument(
    agentId: string,
    documentType: string,
    verified: boolean,
  ) {
    const agent = await this.userRepository.findOne({
      where: { id: agentId, role: UserRole.AGENT, isDeleted: false },
    });

    if (!agent) throw new NotFoundException('Agent not found');

    console.log(
      `Document ${documentType} for agent ${agent.email} ${verified ? 'verified' : 'rejected'}`,
    );

    return {
      success: true,
      message: `${documentType} ${verified ? 'verified' : 'rejected'} successfully`,
    };
  }

  // ====================== CHARTS ======================

  async getRevenueChartData(): Promise<RevenueChartDataDto[]> {
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [revenueResult, orders] = await Promise.all([
        this.orderRepository
          .createQueryBuilder('o')
          .select('SUM(o.totalAmount)', 'total')
          .where('o.status = :status', { status: OrderStatus.DELIVERED })
          .andWhere('o.placedAt BETWEEN :start AND :end', {
            start: monthStart,
            end: monthEnd,
          })
          .getRawOne(),
        this.orderRepository.count({
          where: {
            placedAt: Between(monthStart, monthEnd),
            status: OrderStatus.DELIVERED,
          },
        }),
      ]);

      last6Months.push({
        date: monthStart.toLocaleString('default', { month: 'short' }),
        revenue: Number(revenueResult?.total) || 0,
        orders,
      });
    }

    return last6Months;
  }

  async getOrderChartData(days = 30): Promise<OrderChartDataDto[]> {
    const result = [];
    const now = new Date();
    const rangeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;

    for (let i = rangeDays - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const [orders, amountResult] = await Promise.all([
        this.orderRepository.count({
          where: { placedAt: Between(date, nextDate) },
        }),
        this.orderRepository
          .createQueryBuilder('o')
          .select('SUM(o.totalAmount)', 'total')
          .where('o.placedAt BETWEEN :start AND :end', {
            start: date,
            end: nextDate,
          })
          .getRawOne(),
      ]);

      result.push({
        date: date.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        orders,
        amount: Number(amountResult?.total) || 0,
      });
    }

    return result;
  }

  async getUserChartData(): Promise<UserChartDataDto[]> {
    const last6Months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [customers, owners, agents] = await Promise.all([
        this.userRepository.count({
          where: {
            role: UserRole.CUSTOMER,
            createdAt: Between(monthStart, monthEnd),
            isDeleted: false,
          },
        }),
        this.userRepository.count({
          where: {
            role: UserRole.OWNER,
            createdAt: Between(monthStart, monthEnd),
            isDeleted: false,
          },
        }),
        this.userRepository.count({
          where: {
            role: UserRole.AGENT,
            createdAt: Between(monthStart, monthEnd),
            isDeleted: false,
          },
        }),
      ]);

      last6Months.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        customers,
        owners,
        agents,
      });
    }

    return last6Months;
  }

  // ====================== NOTIFICATIONS ======================

  async getNotifications() {
    return [];
  }

  async sendNotification(notification: {
    type?: string;
    title: string;
    message: string;
    userId?: string;
  }) {
    if (notification.userId) {
      await this.notificationsService.sendToUser(notification.userId, {
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        data: {},
      });
    }

    return {
      success: true,
      message: 'Notification sent successfully',
    };
  }

  async markNotificationAsRead(notificationId: string) {
    return { success: true, message: 'Notification marked as read' };
  }

  // ====================== EXPORT ======================

  async exportData(type: string): Promise<string> {
    let data: any[] = [];

    switch (type) {
      case 'users':
        data = (await this.getAllUsers(undefined, 10000, 1)).data;
        break;
      case 'orders':
        data = (await this.getAllOrders('all', 10000, 1)).data;
        break;
      case 'restaurants':
        data = (await this.getAllRestaurants(undefined, 10000, 1)).data;
        break;
      case 'applications':
        data = (await this.getPendingApprovals()).users;
        break;
      case 'agents':
      case 'delivery-agents':
        data = (await this.getDeliveryAgents(undefined, 10000, 1)).data;
        break;
      case 'analytics': {
        const [revenue, orders30, users6mo] = await Promise.all([
          this.getRevenueChartData(),
          this.getOrderChartData(30),
          this.getUserChartData(),
        ]);
        data = [
          ...revenue.map((r) => ({ section: 'revenue_by_month', ...r })),
          ...orders30.map((o) => ({ section: 'orders_last_30_days', ...o })),
          ...users6mo.map((u) => ({ section: 'user_growth_by_month', ...u })),
        ];
        break;
      }
      default:
        throw new BadRequestException(
          `Invalid export type "${type}". Valid types: users, orders, restaurants, applications, delivery-agents, analytics`,
        );
    }

    if (data.length === 0) return 'No data available';

    const escapeCsvField = (value: any): string => {
      if (value === undefined || value === null) return '';
      const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers: string[] = [];
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (!headers.includes(key)) headers.push(key);
      }
    }

    const csvRows = [
      headers.join(','),
      ...data.map((row: Record<string, any>) =>
        headers.map((header) => escapeCsvField(row[header])).join(','),
      ),
    ];

    return csvRows.join('\n');
  }

  // ====================== ACTIVITY ======================

  async getActivityFeed(limit = 20) {
    const recentOrders = await this.orderRepository.find({
      relations: ['customer', 'restaurant'],
      order: { placedAt: 'DESC' },
      take: limit,
    });

    const recentUsers = await this.userRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
      take: Math.floor(limit / 2),
    });

    const activities = [
      ...recentOrders.map((order) => ({
        id: `order-${order.id}`,
        type: 'order',
        message: `New order #${order.id.slice(-8)} from ${order.customer?.fullName || order.customerName || 'Guest'} at ${order.restaurant?.name}`,
        timestamp: order.placedAt,
        icon: 'shopping-bag',
      })),
      ...recentUsers.map((user) => ({
        id: `user-${user.id}`,
        type: 'user',
        message: `${user.fullName} joined as ${user.role}`,
        timestamp: user.createdAt,
        icon: 'user-plus',
      })),
    ];

    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return activities.slice(0, limit);
  }
}