import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  /** Public part – indexed, used for fast lookup */
  @Column({ unique: true })
  @Index()
  selector: string;

  /** Hashed verifier – never store plain text */
  @Column()
  tokenHash: string;

  @Column()
  @Index()
  family: string;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: false })
  revoked: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ nullable: true })
  replacedByTokenId: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @Column({ nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}