import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuItem)
    private menuItemRepository: Repository<MenuItem>,
    private restaurantsService: RestaurantsService,
  ) {}

  async createMenuItem(restaurantId: string, createMenuItemDto: CreateMenuItemDto, userId: string, userRole: UserRole) {
    const restaurant = await this.restaurantsService.findOne(restaurantId);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to modify this restaurant\'s menu');
    }

    const menuItem = this.menuItemRepository.create({
      ...createMenuItemDto,
      restaurantId,
    });

    return await this.menuItemRepository.save(menuItem);
  }

  async getMenuItems(restaurantId: string) {
    await this.restaurantsService.findOne(restaurantId);
    return await this.menuItemRepository.find({
      where: { restaurantId },
    });
  }

  async getMenuItem(id: string) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return menuItem;
  }

  async updateMenuItem(id: string, updateData: Partial<CreateMenuItemDto>, userId: string, userRole: UserRole) {
    const menuItem = await this.getMenuItem(id);
    const restaurant = await this.restaurantsService.findOne(menuItem.restaurantId);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this menu item');
    }

    Object.assign(menuItem, updateData);
    return await this.menuItemRepository.save(menuItem);
  }

  async deleteMenuItem(id: string, userId: string, userRole: UserRole) {
    const menuItem = await this.getMenuItem(id);
    const restaurant = await this.restaurantsService.findOne(menuItem.restaurantId);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this menu item');
    }

    await this.menuItemRepository.remove(menuItem);
    return { message: 'Menu item deleted successfully' };
  }
}