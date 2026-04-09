import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantRepository: Repository<Restaurant>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto, ownerId: string) {
    const restaurant = this.restaurantRepository.create({
      ...createRestaurantDto,
      ownerId,
    });
    return await this.restaurantRepository.save(restaurant);
  }

  async findAll(filters?: { cuisineType?: string; isOpen?: boolean }) {
    const query = this.restaurantRepository.createQueryBuilder('restaurant');

    if (filters?.cuisineType) {
      query.andWhere('restaurant.cuisineType = :cuisineType', { cuisineType: filters.cuisineType });
    }

    if (filters?.isOpen !== undefined) {
      query.andWhere('restaurant.isOpen = :isOpen', { isOpen: filters.isOpen });
    }

    return await query.getMany();
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id },
      relations: ['menuItems', 'reviews', 'owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async update(id: string, updateRestaurantDto: UpdateRestaurantDto, userId: string, userRole: UserRole) {
    const restaurant = await this.findOne(id);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to update this restaurant');
    }

    Object.assign(restaurant, updateRestaurantDto);
    return await this.restaurantRepository.save(restaurant);
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const restaurant = await this.findOne(id);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException('You do not have permission to delete this restaurant');
    }

    await this.restaurantRepository.remove(restaurant);
    return { message: 'Restaurant deleted successfully' };
  }

  async updateRestaurantRating(restaurantId: string, averageRating: number) {
    await this.restaurantRepository.update(restaurantId, { rating: averageRating });
  }
}