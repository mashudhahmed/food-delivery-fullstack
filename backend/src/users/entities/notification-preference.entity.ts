import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum NotificationType {
  ORDER_STATUS = 'order_status',
  NEW_ORDER = 'new_order',
  DELIVERY_UPDATE = 'delivery_update',
  PROMOTIONAL = 'promotional',
  REVIEW = 'review',
  SYSTEM = 'system',
  EARNINGS = 'earnings',
}

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Email preferences
  @Column({ default: true })
  emailOrderStatus: boolean;

  @Column({ default: true })
  emailNewOrder: boolean;

  @Column({ default: true })
  emailDeliveryUpdate: boolean;

  @Column({ default: false })
  emailPromotional: boolean;

  @Column({ default: true })
  emailReview: boolean;

  @Column({ default: true })
  emailSystem: boolean;

  @Column({ default: true })
  emailEarnings: boolean;

  // Push notifications
  @Column({ default: true })
  pushOrderStatus: boolean;

  @Column({ default: true })
  pushNewOrder: boolean;

  @Column({ default: true })
  pushDeliveryUpdate: boolean;

  @Column({ default: false })
  pushPromotional: boolean;

  @Column({ default: true })
  pushReview: boolean;

  @Column({ default: true })
  pushSystem: boolean;

  @Column({ default: true })
  pushEarnings: boolean;

  // In-app notifications
  @Column({ default: true })
  inAppOrderStatus: boolean;

  @Column({ default: true })
  inAppNewOrder: boolean;

  @Column({ default: true })
  inAppDeliveryUpdate: boolean;

  @Column({ default: false })
  inAppPromotional: boolean;

  @Column({ default: true })
  inAppReview: boolean;

  @Column({ default: true })
  inAppSystem: boolean;

  @Column({ default: true })
  inAppEarnings: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}