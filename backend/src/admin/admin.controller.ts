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
import { ApiTags, ApiBearerAuth} from '@nestjs/swagger';
import {
  UpdateUserStatusDto,
  UpdateUserRoleDto,
  ApproveUserDto,
  RejectUserDto,
  UpdateRestaurantStatusDto,
  VerifyRestaurantDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
  UpdateAgentStatusDto,
  VerifyAgentDocumentDto,
  SendNotificationDto,
} from './dto/admin-actions.dto';

@ApiTags('Admin')
@ApiBearerAuth()
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
  async getAllUsers(
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getAllUsers(role, limit ? parseInt(limit, 10) : 20, page ? parseInt(page, 10) : 1);
  }

  // ⚠️ Must stay ABOVE 'users/:userId' — Nest matches routes in
  // declaration order, so if this were below, ParseUUIDPipe would try
  // (and fail) to parse the literal string "stats" as a UUID.
  @Get('users/stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('users/:userId')
  async getUserDetails(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Patch('users/:userId/status')
  async updateUserStatus(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminService.updateUserStatus(userId, dto.status, dto.reason);
  }

  @Patch('users/:userId/role')
  async updateUserRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, dto.role);
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
    @Body() dto: ApproveUserDto,
  ) {
    return this.adminService.approveUser(userId, dto.role, dto.notes);
  }

  @Patch('reject/:userId')
  async rejectUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RejectUserDto,
  ) {
    return this.adminService.rejectUser(userId, dto.reason);
  }

  // Restaurant Management
  @Get('restaurants')
  async getAllRestaurants(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getAllRestaurants(status, limit ? parseInt(limit, 10) : 20, page ? parseInt(page, 10) : 1);
  }

  @Get('restaurants/stats')
  async getRestaurantStats() {
    return this.adminService.getRestaurantStats();
  }

  @Get('restaurants/:restaurantId')
  async getRestaurantDetails(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.adminService.getRestaurantDetails(restaurantId);
  }

  @Patch('restaurants/:restaurantId/status')
  async updateRestaurantStatus(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: UpdateRestaurantStatusDto,
  ) {
    return this.adminService.updateRestaurantStatus(restaurantId, dto.status);
  }

  @Patch('restaurants/:restaurantId/verify')
  async verifyRestaurant(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: VerifyRestaurantDto,
  ) {
    return this.adminService.verifyRestaurant(restaurantId, dto.verified);
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
    @Query('page') page?: string,
  ) {
    return this.adminService.getAllOrders(status, limit ? parseInt(limit, 10) : 20, page ? parseInt(page, 10) : 1);
  }

  @Get('orders/:orderId')
  async getOrderDetails(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.adminService.getOrderDetails(orderId);
  }

  @Patch('orders/:orderId/status')
  async updateOrderStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(orderId, dto.status);
  }

  @Patch('orders/:orderId/cancel')
  async cancelOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.adminService.cancelOrder(orderId, dto.reason);
  }

  // Delivery Agent Management
  @Get('delivery-agents')
  async getDeliveryAgents(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.getDeliveryAgents(status, limit ? parseInt(limit, 10) : 20, page ? parseInt(page, 10) : 1);
  }

  @Get('delivery-agents/stats')
  async getAgentStats() {
    return this.adminService.getAgentStats();
  }

  @Get('delivery-agents/:agentId')
  async getDeliveryAgentDetails(@Param('agentId', ParseUUIDPipe) agentId: string) {
    return this.adminService.getDeliveryAgentDetails(agentId);
  }

  @Patch('delivery-agents/:agentId/status')
  async updateAgentStatus(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: UpdateAgentStatusDto,
  ) {
    return this.adminService.updateAgentStatus(agentId, dto.status);
  }

  @Patch('delivery-agents/:agentId/verify-document')
  async verifyAgentDocument(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() dto: VerifyAgentDocumentDto,
  ) {
    return this.adminService.verifyAgentDocument(agentId, dto.documentType, dto.verified);
  }

  // Analytics
  @Get('charts/revenue')
  async getRevenueChartData() {
    return this.adminService.getRevenueChartData();
  }

  @Get('charts/orders')
  async getOrderChartData(@Query('days') days?: string) {
    return this.adminService.getOrderChartData(days ? parseInt(days, 10) : 30);
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
  async sendNotification(@Body() dto: SendNotificationDto) {
    return this.adminService.sendNotification(dto);
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