import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Order } from '../../orders/entities/order.entity';
import { Review } from '../../reviews/entities/review.entity';

export enum UserRole {
  CUSTOMER = 'customer',
  OWNER = 'owner',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export enum UserStatus {
  PENDING = 'pending',      // Waiting for admin approval
  APPROVED = 'approved',    // Approved
  REJECTED = 'rejected',    // Rejected
  SUSPENDED = 'suspended',  // Temporarily suspended
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.APPROVED,
  })
  status: UserStatus;

  // For restaurant owners
  @Column({ nullable: true })
  businessName: string;

  @Column({ nullable: true })
  businessAddress: string;

  @Column({ nullable: true })
  taxId: string;

  // For delivery agents
  @Column({ nullable: true })
  nidNumber: string;

  @Column({ nullable: true })
  vehicleType: string;

  @Column({ nullable: true })
  vehicleNumber: string;

  @Column({ nullable: true })
  drivingLicense: string;

  @Exclude()
  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  rejectionReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
resetPasswordToken: string;

@Column({ nullable: true })
resetPasswordExpires: Date;

  @OneToMany(() => Restaurant, (restaurant) => restaurant.owner)
  restaurants: Restaurant[];

  @OneToMany(() => Order, (order) => order.customer)
  customerOrders: Order[];

  @OneToMany(() => Order, (order) => order.agent)
  agentOrders: Order[];

  @OneToMany(() => Review, (review) => review.customer)
  reviews: Review[];
}