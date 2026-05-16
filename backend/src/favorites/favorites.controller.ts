import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('favorites')
@Controller('favorites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  // Get all favorites
  @Get()
  findAll(@Request() req) {
    return this.favoritesService.findAll(req.user.id);
  }

  // Check if restaurant is favorited
  @Get(':restaurantId')
  isFavorite(@Param('restaurantId') restaurantId: string, @Request() req) {
    return this.favoritesService.isFavorite(req.user.id, restaurantId);
  }

  // Add to favorites
  @Post()
  create(@Body() createFavoriteDto: CreateFavoriteDto, @Request() req) {
    return this.favoritesService.create(req.user.id, createFavoriteDto);
  }

  // Remove from favorites
  @Delete(':restaurantId')
  remove(@Param('restaurantId') restaurantId: string, @Request() req) {
    return this.favoritesService.remove(req.user.id, restaurantId);
  }
}