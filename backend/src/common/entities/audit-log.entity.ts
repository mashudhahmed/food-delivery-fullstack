import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'action'])
@Index(['resource', 'resourceId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  action: string; // CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, etc.

  @Column()
  resource: string; // user, order, restaurant, etc.

  @Column()
  resourceId: string;

  @Column({ type: 'json', nullable: true })
  changes: any; // Old and new values

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  requestId: string;

  @Column({ default: false })
  wasSuccessful: boolean;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Additional context
}