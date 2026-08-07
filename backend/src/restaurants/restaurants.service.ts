import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
    private readonly restaurantRepository: Repository<Restaurant>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto, ownerId: string) {
    const restaurant = this.restaurantRepository.create({
      ...createRestaurantDto,
      ownerId,
    });
    return this.restaurantRepository.save(restaurant);
  }

  async findAll(filters?: { cuisineType?: string; isOpen?: boolean }) {
    const query = this.restaurantRepository
      .createQueryBuilder('restaurant')
      .where('restaurant.isDeleted = :isDeleted', { isDeleted: false });

    if (filters?.cuisineType) {
      query.andWhere('restaurant.cuisineType = :cuisineType', {
        cuisineType: filters.cuisineType,
      });
    }

    if (filters?.isOpen !== undefined) {
      query.andWhere('restaurant.isOpen = :isOpen', { isOpen: filters.isOpen });
    }

    return query.getMany();
  }

  async findOne(id: string) {
    const restaurant = await this.restaurantRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['menuItems', 'reviews', 'owner'],
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return restaurant;
  }

  async findByOwnerId(ownerId: string) {
    return this.restaurantRepository.find({
      where: { ownerId, isDeleted: false },
      relations: ['menuItems'],
    });
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
    userId: string,
    userRole: UserRole,
  ) {
    const restaurant = await this.findOne(id);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to update this restaurant',
      );
    }

    Object.assign(restaurant, updateRestaurantDto);
    return this.restaurantRepository.save(restaurant);
  }

  async remove(id: string, userId: string, userRole: UserRole) {
    const restaurant = await this.findOne(id);

    if (restaurant.ownerId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You do not have permission to delete this restaurant',
      );
    }

    // Soft delete
    restaurant.isDeleted = true;
    restaurant.isOpen = false;
    await this.restaurantRepository.save(restaurant);

    return { message: 'Restaurant deleted successfully' };
  }

  // ── UPDATE RATING (called by ReviewsService) ──

  /**
   * Update the average rating of a restaurant
   */
  async updateRestaurantRating(restaurantId: string, averageRating: number) {
    await this.restaurantRepository.update(restaurantId, {
      rating: averageRating,
    });
  }

  /**
   * Alias for updateRestaurantRating
   * Used by ReviewsService to match its method name
   */
  async updateRating(restaurantId: string, averageRating: number) {
    return this.updateRestaurantRating(restaurantId, averageRating);
  }
}