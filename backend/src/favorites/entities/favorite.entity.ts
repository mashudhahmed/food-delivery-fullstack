import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity('favorites')
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  user: User;

  @Column()
  restaurantId: string;

  @ManyToOne(() => Restaurant)
  restaurant: Restaurant;

  @Column()
  restaurantName: string;

  @Column({ nullable: true })
  restaurantImage: string;

  @Column({ nullable: true })
  cuisineType: string;

  @CreateDateColumn()
  createdAt: Date;
}