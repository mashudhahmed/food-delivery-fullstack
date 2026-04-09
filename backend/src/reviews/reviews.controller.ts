import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.createReview(req.user.id, createReviewDto);
  }

  @Get('restaurant/:restaurantId')
  getRestaurantReviews(@Param('restaurantId') restaurantId: string) {
    return this.reviewsService.getRestaurantReviews(restaurantId);
  }
}