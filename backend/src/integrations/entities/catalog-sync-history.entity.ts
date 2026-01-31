import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, OneToMany } from 'typeorm';
import { CatalogSyncChange } from './catalog-sync-change.entity';

@Entity('catalog_sync_history')
export class CatalogSyncHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    @Index()
    syncType: 'full' | 'incremental' | 'manual';

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'started_at' })
    @Index()
    startedAt: Date;

    @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
    completedAt?: Date;

    @Column({ type: 'text', default: 'running' })
    @Index()
    status: 'running' | 'completed' | 'failed' | 'cancelled';

    @Column({ type: 'integer', default: 0, name: 'total_integrations' })
    totalIntegrations: number;

    @Column({ type: 'integer', default: 0, name: 'new_integrations' })
    newIntegrations: number;

    @Column({ type: 'integer', default: 0, name: 'updated_integrations' })
    updatedIntegrations: number;

    @Column({ type: 'integer', default: 0, name: 'deleted_integrations' })
    deletedIntegrations: number;

    @Column({ type: 'integer', default: 0, name: 'error_count' })
    errorCount: number;

    @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
    errorDetails?: any;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;

    @OneToMany(() => CatalogSyncChange, (change) => change.sync)
    changes: CatalogSyncChange[];
}
