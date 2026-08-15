import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Order } from '../../orders/entities/order.entity';

// Column mappings here previously used snake_case (user_id, order_id,
// restaurant_id) which didn't match the live `reviews` table — every other
// table in this schema is plain camelCase with no name overrides, and the
// live table's actual columns are: id, customerId, restaurantId, orderId,
// rating, comment, createdAt, images. This entity has been aligned to
// match that.
//
// `images` IS an actively-used feature (see ReviewsService.createReview /
// updateReview), so it's kept here — paired with a migration
// (AddReviewImagesColumn) that adds the column to Neon, since it wasn't
// actually present there before.
//
// `updatedAt` / `deletedAt` were NOT referenced anywhere in ReviewsService,
// so they're left out rather than silently reintroducing another
// "column does not exist" — add them back (with a matching migration)
// only if/when soft-delete or edit-tracking is actually implemented.
@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column('simple-array', { nullable: true })
  images: string[];

  @CreateDateColumn()
  createdAt: Date;
}