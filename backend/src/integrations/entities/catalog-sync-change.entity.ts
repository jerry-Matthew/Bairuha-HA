import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { CatalogSyncHistory } from './catalog-sync-history.entity';
import { IntegrationCatalog } from './integration-catalog.entity';

@Entity('catalog_sync_changes')
export class CatalogSyncChange {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', name: 'sync_id' })
    @Index()
    syncId: string;

    @ManyToOne(() => CatalogSyncHistory, (history) => history.changes, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sync_id' })
    sync: CatalogSyncHistory;

    @Column({ type: 'text' })
    @Index()
    domain: string;

    @ManyToOne(() => IntegrationCatalog, (catalog) => catalog.syncChanges)
    @JoinColumn({ name: 'domain' })
    catalogItem: IntegrationCatalog;

    @Column({ type: 'text' })
    @Index()
    changeType: 'new' | 'updated' | 'deleted' | 'deprecated';

    @Column({ type: 'text', nullable: true, name: 'previous_version_hash' })
    previousVersionHash?: string;

    @Column({ type: 'text', nullable: true, name: 'new_version_hash' })
    newVersionHash?: string;

    @Column({ type: 'jsonb', nullable: true, name: 'changed_fields' })
    changedFields?: string[];

    @CreateDateColumn({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
    createdAt: Date;
}
