/**
 * Catalog Sync Service
 * 
 * Main orchestration service for syncing integration catalog with Home Assistant.
 * Supports full sync, incremental sync, and manual sync operations.
 */

import { query, transaction } from '../db';
import { CatalogEntry, calculateVersionHash, storeVersionHash } from './version-tracker';
import { ChangeDetectionResult, detectCatalogChanges } from './change-detector';

export interface SyncOptions {
  type: 'full' | 'incremental' | 'manual';
  dryRun?: boolean;
  force?: boolean; // Force sync even if recently synced
}

export interface SyncResult {
  syncId: string;
  status: 'completed' | 'failed' | 'cancelled';
  total: number;
  new: number;
  updated: number;
  deleted: number;
  errors: number;
  errorDetails: Array<{ domain: string; error: string }>;
  duration: number; // milliseconds
}

// In-memory lock to prevent concurrent syncs
let syncInProgress = false;
let currentSyncId: string | null = null;

// Export reset function for testing
export function __resetSyncState() {
  syncInProgress = false;
  currentSyncId = null;
}

/**
 * Record sync start
 */
export async function startSync(type: 'full' | 'incremental' | 'manual'): Promise<string> {
  // Check if sync already in progress
  if (syncInProgress) {
    throw new Error('Sync already in progress');
  }

  syncInProgress = true;

  const result = await query<{ id: string }>(
    `INSERT INTO catalog_sync_history (sync_type, status, started_at)
     VALUES ($1, 'running', now())
     RETURNING id`,
    [type]
  );

  const syncId = result.rows[0].id;
  currentSyncId = syncId;

  return syncId;
}

/**
 * Record sync completion
 */
export async function completeSync(syncId: string, result: SyncResult): Promise<void> {
  await query(
    `UPDATE catalog_sync_history
     SET status = $1,
         completed_at = now(),
         total_integrations = $2,
         new_integrations = $3,
         updated_integrations = $4,
         deleted_integrations = $5,
         error_count = $6,
         error_details = $7
     WHERE id = $8`,
    [
      result.status,
      result.total,
      result.new,
      result.updated,
      result.deleted,
      result.errors,
      JSON.stringify(result.errorDetails),
      syncId,
    ]
  );

  syncInProgress = false;
  currentSyncId = null;
}

/**
 * Record sync failure
 */
export async function failSync(
  syncId: string,
  error: Error,
  partialResult?: Partial<SyncResult>
): Promise<void> {
  const errorDetails = partialResult?.errorDetails || [{ domain: 'system', error: error.message }];

  await query(
    `UPDATE catalog_sync_history
     SET status = 'failed',
         completed_at = now(),
         error_count = $1,
         error_details = $2,
         total_integrations = COALESCE($3, 0),
         new_integrations = COALESCE($4, 0),
         updated_integrations = COALESCE($5, 0),
         deleted_integrations = COALESCE($6, 0)
     WHERE id = $7`,
    [
      errorDetails.length,
      JSON.stringify(errorDetails),
      partialResult?.total || 0,
      partialResult?.new || 0,
      partialResult?.updated || 0,
      partialResult?.deleted || 0,
      syncId,
    ]
  );

  syncInProgress = false;
  currentSyncId = null;
}

/**
 * Record a change for a specific integration
 */
export async function recordChange(
  syncId: string,
  domain: string,
  changeType: 'new' | 'updated' | 'deleted' | 'deprecated',
  previousHash?: string | null,
  newHash?: string | null,
  changedFields?: string[]
): Promise<void> {
  await query(
    `INSERT INTO catalog_sync_changes (sync_id, domain, change_type, previous_version_hash, new_version_hash, changed_fields)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      syncId,
      domain,
      changeType,
      previousHash || null,
      newHash || null,
      changedFields ? JSON.stringify(changedFields) : null,
    ]
  );
}

/**
 * Import a single integration entry
 */
async function importIntegration(entry: CatalogEntry): Promise<void> {
  await query(
    `INSERT INTO integration_catalog 
     (domain, name, description, icon, supports_devices, is_cloud, documentation_url, brand_image_url,
      flow_type, flow_config, handler_class, metadata, sync_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'synced')
     ON CONFLICT (domain) DO UPDATE
     SET name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         supports_devices = EXCLUDED.supports_devices,
         is_cloud = EXCLUDED.is_cloud,
         documentation_url = EXCLUDED.documentation_url,
         brand_image_url = EXCLUDED.brand_image_url,
         flow_type = EXCLUDED.flow_type,
         flow_config = EXCLUDED.flow_config,
         handler_class = EXCLUDED.handler_class,
         metadata = EXCLUDED.metadata,
         sync_status = 'synced',
         updated_at = now()`,
    [
      entry.domain,
      entry.name,
      entry.description || null,
      entry.icon || null,
      entry.supports_devices,
      entry.is_cloud,
      entry.documentation_url || null,
      entry.brand_image_url || null,
      entry.flow_type || 'manual',
      entry.flow_config ? JSON.stringify(entry.flow_config) : null,
      entry.handler_class || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );
}

/**
 * Update an existing integration entry
 */
async function updateIntegration(entry: CatalogEntry): Promise<void> {
  await query(
    `UPDATE integration_catalog 
     SET name = $2, description = $3, icon = $4, 
         supports_devices = $5, is_cloud = $6, documentation_url = $7, brand_image_url = $8,
         flow_type = $9, flow_config = $10, handler_class = $11, metadata = $12,
         sync_status = 'synced', updated_at = now()
     WHERE domain = $1`,
    [
      entry.domain,
      entry.name,
      entry.description || null,
      entry.icon || null,
      entry.supports_devices,
      entry.is_cloud,
      entry.documentation_url || null,
      entry.brand_image_url || null,
      entry.flow_type || 'manual',
      entry.flow_config ? JSON.stringify(entry.flow_config) : null,
      entry.handler_class || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );
}

/**
 * Mark integration as deprecated
 */
async function markIntegrationDeprecated(domain: string): Promise<void> {
  await query(
    `UPDATE integration_catalog 
     SET sync_status = 'deprecated', updated_at = now()
     WHERE domain = $1`,
    [domain]
  );
}

/**
 * Perform incremental sync (only changed integrations)
 * This function expects haEntries to be provided (fetched externally)
 */
export async function performIncrementalSync(
  syncId: string,
  haEntries: CatalogEntry[]
): Promise<SyncResult> {
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

  try {
    // Detect changes
    const changes = await detectCatalogChanges(haEntries);

    result.new = changes.new.length;
    result.updated = changes.updated.length;
    result.deleted = changes.deleted.length;

    // Process new integrations
    for (const entry of changes.new) {
      try {
        const hash = calculateVersionHash(entry).hash;
        await importIntegration(entry);
        await storeVersionHash(entry.domain, hash);
        await recordChange(syncId, entry.domain, 'new', null, hash);
      } catch (error: any) {
        result.errors++;
        result.errorDetails.push({ domain: entry.domain, error: error.message });
      }
    }

    // Process updated integrations
    for (const change of changes.updated) {
      try {
        const newHash = calculateVersionHash(change.newEntry).hash;
        const oldHash = await query<{ version_hash: string | null }>(
          'SELECT version_hash FROM integration_catalog WHERE domain = $1',
          [change.domain]
        ).then(r => r.rows[0]?.version_hash || null);

        await updateIntegration(change.newEntry);
        await storeVersionHash(change.domain, newHash);
        await recordChange(
          syncId,
          change.domain,
          'updated',
          oldHash,
          newHash,
          change.changedFields
        );
      } catch (error: any) {
        result.errors++;
        result.errorDetails.push({ domain: change.domain, error: error.message });
      }
    }

    // Process deleted integrations (mark as deprecated)
    for (const entry of changes.deleted) {
      try {
        const oldHash = await query<{ version_hash: string | null }>(
          'SELECT version_hash FROM integration_catalog WHERE domain = $1',
          [entry.domain]
        ).then(r => r.rows[0]?.version_hash || null);

        await markIntegrationDeprecated(entry.domain);
        await recordChange(syncId, entry.domain, 'deprecated', oldHash, null);
      } catch (error: any) {
        result.errors++;
        result.errorDetails.push({ domain: entry.domain, error: error.message });
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  } catch (error: any) {
    result.status = 'failed';
    result.errors++;
    result.errorDetails.push({ domain: 'system', error: error.message });
    result.duration = Date.now() - startTime;
    throw error;
  }
}

/**
 * Perform full sync (all integrations)
 * This function expects haEntries to be provided (fetched externally)
 */
export async function performFullSync(
  syncId: string,
  haEntries: CatalogEntry[]
): Promise<SyncResult> {
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

  try {
    // Process all entries (treat as new or updated)
    for (const entry of haEntries) {
      try {
        const hash = calculateVersionHash(entry).hash;
        const existing = await query<{ domain: string; version_hash: string | null }>(
          'SELECT domain, version_hash FROM integration_catalog WHERE domain = $1',
          [entry.domain]
        );

        if (existing.rows.length === 0) {
          // New integration
          await importIntegration(entry);
          await storeVersionHash(entry.domain, hash);
          await recordChange(syncId, entry.domain, 'new', null, hash);
          result.new++;
        } else {
          // Check if updated
          const oldHash = existing.rows[0].version_hash;
          if (oldHash !== hash) {
            await updateIntegration(entry);
            await storeVersionHash(entry.domain, hash);
            await recordChange(syncId, entry.domain, 'updated', oldHash, hash, ['full_sync']);
            result.updated++;
          } else {
            // Unchanged, just update sync timestamp
            await storeVersionHash(entry.domain, hash);
          }
        }
      } catch (error: any) {
        result.errors++;
        result.errorDetails.push({ domain: entry.domain, error: error.message });
      }
    }

    // Mark integrations not in HA as deprecated
    const haDomains = new Set(haEntries.map(e => e.domain));
    const allDbDomains = await query<{ domain: string }>(
      "SELECT domain FROM integration_catalog WHERE sync_status != 'deprecated'"
    );

    for (const row of allDbDomains.rows) {
      if (!haDomains.has(row.domain)) {
        try {
          const oldHash = await query<{ version_hash: string | null }>(
            'SELECT version_hash FROM integration_catalog WHERE domain = $1',
            [row.domain]
          ).then(r => r.rows[0]?.version_hash || null);

          await markIntegrationDeprecated(row.domain);
          await recordChange(syncId, row.domain, 'deprecated', oldHash, null);
          result.deleted++;
        } catch (error: any) {
          result.errors++;
          result.errorDetails.push({ domain: row.domain, error: error.message });
        }
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  } catch (error: any) {
    result.status = 'failed';
    result.errors++;
    result.errorDetails.push({ domain: 'system', error: error.message });
    result.duration = Date.now() - startTime;
    throw error;
  }
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return syncInProgress;
}

/**
 * Get current sync ID
 */
export function getCurrentSyncId(): string | null {
  return currentSyncId;
}
