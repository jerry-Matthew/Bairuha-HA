import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('activity_logs')
@Index(['type'])
@Index(['timestamp'])
export class ActivityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', name: 'entity_id' })
    entityId: string;

    @Column({ type: 'text', name: 'entity_name' })
    entityName: string;

    @Column({ type: 'text' })
    action: string;

    @Column({ type: 'text', nullable: true })
    area: string | null;

    @Column({ type: 'text' })
    type: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
}
