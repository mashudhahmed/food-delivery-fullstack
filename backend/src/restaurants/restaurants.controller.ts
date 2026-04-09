import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  create(@Body() createRestaurantDto: CreateRestaurantDto, @Request() req) {
    return this.restaurantsService.create(createRestaurantDto, req.user.id);
  }

  @Get()
  @ApiQuery({ name: 'cuisineType', required: false })
  @ApiQuery({ name: 'isOpen', required: false })
  findAll(@Query('cuisineType') cuisineType?: string, @Query('isOpen') isOpen?: string) {
    const filters = {
      cuisineType,
      isOpen: isOpen === 'true' ? true : isOpen === 'false' ? false : undefined,
    };
    return this.restaurantsService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() updateRestaurantDto: UpdateRestaurantDto, @Request() req) {
    return this.restaurantsService.update(id, updateRestaurantDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Request() req) {
    return this.restaurantsService.remove(id, req.user.id, req.user.role);
  }
}