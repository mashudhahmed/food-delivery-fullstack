import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ type: 'json', nullable: true })
  data: any;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;
}