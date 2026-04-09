import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { OrdersService } from '../orders/orders.service';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MailService } from '../mail/mail.service';
import { OrderStatus } from '../orders/entities/order.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private ordersService: OrdersService,
    private restaurantsService: RestaurantsService,
    private mailService: MailService,
  ) {}

  async createReview(customerId: string, createReviewDto: CreateReviewDto) {
    const order = await this.ordersService.getOrderWithDetails(createReviewDto.orderId);

    if (order.customerId !== customerId) {
      throw new BadRequestException('You can only review your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('You can only review delivered orders');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { orderId: createReviewDto.orderId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this order');
    }

    const review = this.reviewRepository.create({
      customerId,
      restaurantId: order.restaurantId,
      orderId: createReviewDto.orderId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
    });

    await this.reviewRepository.save(review);

    await this.updateRestaurantRating(order.restaurantId);

    await this.mailService.sendNewReviewNotification(review, order.restaurant.owner.email);

    return review;
  }

  async getRestaurantReviews(restaurantId: string) {
    await this.restaurantsService.findOne(restaurantId);

    const reviews = await this.reviewRepository.find({
      where: { restaurantId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });

    const averageRating = await this.getAverageRating(restaurantId);

    return {
      reviews,
      averageRating,
      totalReviews: reviews.length,
    };
  }

  private async updateRestaurantRating(restaurantId: string) {
    const averageRating = await this.getAverageRating(restaurantId);
    await this.restaurantsService.updateRestaurantRating(restaurantId, averageRating);
  }

  private async getAverageRating(restaurantId: string): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .where('review.restaurantId = :restaurantId', { restaurantId })
      .getRawOne();

    return parseFloat(result.average) || 0;
  }
}