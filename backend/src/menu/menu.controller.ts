import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { MenuService } from './menu.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('menu')
@Controller('restaurants/:restaurantId/menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  create(
    @Param('restaurantId') restaurantId: string,
    @Body() createMenuItemDto: CreateMenuItemDto,
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.menuService.createMenuItem(restaurantId, createMenuItemDto, req.user.id, req.user.role);
  }

  @Get()
  findAll(@Param('restaurantId') restaurantId: string) {
    return this.menuService.getMenuItems(restaurantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuService.getMenuItem(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  update(
    @Param('id') id: string, 
    @Body() updateData: Partial<CreateMenuItemDto>, 
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.menuService.updateMenuItem(id, updateData, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  remove(
    @Param('id') id: string, 
    @Request() req: Request & { user: { id: string; role: UserRole } },
  ) {
    return this.menuService.deleteMenuItem(id, req.user.id, req.user.role);
  }
}