import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { OrderItem } from './order-item.entity';
import { DeliveryAgent } from '../../delivery/entities/delivery-agent.entity';

export enum OrderStatus {
  PENDING = 'pending',           // 1. Order Placed
  PREPARING = 'preparing',       // 2. Preparing
  READY = 'ready',               // 3. Ready for Pickup
  PICKED_UP = 'picked_up',       // 4. Picked Up
  ON_THE_WAY = 'on_the_way',     // 5. On the Way (NEW)
  DELIVERED = 'delivered',       // 6. Delivered
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  customer: User;

  @Column()
  customerId: string;

  @ManyToOne(() => Restaurant)
  restaurant: Restaurant;

  @Column()
  restaurantId: string;

  @ManyToOne(() => User, { nullable: true })
  agent: User;

  @Column({ nullable: true })
  agentId: string;

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
  deliveryInstructions: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  paymentMethod: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order, { cascade: true })
  items: OrderItem[];

  @CreateDateColumn()
  placedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  deliveryAgentId: string;

  @ManyToOne(() => DeliveryAgent, { nullable: true })
  @JoinColumn({ name: 'deliveryAgentId' })
  deliveryAgent: DeliveryAgent;
}