import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard Stats
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // Pending Approvals
  @Get('pending-approvals')
  async getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Patch('approve/:userId')
  async approveUser(
    @Param('userId') userId: string,
    @Query('role') role: string,
  ) {
    return this.adminService.approveUser(userId, role);
  }

  @Patch('reject/:userId')
  async rejectUser(
    @Param('userId') userId: string,
    @Query('reason') reason: string,
  ) {
    return this.adminService.rejectUser(userId, reason);
  }

  // Users Management
  @Get('users')
  async getAllUsers() {
    return this.adminService.getAllUsers();
  }

  @Patch('users/:userId/status')
  async updateUserStatus(
    @Param('userId') userId: string,
    @Query('status') status: string,
  ) {
    return this.adminService.updateUserStatus(userId, status);
  }

  // Restaurants Management
  @Get('restaurants')
  async getAllRestaurants() {
    return this.adminService.getAllRestaurants();
  }

  @Patch('restaurants/:restaurantId/status')
  async updateRestaurantStatus(
    @Param('restaurantId') restaurantId: string,
    @Query('status') status: string,
  ) {
    return this.adminService.updateRestaurantStatus(restaurantId, status);
  }

  // Orders Management
  @Get('orders/recent')
  async getRecentOrders(@Query('limit') limit?: string) {
    return this.adminService.getRecentOrders(limit ? parseInt(limit) : 10);
  }

  @Get('orders/:orderId')
  async getOrderDetails(@Param('orderId') orderId: string) {
    return this.adminService.getOrderDetails(orderId);
  }

  // Delivery Agents
  @Get('delivery-agents')
  async getDeliveryAgents() {
    return this.adminService.getDeliveryAgents();
  }

  // Chart Data
  @Get('charts/revenue')
  async getRevenueChartData() {
    return this.adminService.getRevenueChartData();
  }

  @Get('charts/orders')
  async getOrderChartData() {
    return this.adminService.getOrderChartData();
  }

  @Get('charts/users')
  async getUserChartData() {
    return this.adminService.getUserChartData();
  }

  // Notifications
  @Get('notifications')
  async getNotifications() {
    return this.adminService.getNotifications();
  }

  @Patch('notifications/:notificationId/read')
  async markNotificationAsRead(@Param('notificationId') notificationId: string) {
    return this.adminService.markNotificationAsRead(notificationId);
  }

  // Export Data
  @Get('export/:type')
  async exportData(
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const data = await this.adminService.exportData(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${Date.now()}.csv`);
    res.send(data);
  }

  // Activity Feed
  @Get('activity')
  async getActivityFeed(@Query('limit') limit?: string) {
    return this.adminService.getActivityFeed(limit ? parseInt(limit) : 20);
  }
}