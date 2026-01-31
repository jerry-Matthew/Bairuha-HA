import { Injectable, Inject, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { DATABASE_POOL } from '../database/database.module';
import { Pool } from 'pg';
import { GithubService } from './github.service';
import { mapManifestToCatalog, CatalogEntry } from './manifest-mapper';
import { calculateVersionHash, detectChanges } from './utils/hashing.utils';

export interface SyncResult {
    syncId: string;
    status: 'completed' | 'failed' | 'cancelled';
    total: number;
    new: number;
    updated: number;
    deleted: number;
    errors: number;
    errorDetails: Array<{ domain: string; error: string }>;
    duration: number;
}

@Injectable()
export class IntegrationsService {
    private readonly logger = new Logger(IntegrationsService.name);
    private syncInProgress = false;
    private currentSyncId: string | null = null;

    constructor(
        @Inject(DATABASE_POOL) private readonly pool: Pool,
        private readonly githubService: GithubService,
    ) { }

    async getIntegrations(query?: string, limit: number = 50, offset: number = 0) {
        const params: any[] = [];
        let whereClause = 'WHERE 1=1'; // Allow all devices, frontend filters/labels them

        if (query) {
            params.push(`%${query.toLowerCase()}%`);
            whereClause += ` AND (LOWER(c.name) LIKE $${params.length} OR LOWER(c.domain) LIKE $${params.length})`;
        }

        // Add limit and offset
        params.push(limit);
        const limitParam = `$${params.length}`;
        params.push(offset);
        const offsetParam = `$${params.length}`;

        const sql = `
            SELECT
                c.domain,
                c.name,
                c.description,
                c.icon,
                c.brand_image_url,
                c.is_cloud AS "isCloud",
                c.supports_devices,
                c.metadata,
                COALESCE(ce.id IS NOT NULL, r.id IS NOT NULL, false) AS "isConfigured",
                r.status
            FROM integration_catalog c
            LEFT JOIN integrations r
                ON c.domain = r.domain
            LEFT JOIN config_entries ce
                ON c.domain = ce.integration_domain AND ce.status = 'loaded'
            ${whereClause}
            ORDER BY c.name ASC
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const result = await this.pool.query(sql, params);

        return {
            integrations: result.rows.map(row => ({
                id: row.domain,
                domain: row.domain,
                name: row.name,
                description: row.description,
                icon: row.icon,
                brandImageUrl: row.brand_image_url,
                supportsDeviceCreation: row.supports_devices,
                isCloud: row.isCloud,
                isConfigured: row.isConfigured,
                metadata: row.metadata
            }))
        };
    }


    async getSyncStatus(syncId?: string) {
        if (syncId) {
            // Get specific sync details
            const syncResult = await this.pool.query(
                `SELECT 
          id, sync_type, started_at, completed_at, status,
          total_integrations, new_integrations, updated_integrations,
          deleted_integrations, error_count, error_details, metadata
         FROM catalog_sync_history
         WHERE id = $1`,
                [syncId]
            );

            if (syncResult.rows.length === 0) {
                throw new NotFoundException('Sync not found');
            }

            const sync = syncResult.rows[0];

            // Get changes for this sync
            const changesResult = await this.pool.query(
                `SELECT domain, change_type, previous_version_hash, new_version_hash, 
                changed_fields, created_at
         FROM catalog_sync_changes
         WHERE sync_id = $1
         ORDER BY created_at DESC`,
                [syncId]
            );

            return {
                sync: {
                    id: sync.id,
                    type: sync.sync_type,
                    startedAt: sync.started_at,
                    completedAt: sync.completed_at,
                    status: sync.status,
                    total: sync.total_integrations,
                    new: sync.new_integrations,
                    updated: sync.updated_integrations,
                    deleted: sync.deleted_integrations,
                    errors: sync.error_count,
                    errorDetails: sync.error_details || [],
                    metadata: sync.metadata,
                },
                changes: changesResult.rows.map(row => ({
                    domain: row.domain,
                    changeType: row.change_type,
                    previousHash: row.previous_version_hash,
                    newHash: row.new_version_hash,
                    changedFields: row.changed_fields || [],
                    createdAt: row.created_at,
                })),
            };
        } else {
            // Get current sync status
            const currentSyncResult = await this.pool.query(
                `SELECT id, sync_type, started_at, completed_at, status,
                total_integrations, new_integrations, updated_integrations,
                deleted_integrations, error_count
         FROM catalog_sync_history
         WHERE status = 'running'
         ORDER BY started_at DESC
         LIMIT 1`
            );

            // Get last completed sync
            const lastSyncResult = await this.pool.query(
                `SELECT id, sync_type, started_at, completed_at, status,
                total_integrations, new_integrations, updated_integrations,
                deleted_integrations, error_count
         FROM catalog_sync_history
         WHERE status IN ('completed', 'failed')
         ORDER BY started_at DESC
         LIMIT 1`
            );

            return {
                current: currentSyncResult.rows.length > 0 ? {
                    syncId: currentSyncResult.rows[0].id,
                    startedAt: currentSyncResult.rows[0].started_at,
                    status: currentSyncResult.rows[0].status,
                    type: currentSyncResult.rows[0].sync_type,
                } : null,
                lastSync: lastSyncResult.rows.length > 0 ? {
                    syncId: lastSyncResult.rows[0].id,
                    startedAt: lastSyncResult.rows[0].started_at,
                    completedAt: lastSyncResult.rows[0].completed_at,
                    status: lastSyncResult.rows[0].status,
                    type: lastSyncResult.rows[0].sync_type,
                    total: lastSyncResult.rows[0].total_integrations,
                    new: lastSyncResult.rows[0].new_integrations,
                    updated: lastSyncResult.rows[0].updated_integrations,
                    deleted: lastSyncResult.rows[0].deleted_integrations,
                    errors: lastSyncResult.rows[0].error_count,
                } : null,
                syncInProgress: this.syncInProgress,
            };
        }
    }

    async triggerSync(options: { type?: 'full' | 'incremental' | 'manual'; dryRun?: boolean; force?: boolean }) {
        const type = options.type || 'incremental';

        if (this.syncInProgress && !options.force) {
            throw new ConflictException('Sync already in progress');
        }

        // Start sync asynchronously
        this.startSyncProcess(type, options.dryRun).catch(err => {
            this.logger.error(`Sync failed: ${err.message}`, err.stack);
        });

        // We can't return the ID immediately if we rely on async start, 
        // but typically we'd insert the record first.
        // For this implementation, let's just return a message saying it started.
        // A better approach in Nest is to insert the 'running' record here and return its ID.

        // Check if we can get the ID from the async process or pre-insert.
        // Let's rely on the method in startSyncProcess to insert it.
        // Wait slightly to ensure the ID is created? Or insert here.

        // Let's insert here to return the ID immediately.
        const result = await this.pool.query(
            `INSERT INTO catalog_sync_history (sync_type, status, started_at)
       VALUES ($1, 'running', now())
       RETURNING id`,
            [type]
        );
        const syncId = result.rows[0].id;
        this.currentSyncId = syncId;
        this.syncInProgress = true;

        // Trigger processing
        this.processSync(syncId, type, options.dryRun).catch(err => {
            this.logger.error(`Sync processing failed: ${err.message}`);
            // Fail sync in DB
            this.failSync(syncId, err);
        });

        return { status: 'started', syncId };
    }

    private async processSync(syncId: string, type: string, dryRun: boolean = false) {
        try {
            // Fetch integrations
            const haEntries = await this.fetchHAIntegrations();

            let result: SyncResult;
            if (type === 'incremental') {
                result = await this.performIncrementalSync(syncId, haEntries);
            } else {
                result = await this.performFullSync(syncId, haEntries);
            }

            await this.completeSync(syncId, result);
        } catch (error: any) {
            await this.failSync(syncId, error);
            throw error;
        }
    }

    // Placeholder for startSyncProcess if needed
    private async startSyncProcess(type: string, dryRun?: boolean) {
        // already handled in triggerSync
    }

    private async fetchHAIntegrations(): Promise<CatalogEntry[]> {
        const brandDomains = await this.githubService.fetchBrandImageDomains();
        const domains = await this.githubService.fetchHAIntegrationDomains();
        const catalogEntries: CatalogEntry[] = [];
        const RATE_LIMIT_DELAY = this.githubService.getRateLimitDelay();

        for (let i = 0; i < domains.length; i++) {
            const domain = domains[i];
            try {
                if (i > 0 && i % 10 === 0) {
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
                }

                const manifest = await this.githubService.fetchManifest(domain);
                if (!manifest) {
                    // Simplified handling for no manifest
                    const entry: CatalogEntry = {
                        domain,
                        name: domain.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
                        description: `Home Assistant ${domain} integration`,
                        supports_devices: false,
                        is_cloud: false,
                        icon: "mdi:puzzle"
                    };
                    if (brandDomains.has(domain)) {
                        entry.brand_image_url = this.githubService.getBrandImageUrl(domain, brandDomains);
                    }
                    catalogEntries.push(entry);
                    continue;
                }

                if (!manifest.domain) manifest.domain = domain;

                // Use static method if I make ManifestMapper static, or inject it.
                // I created `manifest-mapper.ts` exporting functions. 
                // I should import `mapManifestToCatalog` from there.
                // Wait, I created `ManifestMapper` as a utility file exporting `mapManifestToCatalog`.
                // Above I declared `private readonly manifestMapper = new ManifestMapper();` which assumes it's a class.
                // I should correct this import or usage.

                // I will use local import for mapManifestToCatalog
                const entry = mapManifestToCatalog(manifest, domain);
                if (brandDomains.has(entry.domain)) {
                    entry.brand_image_url = this.githubService.getBrandImageUrl(entry.domain, brandDomains);
                }
                catalogEntries.push(entry);

                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

            } catch (error: any) {
                this.logger.error(`Error fetching ${domain}: ${error.message}`);
            }
        }
        return catalogEntries;
    }

    private async performIncrementalSync(syncId: string, haEntries: CatalogEntry[]): Promise<SyncResult> {
        const startTime = Date.now();
        const result: SyncResult = {
            syncId,
            status: 'completed',
            total: haEntries.length,
            new: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            errorDetails: [],
            duration: 0,
        };

        // Detect changes... this requires `detectCatalogChanges` logic.
        // I can implement it here.

        // Get DB catalog
        const dbCatalog = await this.getDatabaseCatalog();

        // Logic from detectCatalogChanges
        const haDomains = new Set(haEntries.map(e => e.domain));
        const newEntries: CatalogEntry[] = [];
        const updatedEntries: any[] = [];
        const deletedEntries: CatalogEntry[] = [];

        for (const haEntry of haEntries) {
            const dbEntry = dbCatalog.get(haEntry.domain);
            if (!dbEntry) {
                newEntries.push(haEntry);
            } else {
                const newHash = calculateVersionHash(haEntry).hash;
                // compareIntegration logic
                if (dbEntry.versionHash !== newHash) {
                    const changedFields = detectChanges(dbEntry.versionHash || '', newHash, dbEntry.entry, haEntry);
                    updatedEntries.push({ domain: haEntry.domain, oldEntry: dbEntry.entry, newEntry: haEntry, changedFields });
                }
            }
        }

        for (const [domain, dbEntry] of dbCatalog.entries()) {
            if (!haDomains.has(domain)) {
                deletedEntries.push(dbEntry.entry);
            }
        }

        result.new = newEntries.length;
        result.updated = updatedEntries.length;
        result.deleted = deletedEntries.length;

        // Process New
        for (const entry of newEntries) {
            try {
                const hash = calculateVersionHash(entry).hash;
                await this.importIntegration(entry);
                await this.storeVersionHash(entry.domain, hash);
                await this.recordChange(syncId, entry.domain, 'new', null, hash);
            } catch (e: any) { result.errors++; result.errorDetails.push({ domain: entry.domain, error: e.message }); }
        }

        // Process Updated
        for (const change of updatedEntries) {
            try {
                const newHash = calculateVersionHash(change.newEntry).hash;
                const oldHash = dbCatalog.get(change.domain)?.versionHash || null;
                await this.updateIntegration(change.newEntry);
                await this.storeVersionHash(change.domain, newHash);
                await this.recordChange(syncId, change.domain, 'updated', oldHash, newHash, change.changedFields);
            } catch (e: any) { result.errors++; result.errorDetails.push({ domain: change.domain, error: e.message }); }
        }

        // Process Deleted
        for (const entry of deletedEntries) {
            try {
                const oldHash = dbCatalog.get(entry.domain)?.versionHash || null;
                await this.markIntegrationDeprecated(entry.domain);
                await this.recordChange(syncId, entry.domain, 'deprecated', oldHash, null);
            } catch (e: any) { result.errors++; result.errorDetails.push({ domain: entry.domain, error: e.message }); }
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    private async performFullSync(syncId: string, haEntries: CatalogEntry[]): Promise<SyncResult> {
        // Similar to incremental but processes all
        const startTime = Date.now();
        const result: SyncResult = {
            syncId,
            status: 'completed',
            total: haEntries.length,
            new: 0,
            updated: 0,
            deleted: 0,
            errors: 0,
            errorDetails: [],
            duration: 0,
        };

        // For full sync, we just upsert everything basically
        // But we still want to track what actually changed for stats
        // So we can reuse the incremental logic or check DB for each

        // Let's implement simpler loop
        for (const entry of haEntries) {
            try {
                const hash = calculateVersionHash(entry).hash;
                const existing = await this.pool.query('SELECT version_hash FROM integration_catalog WHERE domain = $1', [entry.domain]);

                if (existing.rows.length === 0) {
                    await this.importIntegration(entry);
                    await this.storeVersionHash(entry.domain, hash);
                    await this.recordChange(syncId, entry.domain, 'new', null, hash);
                    result.new++;
                } else {
                    const oldHash = existing.rows[0].version_hash;
                    if (oldHash !== hash) {
                        await this.updateIntegration(entry);
                        await this.storeVersionHash(entry.domain, hash);
                        await this.recordChange(syncId, entry.domain, 'updated', oldHash, hash, ['full_sync']);
                        result.updated++;
                    } else {
                        await this.storeVersionHash(entry.domain, hash); // Update last_synced_at
                    }
                }
            } catch (e: any) {
                result.errors++;
                result.errorDetails.push({ domain: entry.domain, error: e.message });
            }
        }

        // Deprecate missing
        const haDomains = new Set(haEntries.map(e => e.domain));
        const allDomains = await this.pool.query("SELECT domain FROM integration_catalog WHERE sync_status != 'deprecated'");
        for (const row of allDomains.rows) {
            if (!haDomains.has(row.domain)) {
                await this.markIntegrationDeprecated(row.domain);
                result.deleted++;
            }
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    private async getDatabaseCatalog() {
        const result = await this.pool.query(`
        SELECT domain, name, description, icon, supports_devices, is_cloud,
        documentation_url, flow_type, flow_config, handler_class, metadata,
        brand_image_url, version_hash
        FROM integration_catalog
        WHERE sync_status != 'deprecated'
      `);

        const map = new Map<string, { entry: CatalogEntry; versionHash: string | null }>();
        for (const row of result.rows) {
            map.set(row.domain, {
                entry: {
                    domain: row.domain,
                    name: row.name,
                    description: row.description,
                    icon: row.icon,
                    supports_devices: row.supports_devices,
                    is_cloud: row.is_cloud,
                    documentation_url: row.documentation_url,
                    flow_type: row.flow_type,
                    flow_config: row.flow_config,
                    handler_class: row.handler_class,
                    metadata: row.metadata,
                    brand_image_url: row.brand_image_url
                },
                versionHash: row.version_hash
            });
        }
        return map;
    }

    async importCustomIntegration(entry: CatalogEntry) {
        return this.importIntegration(entry);
    }

    // Database helper methods
    private async importIntegration(entry: CatalogEntry) {
        await this.pool.query(
            `INSERT INTO integration_catalog 
         (domain, name, description, icon, supports_devices, is_cloud, documentation_url, brand_image_url,
          flow_type, flow_config, handler_class, metadata, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'synced')
         ON CONFLICT (domain) DO UPDATE
         SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon,
             supports_devices = EXCLUDED.supports_devices, is_cloud = EXCLUDED.is_cloud,
             documentation_url = EXCLUDED.documentation_url, brand_image_url = EXCLUDED.brand_image_url,
             flow_type = EXCLUDED.flow_type, flow_config = EXCLUDED.flow_config,
             handler_class = EXCLUDED.handler_class, metadata = EXCLUDED.metadata,
             sync_status = 'synced', updated_at = now()`,
            [
                entry.domain, entry.name, entry.description, entry.icon, entry.supports_devices, entry.is_cloud,
                entry.documentation_url, entry.brand_image_url, entry.flow_type || 'manual',
                entry.flow_config ? JSON.stringify(entry.flow_config) : null,
                entry.handler_class,
                entry.metadata ? JSON.stringify(entry.metadata) : null
            ]
        );
    }

    private async updateIntegration(entry: CatalogEntry) {
        // Same logic as import really, but explicit update
        await this.importIntegration(entry);
    }

    private async markIntegrationDeprecated(domain: string) {
        await this.pool.query(
            `UPDATE integration_catalog SET sync_status = 'deprecated', updated_at = now() WHERE domain = $1`,
            [domain]
        );
    }

    private async storeVersionHash(domain: string, hash: string) {
        await this.pool.query(
            `UPDATE integration_catalog SET version_hash = $1, last_synced_at = now(), sync_status = 'synced' WHERE domain = $2`,
            [hash, domain]
        );
    }

    private async recordChange(syncId: string, domain: string, changeType: string, prevHash: string | null, newHash: string | null, changedFields?: string[]) {
        await this.pool.query(
            `INSERT INTO catalog_sync_changes (sync_id, domain, change_type, previous_version_hash, new_version_hash, changed_fields)
         VALUES ($1, $2, $3, $4, $5, $6)`,
            [syncId, domain, changeType, prevHash, newHash, changedFields ? JSON.stringify(changedFields) : null]
        );
    }

    private async completeSync(syncId: string, result: SyncResult) {
        await this.pool.query(
            `UPDATE catalog_sync_history
         SET status = $1, completed_at = now(),
             total_integrations = $2, new_integrations = $3, updated_integrations = $4,
             deleted_integrations = $5, error_count = $6, error_details = $7
         WHERE id = $8`,
            [result.status, result.total, result.new, result.updated, result.deleted, result.errors, JSON.stringify(result.errorDetails), syncId]
        );
        this.syncInProgress = false;
        this.currentSyncId = null;
    }

    private async failSync(syncId: string, error: Error) {
        await this.pool.query(
            `UPDATE catalog_sync_history SET status = 'failed', completed_at = now(), error_details = $1 WHERE id = $2`,
            [JSON.stringify([{ domain: 'system', error: error.message }]), syncId]
        );
        this.syncInProgress = false;
        this.currentSyncId = null;
    }
}
