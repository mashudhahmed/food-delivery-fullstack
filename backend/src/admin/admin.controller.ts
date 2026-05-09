import { Controller, Get, Patch, Param, UseGuards, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending-approvals')
  async getPendingApprovals() {
    return this.adminService.getPendingApprovals();
  }

  @Get('applications')
  async getAllApplications(@Query('role') role?: string) {
    return this.adminService.getAllApplications(role);
  }

  @Get('applications/stats')
  async getApplicationStats() {
    return this.adminService.getApplicationStats();
  }

  @Patch('approve/:userId')
  async approveUser(
    @Param('userId') userId: string,
    @Body('role') role?: string,
    @Body('notes') notes?: string,
  ) {
    return this.adminService.approveUser(userId, role, notes);
  }

  @Patch('reject/:userId')
  async rejectUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.rejectUser(userId, reason);
  }

  @Get('users/count')
  async getUserStats() {
    return this.adminService.getUserStats();
  }
}