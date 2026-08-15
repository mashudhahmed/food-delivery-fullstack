// src/restaurants/restaurants.controller.ts
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
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { CacheService } from '../common/services/cache.service';

@ApiTags('restaurants')
@Controller('restaurants') // ✅ This maps to /api/v1/restaurants with global prefix
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly cacheService: CacheService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  async create(@Body() createRestaurantDto: CreateRestaurantDto, @Request() req) {
    const result = await this.restaurantsService.create(createRestaurantDto, req.user.id);
    await this.cacheService.deletePattern('cache:/restaurants*');
    return result;
  }

  @Get() // ✅ This maps to GET /api/v1/restaurants
  @UseInterceptors(CacheInterceptor)
  @ApiQuery({ name: 'cuisineType', required: false })
  @ApiQuery({ name: 'isOpen', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(
    @Query('cuisineType') cuisineType?: string,
    @Query('isOpen') isOpen?: string,
    @Query('ownerId') ownerId?: string,
  ) {
    if (ownerId) {
      return this.restaurantsService.findByOwnerId(ownerId);
    }

    const filters = {
      cuisineType,
      isOpen: isOpen === 'true' ? true : isOpen === 'false' ? false : undefined,
    };
    return this.restaurantsService.findAll(filters);
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
    @Request() req,
  ) {
    const result = await this.restaurantsService.update(
      id,
      updateRestaurantDto,
      req.user.id,
      req.user.role,
    );
    await this.cacheService.deletePattern(`cache:/restaurants/${id}`);
    await this.cacheService.deletePattern('cache:/restaurants*');
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  async remove(@Param('id') id: string, @Request() req) {
    const result = await this.restaurantsService.remove(id, req.user.id, req.user.role);
    await this.cacheService.deletePattern(`cache:/restaurants/${id}`);
    await this.cacheService.deletePattern('cache:/restaurants*');
    return result;
  }

  // ✅ Debug endpoint to verify API is working
  @Get('debug')
  debug() {
    return {
      message: 'Restaurants API is working',
      timestamp: new Date().toISOString(),
    };
  }
}