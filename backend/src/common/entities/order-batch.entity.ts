// src/common/entities/order-batch.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('order_batches')
export class OrderBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  deliveryAddress: string;

  @Column({ nullable: true })
  deliveryInstructions: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ default: false })
  isComplete: boolean;

  // use any in the lambda to avoid TS error if the Order type doesn't expose the relation property name
  @OneToMany(() => Order, (order: any) => order.batch)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;
}