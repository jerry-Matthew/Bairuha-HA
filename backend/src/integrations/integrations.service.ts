import { Injectable, ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { GithubService } from './github.service';
import { mapManifestToCatalog, CatalogEntry } from './manifest-mapper';
import { calculateVersionHash, detectChanges } from './utils/hashing.utils';
import { Integration } from './entities/integration.entity';
import { IntegrationCatalog } from './entities/integration-catalog.entity';
import { CatalogSyncHistory } from './entities/catalog-sync-history.entity';
import { CatalogSyncChange } from './entities/catalog-sync-change.entity';
import { ConfigEntry } from './entities/config-entry.entity';

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
        @InjectRepository(Integration)
        private readonly integrationRepository: Repository<Integration>,
        @InjectRepository(IntegrationCatalog)
        private readonly catalogRepository: Repository<IntegrationCatalog>,
        @InjectRepository(CatalogSyncHistory)
        private readonly syncHistoryRepository: Repository<CatalogSyncHistory>,
        @InjectRepository(CatalogSyncChange)
        private readonly syncChangeRepository: Repository<CatalogSyncChange>,
        @InjectRepository(ConfigEntry)
        private readonly configEntryRepository: Repository<ConfigEntry>,
        private readonly githubService: GithubService,
    ) { }

    async getIntegrations(query?: string, limit: number = 50, offset: number = 0) {
        const qb = this.catalogRepository
            .createQueryBuilder('c')
            .leftJoin('integrations', 'r', 'c.domain = r.domain')
            .leftJoin(
                'config_entries',
                'ce',
                "c.domain = ce.integration_domain AND ce.status = 'loaded'",
            )
            .select([
                'c.domain',
                'c.name',
                'c.description',
                'c.icon',
                'c.brand_image_url',
                'c.is_cloud',
                'c.supports_devices',
                'c.metadata',
                'r.status as status',
                'COALESCE(ce.id IS NOT NULL, r.id IS NOT NULL, false) AS "isConfigured"',
            ]);

        if (query) {
            qb.where('LOWER(c.name) LIKE :query OR LOWER(c.domain) LIKE :query', {
                query: `%${query.toLowerCase()}%`,
            });
        }

        qb.orderBy('c.name', 'ASC').limit(limit).offset(offset);

        const rawResults = await qb.getRawMany();

        return {
            integrations: rawResults.map((row) => ({
                id: row.c_domain,
                domain: row.c_domain,
                name: row.c_name,
                description: row.c_description,
                icon: row.c_icon,
                brandImageUrl: row.c_brand_image_url,
                supportsDeviceCreation: row.c_supports_devices,
                isCloud: row.c_is_cloud,
                isConfigured: row.isConfigured,
                metadata: row.c_metadata,
            })),
        };
    }


    async getSyncStatus(syncId?: string) {
        if (syncId) {
            // Get specific sync details
            const sync = await this.syncHistoryRepository.findOne({
                where: { id: syncId },
                relations: ['changes'],
                order: {
                    changes: { createdAt: 'DESC' },
                },
            });

            if (!sync) {
                throw new NotFoundException('Sync not found');
            }

            return {
                sync: {
                    id: sync.id,
                    type: sync.syncType,
                    startedAt: sync.startedAt,
                    completedAt: sync.completedAt,
                    status: sync.status,
                    total: sync.totalIntegrations,
                    new: sync.newIntegrations,
                    updated: sync.updatedIntegrations,
                    deleted: sync.deletedIntegrations,
                    errors: sync.errorCount,
                    errorDetails: sync.errorDetails || [],
                    metadata: sync.metadata,
                },
                changes: sync.changes.map((row) => ({
                    domain: row.domain,
                    changeType: row.changeType,
                    previousHash: row.previousVersionHash,
                    newHash: row.newVersionHash,
                    changedFields: row.changedFields || [],
                    createdAt: row.createdAt,
                })),
            };
        } else {
            // Get current sync status
            const currentSync = await this.syncHistoryRepository.findOne({
                where: { status: 'running' },
                order: { startedAt: 'DESC' },
            });

            // Get last completed sync
            const lastSync = await this.syncHistoryRepository.findOne({
                where: [
                    { status: 'completed' },
                    { status: 'failed' },
                ],
                order: { startedAt: 'DESC' },
            });

            return {
                current: currentSync ? {
                    syncId: currentSync.id,
                    startedAt: currentSync.startedAt,
                    status: currentSync.status,
                    type: currentSync.syncType,
                } : null,
                lastSync: lastSync ? {
                    syncId: lastSync.id,
                    startedAt: lastSync.startedAt,
                    completedAt: lastSync.completedAt,
                    status: lastSync.status,
                    type: lastSync.syncType,
                    total: lastSync.totalIntegrations,
                    new: lastSync.newIntegrations,
                    updated: lastSync.updatedIntegrations,
                    deleted: lastSync.deletedIntegrations,
                    errors: lastSync.errorCount,
                } : null,
                syncInProgress: this.syncInProgress,
            };
        }
    }

    async triggerSync(options: { type?: 'full' | 'incremental' | 'manual'; dryRun?: boolean; force?: boolean }) {
        const type = (options.type || 'incremental') as 'full' | 'incremental' | 'manual';

        if (this.syncInProgress && !options.force) {
            throw new ConflictException('Sync already in progress');
        }

        // Insert sync record
        const sync = await this.syncHistoryRepository.save({
            syncType: type,
            status: 'running',
            startedAt: new Date(),
        });

        const syncId = sync.id;
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

        for (const entry of haEntries) {
            try {
                const hash = calculateVersionHash(entry).hash;
                const existing = await this.catalogRepository.findOne({
                    where: { domain: entry.domain },
                    select: ['versionHash'],
                });

                if (!existing) {
                    await this.importIntegration(entry);
                    await this.storeVersionHash(entry.domain, hash);
                    await this.recordChange(syncId, entry.domain, 'new', null, hash);
                    result.new++;
                } else {
                    const oldHash = existing.versionHash;
                    if (oldHash !== hash) {
                        await this.updateIntegration(entry);
                        await this.storeVersionHash(entry.domain, hash);
                        await this.recordChange(syncId, entry.domain, 'updated', oldHash || null, hash, ['full_sync']);
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
        const haDomains = new Set(haEntries.map((e) => e.domain));
        const allActive = await this.catalogRepository.find({
            where: { syncStatus: Not('deprecated' as any) },
            select: ['domain'],
        });

        for (const item of allActive) {
            if (!haDomains.has(item.domain)) {
                await this.markIntegrationDeprecated(item.domain);
                result.deleted++;
            }
        }

        result.duration = Date.now() - startTime;
        return result;
    }

    private async getDatabaseCatalog() {
        const results = await this.catalogRepository.find({
            where: { syncStatus: Not('deprecated' as any) },
        });

        const map = new Map<string, { entry: CatalogEntry; versionHash: string | null }>();
        for (const row of results) {
            map.set(row.domain, {
                entry: {
                    domain: row.domain,
                    name: row.name,
                    description: row.description,
                    icon: row.icon,
                    supports_devices: row.supportsDevices,
                    is_cloud: row.isCloud,
                    documentation_url: row.documentationUrl,
                    flow_type: row.flowType as any,
                    flow_config: row.flowConfig,
                    handler_class: row.handlerClass,
                    metadata: row.metadata,
                    brand_image_url: row.brandImageUrl,
                },
                versionHash: row.versionHash || null,
            });
        }
        return map;
    }

    async importCustomIntegration(entry: CatalogEntry) {
        return this.importIntegration(entry);
    }

    // Database helper methods
    private async importIntegration(entry: CatalogEntry) {
        await this.catalogRepository.save({
            domain: entry.domain,
            name: entry.name,
            description: entry.description,
            icon: entry.icon,
            supportsDevices: entry.supports_devices,
            isCloud: entry.is_cloud,
            documentationUrl: entry.documentation_url,
            brandImageUrl: entry.brand_image_url,
            flowType: entry.flow_type || 'manual',
            flowConfig: entry.flow_config,
            handlerClass: entry.handler_class,
            metadata: entry.metadata,
            syncStatus: 'synced',
        });
    }

    private async updateIntegration(entry: CatalogEntry) {
        // Same logic as import really, but explicit update
        await this.importIntegration(entry);
    }

    private async markIntegrationDeprecated(domain: string) {
        await this.catalogRepository.update(domain, {
            syncStatus: 'deprecated',
        });
    }

    private async storeVersionHash(domain: string, hash: string) {
        await this.catalogRepository.update(domain, {
            versionHash: hash,
            lastSyncedAt: new Date(),
            syncStatus: 'synced',
        });
    }

    private async recordChange(
        syncId: string,
        domain: string,
        changeType: 'new' | 'updated' | 'deleted' | 'deprecated',
        prevHash: string | null,
        newHash: string | null,
        changedFields?: string[],
    ) {
        await this.syncChangeRepository.save({
            syncId,
            domain,
            changeType,
            previousVersionHash: prevHash || undefined,
            newVersionHash: newHash || undefined,
            changedFields,
        });
    }

    private async completeSync(syncId: string, result: SyncResult) {
        await this.syncHistoryRepository.update(syncId, {
            status: result.status,
            completedAt: new Date(),
            totalIntegrations: result.total,
            newIntegrations: result.new,
            updatedIntegrations: result.updated,
            deletedIntegrations: result.deleted,
            errorCount: result.errors,
            errorDetails: result.errorDetails,
        });
        this.syncInProgress = false;
        this.currentSyncId = null;
    }

    private async failSync(syncId: string, error: Error) {
        await this.syncHistoryRepository.update(syncId, {
            status: 'failed',
            completedAt: new Date(),
            errorDetails: [{ domain: 'system', error: error.message }],
        });
        this.syncInProgress = false;
        this.currentSyncId = null;
    }
}
