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
  UseInterceptors,
  Headers,
  ConflictException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateMultiOrderDto } from './dto/create-multi-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiHeader, ApiBody, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Idempotent } from '../common/decorators/idempotency.decorator';
import { IdempotencyInterceptor } from '../common/interceptors/idempotency.interceptor';
import { Audit } from '../common/decorators/audit.decorator';
import { AuditLogInterceptor } from '../common/interceptors/audit-log.interceptor';
import { ReadOnly } from '../common/decorators/read-only.decorator';

@ApiTags('orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─────────────────────────────────────────────
  // SINGLE RESTAURANT ORDER (existing)
  // ─────────────────────────────────────────────

  @Post()
  @Idempotent(86400)
  @UseInterceptors(IdempotencyInterceptor, AuditLogInterceptor)
  @Audit({ action: 'CREATE', resource: 'order' })
  @ApiOperation({ 
    summary: 'Create order from single restaurant',
    description: 'Place an order from a single restaurant'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Order created successfully'
  })
  @ApiResponse({ status: 400, description: 'Invalid order data or restaurant closed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate orders',
    required: false,
  })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey && !/^[a-zA-Z0-9\-_]{8,64}$/.test(idempotencyKey)) {
      throw new ConflictException('Invalid idempotency key format');
    }

    return this.ordersService.createOrder(req.user.id, createOrderDto);
  }

  // ─────────────────────────────────────────────
  // MULTI-RESTAURANT ORDER (NEW)
  // ─────────────────────────────────────────────

  @Post('multi')
  @Idempotent(86400)
  @UseInterceptors(IdempotencyInterceptor, AuditLogInterceptor)
  @Audit({ action: 'CREATE_MULTI', resource: 'order' })
  @ApiOperation({ 
    summary: 'Create orders from multiple restaurants',
    description: 'Allows a customer to order from multiple restaurants in a single checkout'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Orders created successfully',
    schema: {
      example: {
        message: '3 order(s) placed successfully',
        orders: [],
        summary: {
          totalAmount: 750,
          totalItems: 12,
          restaurantCount: 3,
          orderIds: ['uuid-1', 'uuid-2', 'uuid-3']
        },
        errors: ['"Burger King" is currently closed']
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid cart or all restaurants closed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Duplicate order (idempotency)' })
  @ApiHeader({
    name: 'idempotency-key',
    description: 'Unique key to prevent duplicate orders',
    required: false,
  })
  @ApiBody({ type: CreateMultiOrderDto })
  async createMultiRestaurantOrder(
    @Body() createMultiOrderDto: CreateMultiOrderDto,
    @Request() req,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (idempotencyKey && !/^[a-zA-Z0-9\-_]{8,64}$/.test(idempotencyKey)) {
      throw new ConflictException('Invalid idempotency key format');
    }

    return this.ordersService.createMultiRestaurantOrder(
      req.user.id,
      createMultiOrderDto,
    );
  }

  // ─────────────────────────────────────────────
  // GET MULTI-RESTAURANT ORDERS (NEW)
  // ─────────────────────────────────────────────

  @Get('multi/batch')
  @ReadOnly()
  @ApiOperation({ 
    summary: 'Get multiple orders by IDs',
    description: 'Fetch orders from a multi-restaurant checkout'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orders retrieved successfully',
    schema: {
      example: {
        orders: [],
        summary: {
          totalOrders: 3,
          totalAmount: 750,
          statuses: { pending: 2, preparing: 1 }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'No order IDs provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ 
    name: 'orderIds', 
    type: String, 
    description: 'Comma-separated list of order IDs',
    example: 'uuid-1,uuid-2,uuid-3'
  })
  async getMultiRestaurantOrders(
    @Query('orderIds') orderIds: string,
    @Request() req,
  ) {
    if (!orderIds) {
      throw new ConflictException('orderIds query parameter is required');
    }

    const ids = orderIds.split(',').filter(id => id.trim());
    if (ids.length === 0) {
      throw new ConflictException('At least one order ID is required');
    }

    return this.ordersService.getMultiRestaurantOrders(req.user.id, ids);
  }

  // ─────────────────────────────────────────────
  // CANCEL MULTI-RESTAURANT ORDERS (NEW)
  // ─────────────────────────────────────────────

  @Post('multi/cancel')
  @UseInterceptors(AuditLogInterceptor)
  @Audit({ action: 'CANCEL_MULTI', resource: 'order' })
  @ApiOperation({ 
    summary: 'Cancel multiple orders',
    description: 'Cancel all orders from a multi-restaurant checkout'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Orders cancelled successfully',
    schema: {
      example: {
        message: '3 order(s) cancelled successfully',
        results: [
          { orderId: 'uuid-1', success: true, message: 'Order cancelled successfully' },
          { orderId: 'uuid-2', success: true, message: 'Order cancelled successfully' }
        ],
        errors: [
          { orderId: 'uuid-3', error: 'Only pending orders can be cancelled' }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'No order IDs provided' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['uuid-1', 'uuid-2', 'uuid-3']
        }
      }
    }
  })
  async cancelMultiRestaurantOrders(
    @Body('orderIds') orderIds: string[],
    @Request() req,
  ) {
    if (!orderIds || orderIds.length === 0) {
      throw new ConflictException('At least one order ID is required');
    }

    return this.ordersService.cancelMultiRestaurantOrders(
      orderIds,
      req.user.id,
      req.user.role,
    );
  }

  // ─────────────────────────────────────────────
  // EXISTING ENDPOINTS
  // ─────────────────────────────────────────────

  @Get('my')
  @ReadOnly()
  @ApiOperation({ summary: 'Get current user\'s orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyOrders(@Request() req) {
    return this.ordersService.getCustomerOrders(req.user.id);
  }

  @Get('my-restaurant')
  @Roles(UserRole.OWNER)
  @ReadOnly()
  @ApiOperation({ summary: 'Get restaurant owner\'s orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner only' })
  async getMyRestaurantOrders(@Request() req) {
    return this.ordersService.getOwnerRestaurantOrders(req.user.id);
  }

  @Get('available')
  @Roles(UserRole.AGENT)
  @ReadOnly()
  @ApiOperation({ summary: 'Get available orders for agents' })
  @ApiResponse({ status: 200, description: 'Available orders retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Agent only' })
  async getAvailableOrders() {
    return this.ordersService.getAvailableOrders();
  }

  @Get('agent/my')
  @Roles(UserRole.AGENT)
  @ReadOnly()
  @ApiOperation({ summary: 'Get agent\'s assigned orders' })
  @ApiResponse({ status: 200, description: 'Assigned orders retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Agent only' })
  async getMyAgentOrders(@Request() req) {
    return this.ordersService.getAgentOrders(req.user.id);
  }

  @Get(':id')
  @ReadOnly()
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(@Param('id') id: string, @Request() req) {
    const order = await this.ordersService.getOrderWithDetails(id);
    
    // Check permissions
    if (
      order.customerId !== req.user.id &&
      order.agentId !== req.user.id &&
      req.user.role !== UserRole.ADMIN
    ) {
      // Check if owner of restaurant
      const restaurants = await this.ordersService.getRestaurantsByOwner(req.user.id);
      const isOwner = restaurants.some(r => r.id === order.restaurantId);
      if (!isOwner) {
        throw new ConflictException('You do not have access to this order');
      }
    }
    
    return order;
  }

  @Patch(':id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(AuditLogInterceptor)
  @Audit({ action: 'UPDATE', resource: 'order' })
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      dto.status,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  @UseInterceptors(AuditLogInterceptor)
  @Audit({ action: 'ASSIGN', resource: 'order' })
  @ApiOperation({ summary: 'Assign order to delivery agent' })
  @ApiResponse({ status: 200, description: 'Order assigned successfully' })
  @ApiResponse({ status: 400, description: 'Order not ready for assignment' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async assignAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
    @Request() req,
  ) {
    return this.ordersService.assignDeliveryAgent(
      id,
      agentId || req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/accept')
  @Roles(UserRole.AGENT)
  @UseInterceptors(AuditLogInterceptor)
  @Audit({ action: 'ACCEPT', resource: 'order' })
  @ApiOperation({ summary: 'Accept order as delivery agent' })
  @ApiResponse({ status: 200, description: 'Order accepted successfully' })
  @ApiResponse({ status: 400, description: 'Order not ready' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Agent only' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async acceptOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.acceptOrder(id, req.user.id);
  }

  @Patch(':id/delivery')
  @Roles(UserRole.AGENT)
  @UseInterceptors(AuditLogInterceptor)
  @Audit({ action: 'UPDATE_DELIVERY', resource: 'order' })
  @ApiOperation({ summary: 'Update delivery status (agent)' })
  @ApiResponse({ status: 200, description: 'Delivery status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Agent only' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateDeliveryStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req,
  ) {
    return this.ordersService.updateDeliveryStatus(id, status, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@Param('id') id: string, @Request() req) {
    return this.ordersService.cancelOrder(id, req.user.id, req.user.role);
  }

  @Get('owner/analytics')
  @Roles(UserRole.OWNER)
  @ReadOnly()
  @ApiOperation({ summary: 'Get restaurant owner analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Owner only' })
  @ApiQuery({ name: 'restaurantId', required: false, description: 'Filter by specific restaurant' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'year'], required: false, description: 'Time period' })
  async getOwnerAnalytics(
    @Request() req,
    @Query('restaurantId') restaurantId?: string,
    @Query('period') period: 'week' | 'month' | 'year' = 'week',
  ) {
    return this.ordersService.getOwnerAnalytics(req.user.id, restaurantId, period);
  }
}