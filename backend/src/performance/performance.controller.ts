import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService } from '../common/services/performance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('performance')
@Controller('performance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('metrics')
  async getMetrics(
    @Query('hours') hours: number = 24,
  ) {
    const from = new Date(Date.now() - hours * 60 * 60 * 1000);
    const to = new Date();

    // FIXED: First get the array, then calculate length
    const metrics = await this.performanceService.getMetrics({ from, to });

    return {
      averageResponseTime: await this.performanceService.getAverageResponseTime({ from, to }),
      errorRate: await this.performanceService.getErrorRate({ from, to }),
      totalRequests: metrics.length, // Fixed! 'metrics' is an array, so .length works.
    };
  }
}