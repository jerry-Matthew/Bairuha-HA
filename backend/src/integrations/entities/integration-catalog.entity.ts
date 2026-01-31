import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { CatalogSyncChange } from './catalog-sync-change.entity';

@Entity('integration_catalog')
export class IntegrationCatalog {
    @PrimaryColumn({ type: 'text' })
    domain: string;

    @Column({ type: 'text' })
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text', nullable: true })
    icon: string;

    @Column({ type: 'boolean', default: false, name: 'supports_devices' })
    @Index()
    supportsDevices: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_cloud' })
    isCloud: boolean;

    @Column({ type: 'text', nullable: true, name: 'documentation_url' })
    documentationUrl: string;

    @Column({ type: 'text', nullable: true, name: 'brand_image_url' })
    brandImageUrl?: string;

    @Column({ type: 'text', nullable: true, name: 'version_hash' })
    @Index()
    versionHash?: string;

    @Column({ type: 'text', default: 'pending', name: 'sync_status' })
    @Index()
    syncStatus: 'pending' | 'synced' | 'error' | 'deprecated';

    @Column({ type: 'timestamptz', nullable: true, name: 'last_synced_at' })
    @Index()
    lastSyncedAt?: Date;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any;

    @Column({ type: 'text', nullable: true, name: 'flow_type' })
    flowType?: string;

    @Column({ type: 'jsonb', nullable: true, name: 'flow_config' })
    flowConfig?: any;

    @Column({ type: 'text', nullable: true, name: 'handler_class' })
    handlerClass?: string;

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'updated_at' })
    updatedAt: Date;

    @OneToMany(() => CatalogSyncChange, (change) => change.catalogItem)
    syncChanges: CatalogSyncChange[];
}
