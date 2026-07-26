import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'pending',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  ON_THE_WAY = 'on_the_way',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column()
  customerId: string;

  @ManyToOne(() => Restaurant)
  @JoinColumn({ name: 'restaurantId' })
  restaurant: Restaurant;

  @Column()
  restaurantId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'agentId' })
  agent: User;

  @Column({ nullable: true })
  agentId: string | null;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column('decimal', { precision: 10, scale: 2, default: 50 })
  deliveryFee: number;

  @Column('decimal', { precision: 10, scale: 2, default: 20 })
  platformFee: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalAmount: number;

  @Column()
  deliveryAddress: string;

  @Column({ nullable: true })
  deliveryInstructions: string | null;

  @Column({ nullable: true })
  customerName: string | null;

  @Column({ nullable: true })
  customerEmail: string | null;

  @Column({ nullable: true })
  customerPhone: string | null;

  @Column({ nullable: true })
  paymentMethod: string | null;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, {
    cascade: true,
  })
  items: OrderItem[];

  @CreateDateColumn()
  placedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}