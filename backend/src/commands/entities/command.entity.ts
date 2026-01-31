import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EntityState } from '../../devices/entities/entity-state.entity';

@Entity('commands')
export class Command {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'entity_id' })
    @Index()
    entityId: string;

    @ManyToOne(() => EntityState, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'entity_id' })
    entity: EntityState;

    @Column({ type: 'text' })
    command: string;

    @Column({ type: 'jsonb', default: {} })
    payload: Record<string, any>;

    @Column({ type: 'text', default: 'pending' })
    status: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;
}
