import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { IntegrationCatalog } from './integration-catalog.entity';

@Entity('config_entries')
export class ConfigEntry {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text', name: 'integration_domain' })
    @Index()
    integrationDomain: string;

    @ManyToOne(() => IntegrationCatalog)
    @JoinColumn({ name: 'integration_domain' })
    catalogItem: IntegrationCatalog;

    @Column({ type: 'text' })
    title: string;

    @Column({ type: 'jsonb', default: {} })
    data: any;

    @Column({ type: 'jsonb', nullable: true, default: {} })
    options: any;

    @Column({ type: 'text', default: 'loaded' })
    @Index()
    status: 'loaded' | 'setup' | 'error';

    @CreateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
    updatedAt: Date;
}
