import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'user_id', nullable: true })
    @Index()
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'user_id' })
    user: User | null;

    @Column({ type: 'text' })
    type: 'info' | 'success' | 'warning' | 'error';

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ type: 'text', nullable: true, name: 'action_url' })
    actionUrl: string;

    @Column({ type: 'text', nullable: true, name: 'action_label' })
    actionLabel: string;

    @Column({ type: 'boolean', default: false })
    @Index()
    read: boolean;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
    @Index()
    createdAt: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'read_at' })
    readAt: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata: any;
}
