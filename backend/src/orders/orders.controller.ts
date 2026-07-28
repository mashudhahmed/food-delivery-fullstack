import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  findAll() {
    return this.ordersService.findAllOrders();
  }

  @Post()
  create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  @Get('my')
  getMyOrders(@Request() req) {
    return this.ordersService.getCustomerOrders(req.user.id);
  }

  @Get('my-restaurant')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  getMyRestaurantOrders(@Request() req) {
    return this.ordersService.getOwnerRestaurantOrders(req.user.id);
  }

  /**
   * Owner analytics — must be BEFORE @Get(':id')
   */
  @Get('owner/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiQuery({ name: 'restaurantId', required: false })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year'],
  })
  getOwnerAnalytics(
    @Request() req: { user: { id: string } },
    @Query('restaurantId') restaurantId?: string,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.ordersService.getOwnerAnalytics(
      req.user.id,
      restaurantId,
      period || 'week',
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.getOrderWithDetails(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      updateOrderStatusDto.status,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/assign')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  assignAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
    @Request() req,
  ) {
    return this.ordersService.assignDeliveryAgent(
      id,
      agentId,
      req.user.role,
    );
  }

  @Patch(':id/delivery')
  @UseGuards(RolesGuard)
  @Roles(UserRole.AGENT)
  updateDelivery(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    return this.ordersService.updateDeliveryStatus(
      id,
      status as any,
      req.user.id,
    );
  }

  @Delete(':id')
  cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelOrder(id, req.user.id, req.user.role);
  }
}