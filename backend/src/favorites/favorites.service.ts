import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { CreateFavoriteDto } from './dto/create-favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private favoriteRepository: Repository<Favorite>,
  ) {}

  // Get all favorites for a user
  async findAll(userId: string) {
    return await this.favoriteRepository.find({
      where: { userId },
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
    });
  }

  // Check if restaurant is favorited
  async isFavorite(userId: string, restaurantId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, restaurantId },
    });
    return { isFavorite: !!favorite };
  }

  // Add restaurant to favorites
  async create(userId: string, createFavoriteDto: CreateFavoriteDto) {
    const existing = await this.favoriteRepository.findOne({
      where: { userId, restaurantId: createFavoriteDto.restaurantId },
    });

    if (existing) {
      return existing;
    }

    const favorite = this.favoriteRepository.create({
      userId,
      ...createFavoriteDto,
    });

    return await this.favoriteRepository.save(favorite);
  }

  // Remove restaurant from favorites
  async remove(userId: string, restaurantId: string) {
    await this.favoriteRepository.delete({
      userId,
      restaurantId,
    });
    return { message: 'Removed from favorites' };
  }
}