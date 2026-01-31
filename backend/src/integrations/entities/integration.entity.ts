import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('integrations')
@Index(['domain'], { unique: true })
@Index(['status'])
@Index(['supportsDevices'])
export class Integration {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', unique: true })
    domain: string;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @Column({ type: 'text', default: 'loaded' })
    status: string;

    @Column({ type: 'jsonb', nullable: true, name: 'config_data' })
    configData: any;

    @Column({ type: 'boolean', default: false, name: 'supports_devices' })
    supportsDevices: boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;
}
