import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from './device.entity';

@Entity('entities')
@Index(['deviceId', 'entityId'], { unique: true })
export class EntityState {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'device_id' })
    @Index()
    deviceId: string;

    @ManyToOne(() => Device, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'device_id' })
    device: Device;

    @Column({ type: 'text', name: 'entity_id' })
    @Index()
    entityId: string;

    @Column({ type: 'text' })
    @Index()
    domain: string;

    @Column({ type: 'text', nullable: true })
    name: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @Column({ type: 'text', nullable: true })
    state: string;

    @Column({ type: 'jsonb', default: {} })
    attributes: any;

    @Column({ type: 'timestamptz', nullable: true, name: 'last_changed' })
    lastChanged: Date;

    @Column({ type: 'timestamptz', default: () => 'now()', name: 'last_updated' })
    lastUpdated: Date;

    @Column({ type: 'text', default: 'internal' })
    source: string;

    @Column({ type: 'text', nullable: true, name: 'ha_entity_id' })
    @Index()
    haEntityId: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;
}
