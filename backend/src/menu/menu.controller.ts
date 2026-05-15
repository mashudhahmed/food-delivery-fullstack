import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Create menu item under a restaurant
  @Post('restaurant/:restaurantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  async create(
    @Param('restaurantId') restaurantId: string,
    @Body() createMenuItemDto: CreateMenuItemDto,
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.menuService.createMenuItem(restaurantId, createMenuItemDto, req.user.id, req.user.role);
  }

  // Get all menu items for a restaurant
  @Get('restaurant/:restaurantId')
  async findAll(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getMenuItems(restaurantId);
  }

  // Get single menu item
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.menuService.getMenuItem(id);
  }

  // Update menu item
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string, 
    @Body() updateData: UpdateMenuItemDto, 
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.menuService.updateMenuItem(id, updateData, req.user.id, req.user.role);
  }

  // Delete menu item
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  async remove(
    @Param('id') id: string, 
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    console.log('Delete request received for item:', id);
    console.log('User:', req.user.id, 'Role:', req.user.role);
    return this.menuService.deleteMenuItem(id, req.user.id, req.user.role);
  }
}