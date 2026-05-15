// backend/src/menu/menu.service.ts

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuItem } from './entities/menu-item.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
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
      order: { category: 'ASC', name: 'ASC' },
    });
  }

  async getMenuItem(id: string) {
    const menuItem = await this.menuItemRepository.findOne({ where: { id } });
    if (!menuItem) {
      throw new NotFoundException('Menu item not found');
    }
    return menuItem;
  }

  async updateMenuItem(id: string, updateData: UpdateMenuItemDto, userId: string, userRole: UserRole) {
    const menuItem = await this.getMenuItem(id);
    const restaurant = await this.restaurantsService.findOne(menuItem.restaurantId);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this menu item');
    }

    Object.assign(menuItem, updateData);
    return await this.menuItemRepository.save(menuItem);
  }

  async deleteMenuItem(id: string, userId: string, userRole: UserRole) {
    console.log('Deleting menu item:', id);
    
    const menuItem = await this.getMenuItem(id);
    console.log('Found menu item:', menuItem);
    
    const restaurant = await this.restaurantsService.findOne(menuItem.restaurantId);
    console.log('Restaurant owner:', restaurant.ownerId, 'User:', userId);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this menu item');
    }

    try {
      const result = await this.menuItemRepository.delete(id);
      console.log('Delete result:', result);
      
      if (result.affected === 0) {
        throw new NotFoundException('Menu item not found');
      }
      
      return { message: 'Menu item deleted successfully', success: true };
    } catch (error) {
      console.error('Delete error:', error);
      throw new BadRequestException('Failed to delete menu item');
    }
  }
}