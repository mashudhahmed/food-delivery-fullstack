import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '../orders/entities/order.entity';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly ordersService: OrdersService,
    private readonly restaurantsService: RestaurantsService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE REVIEW
  // ─────────────────────────────────────────────

  async createReview(userId: string, createReviewDto: CreateReviewDto) {
    const { orderId, restaurantId, rating, comment, images } = createReviewDto;

    // 1. Verify the order exists and belongs to the user
    const order = await this.ordersService.getOrderWithDetails(orderId);
    if (order.customerId !== userId) {
      throw new ForbiddenException('You can only review your own orders');
    }

    // 2. Verify the order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'You can only review orders that have been delivered',
      );
    }

    // 3. Verify the restaurant matches
    if (order.restaurantId !== restaurantId) {
      throw new BadRequestException(
        'The order does not belong to this restaurant',
      );
    }

    // 4. Check if user already reviewed this order
    const existingReview = await this.reviewRepository.findOne({
      where: { orderId, userId },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this order');
    }

    // 5. Create the review
    const review = this.reviewRepository.create({
      userId,
      orderId,
      restaurantId,
      rating,
      comment: comment?.trim() || null,
      images: images || [],
    });

    const savedReview = await this.reviewRepository.save(review);

    // 6. Update restaurant average rating
    await this.updateRestaurantRating(restaurantId);

    return savedReview;
  }

  // ─────────────────────────────────────────────
  // GET ALL REVIEWS (Admin)
  // ─────────────────────────────────────────────

  async findAll(page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      relations: ['user', 'restaurant'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // GET REVIEWS BY RESTAURANT
  // ─────────────────────────────────────────────

  async findByRestaurant(restaurantId: string, page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { restaurantId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating: await this.getRestaurantAverageRating(restaurantId),
    };
  }

  // ─────────────────────────────────────────────
  // GET REVIEWS BY USER
  // ─────────────────────────────────────────────

  async findByUser(userId: string, page = 1, limit = 20) {
    const [reviews, total] = await this.reviewRepository.findAndCount({
      where: { userId },
      relations: ['restaurant'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────
  // GET SINGLE REVIEW
  // ─────────────────────────────────────────────

  async findOne(id: string) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: ['user', 'restaurant'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  // ─────────────────────────────────────────────
  // UPDATE REVIEW
  // ─────────────────────────────────────────────

  async updateReview(
    id: string,
    userId: string,
    updateReviewDto: UpdateReviewDto,
    userRole?: string,
  ) {
    const review = await this.findOne(id);

    // Check permissions (only the user who wrote it OR admin)
    if (review.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission to update this review',
      );
    }

    const { rating, comment, images } = updateReviewDto;

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }
      review.rating = rating;
    }

    if (comment !== undefined) {
      review.comment = comment.trim() || null;
    }

    if (images !== undefined) {
      review.images = images;
    }

    const updatedReview = await this.reviewRepository.save(review);

    // Update restaurant rating
    await this.updateRestaurantRating(review.restaurantId);

    return updatedReview;
  }

  // ─────────────────────────────────────────────
  // DELETE REVIEW
  // ─────────────────────────────────────────────

  async remove(id: string, userId: string, userRole?: string) {
    const review = await this.findOne(id);

    // Check permissions
    if (review.userId !== userId && userRole !== 'admin') {
      throw new ForbiddenException(
        'You do not have permission to delete this review',
      );
    }

    const restaurantId = review.restaurantId;
    await this.reviewRepository.remove(review);

    // Update restaurant rating
    await this.updateRestaurantRating(restaurantId);

    return { message: 'Review deleted successfully' };
  }

  // ─────────────────────────────────────────────
  // RESTAURANT RATING HELPERS
  // ─────────────────────────────────────────────

  private async getRestaurantAverageRating(
    restaurantId: string,
  ): Promise<number> {
    const result = await this.reviewRepository
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .where('r.restaurantId = :restaurantId', { restaurantId })
      .getRawOne();

    return Number(result?.avg) || 0;
  }

  private async updateRestaurantRating(restaurantId: string) {
    const averageRating = await this.getRestaurantAverageRating(restaurantId);

    await this.restaurantsService.updateRating(restaurantId, averageRating);
  }

  // ─────────────────────────────────────────────
  // ADMIN / STATS HELPERS
  // ─────────────────────────────────────────────

  async getReviewStats() {
    const [total, averageResult, distribution] = await Promise.all([
      this.reviewRepository.count(),
      this.reviewRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .getRawOne(),
      this.reviewRepository
        .createQueryBuilder('r')
        .select('r.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .groupBy('r.rating')
        .orderBy('r.rating', 'DESC')
        .getRawMany(),
    ]);

    const ratingDistribution = distribution.reduce(
      (acc, item) => {
        acc[item.rating] = Number(item.count);
        return acc;
      },
      {} as Record<number, number>,
    );

    // Ensure all ratings 1-5 are present
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) {
        ratingDistribution[i] = 0;
      }
    }

    return {
      totalReviews: total,
      averageRating: Number(averageResult?.avg) || 0,
      ratingDistribution,
    };
  }

  async getRestaurantReviewStats(restaurantId: string) {
    const [total, averageResult, distribution] = await Promise.all([
      this.reviewRepository.count({ where: { restaurantId } }),
      this.reviewRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'avg')
        .where('r.restaurantId = :restaurantId', { restaurantId })
        .getRawOne(),
      this.reviewRepository
        .createQueryBuilder('r')
        .select('r.rating', 'rating')
        .addSelect('COUNT(*)', 'count')
        .where('r.restaurantId = :restaurantId', { restaurantId })
        .groupBy('r.rating')
        .orderBy('r.rating', 'DESC')
        .getRawMany(),
    ]);

    const ratingDistribution = distribution.reduce(
      (acc, item) => {
        acc[item.rating] = Number(item.count);
        return acc;
      },
      {} as Record<number, number>,
    );

    // Ensure all ratings 1-5 are present
    for (let i = 1; i <= 5; i++) {
      if (!ratingDistribution[i]) {
        ratingDistribution[i] = 0;
      }
    }

    return {
      totalReviews: total,
      averageRating: Number(averageResult?.avg) || 0,
      ratingDistribution,
    };
  }

  async getRecentReviews(limit = 10) {
    return this.reviewRepository.find({
      relations: ['user', 'restaurant'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getReviewsByPeriod(startDate: Date, endDate: Date) {
    return this.reviewRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['user', 'restaurant'],
      order: { createdAt: 'DESC' },
    });
  }
}