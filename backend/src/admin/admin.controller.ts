import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // User Management
  @Get('users')
  async getAllUsers(@Query('role') role?: string) {
    return this.adminService.getAllUsers(role);
  }

  @Get('users/:userId')
  async getUserDetails(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Patch('users/:userId/status')
  async updateUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('status') status: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateUserStatus(userId, status, reason);
  }

  @Patch('users/:userId/role')
  async updateUserRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: string,
  ) {
    return this.adminService.updateUserRole(userId, role);
  }

  @Delete('users/:userId')
  async deleteUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.deleteUser(userId);
  }

  // Pending Approvals
  @Get('pending-approvals')
  async getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Patch('approve/:userId')
  async approveUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('role') role: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.approveUser(userId, role, notes);
  }

  @Patch('reject/:userId')
  async rejectUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectUser(userId, reason);
  }

  // Restaurant Management
  @Get('restaurants')
  async getAllRestaurants(@Query('status') status?: string) {
    return this.adminService.getAllRestaurants(status);
  }

  @Get('restaurants/:restaurantId')
  async getRestaurantDetails(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.adminService.getRestaurantDetails(restaurantId);
  }

  @Patch('restaurants/:restaurantId/status')
  async updateRestaurantStatus(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateRestaurantStatus(restaurantId, status);
  }

  @Patch('restaurants/:restaurantId/verify')
  async verifyRestaurant(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body('verified') verified: boolean,
  ) {
    return this.adminService.verifyRestaurant(restaurantId, verified);
  }

  @Delete('restaurants/:restaurantId')
  async deleteRestaurant(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.adminService.deleteRestaurant(restaurantId);
  }

  // Order Management
  @Get('orders')
  async getAllOrders(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllOrders(status, limit ? parseInt(limit) : 50);
  }

  @Get('orders/:orderId')
  async getOrderDetails(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.adminService.getOrderDetails(orderId);
  }

  @Patch('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateOrderStatus(orderId, status);
  }

  @Patch('orders/:orderId/cancel')
  async cancelOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.cancelOrder(orderId, reason);
  }

  // Delivery Agent Management
  @Get('delivery-agents')
  async getDeliveryAgents(@Query('status') status?: string) {
    return this.adminService.getDeliveryAgents(status);
  }

  @Get('delivery-agents/:agentId')
  async getDeliveryAgentDetails(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.adminService.getDeliveryAgentDetails(agentId);
  }

  @Patch('delivery-agents/:agentId/status')
  async updateAgentStatus(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body('status') status: string,
  ) {
    return this.adminService.updateAgentStatus(agentId, status);
  }

  @Patch('delivery-agents/:agentId/verify-document')
  async verifyAgentDocument(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body('documentType') documentType: string,
    @Body('verified') verified: boolean,
  ) {
    return this.adminService.verifyAgentDocument(agentId, documentType, verified);
  }

  // Analytics
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

  @Post('notifications')
  async sendNotification(@Body() body: any) {
    return this.adminService.sendNotification(body);
  }

  @Patch('notifications/:notificationId/read')
  async markNotificationAsRead(@Param('notificationId') notificationId: string) {
    return this.adminService.markNotificationAsRead(notificationId);
  }

  // Data Export
  @Get('export/:type')
  async exportData(@Param('type') type: string, @Res() res: Response) {
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

  // System Stats
  @Get('system/stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }
}