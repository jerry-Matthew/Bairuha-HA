/**
 * Rollback Service
 * 
 * Provides snapshot and rollback functionality for catalog syncs.
 * Stores snapshots before sync and allows rollback on failure.
 */

import { query, transaction } from '../db';
import { CatalogEntry } from './version-tracker';

/**
 * Store snapshot of catalog before sync (for rollback)
 * Snapshot is stored in catalog_sync_history.metadata as JSONB
 */
export async function createSnapshot(syncId: string): Promise<void> {
  // Get all current catalog entries
  const result = await query<{
    domain: string;
    name: string;
    description: string | null;
    icon: string | null;
    supports_devices: boolean;
    is_cloud: boolean;
    documentation_url: string | null;
    flow_type: string | null;
    flow_config: any;
    handler_class: string | null;
    metadata: any;
    brand_image_url: string | null;
    version_hash: string | null;
  }>(
    `SELECT 
      domain, name, description, icon, supports_devices, is_cloud,
      documentation_url, flow_type, flow_config, handler_class, metadata,
      brand_image_url, version_hash
     FROM integration_catalog
     WHERE sync_status != 'deprecated'`
  );

  const snapshot: CatalogEntry[] = result.rows.map(row => ({
    domain: row.domain,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    supports_devices: row.supports_devices,
    is_cloud: row.is_cloud,
    documentation_url: row.documentation_url || undefined,
    flow_type: row.flow_type || undefined,
    flow_config: row.flow_config,
    handler_class: row.handler_class || undefined,
    metadata: row.metadata,
    brand_image_url: row.brand_image_url || undefined,
  }));

  // Store snapshot in sync history metadata
  await query(
    `UPDATE catalog_sync_history
     SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('snapshot', $1::jsonb)
     WHERE id = $2`,
    [JSON.stringify(snapshot), syncId]
  );
}

/**
 * Get snapshot for a sync
 */
export async function getSnapshot(syncId: string): Promise<CatalogEntry[] | null> {
  const result = await query<{ metadata: any }>(
    'SELECT metadata FROM catalog_sync_history WHERE id = $1',
    [syncId]
  );

  if (result.rows.length === 0 || !result.rows[0].metadata?.snapshot) {
    return null;
  }

  return result.rows[0].metadata.snapshot as CatalogEntry[];
}

/**
 * Rollback sync to previous state
 */
export async function rollbackSync(syncId: string): Promise<void> {
  const snapshot = await getSnapshot(syncId);

  if (!snapshot) {
    throw new Error(`No snapshot found for sync ${syncId}`);
  }

  // Get current sync changes to reverse
  const changes = await query<{
    domain: string;
    change_type: string;
    previous_version_hash: string | null;
  }>(
    'SELECT domain, change_type, previous_version_hash FROM catalog_sync_changes WHERE sync_id = $1',
    [syncId]
  );

  await transaction(async (client) => {
    // Restore entries from snapshot
    for (const entry of snapshot) {
      await client.query(
        `INSERT INTO integration_catalog 
         (domain, name, description, icon, supports_devices, is_cloud, documentation_url, brand_image_url,
          flow_type, flow_config, handler_class, metadata, version_hash, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'synced')
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
             version_hash = EXCLUDED.version_hash,
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
          // Get version hash from snapshot metadata if available
          null, // Will be recalculated on next sync
        ]
      );
    }

    // Delete entries that were added in this sync
    for (const change of changes.rows) {
      if (change.change_type === 'new') {
        await client.query('DELETE FROM integration_catalog WHERE domain = $1', [change.domain]);
      } else if (change.change_type === 'deprecated') {
        // Restore deprecated entries
        const snapshotEntry = snapshot.find(e => e.domain === change.domain);
        if (snapshotEntry) {
          await client.query(
            `UPDATE integration_catalog 
             SET sync_status = 'synced', updated_at = now()
             WHERE domain = $1`,
            [change.domain]
          );
        }
      }
    }
  });

  // Mark sync as cancelled
  await query(
    `UPDATE catalog_sync_history
     SET status = 'cancelled', completed_at = now()
     WHERE id = $1`,
    [syncId]
  );
}

/**
 * Clean up old snapshots (keep last N)
 */
export async function cleanupSnapshots(keepCount: number = 10): Promise<void> {
  // Get sync IDs ordered by started_at DESC, skip first keepCount
  const result = await query<{ id: string }>(
    `SELECT id FROM catalog_sync_history
     WHERE metadata->>'snapshot' IS NOT NULL
     ORDER BY started_at DESC
     OFFSET $1`,
    [keepCount]
  );

  // Remove snapshots from old syncs
  for (const row of result.rows) {
    await query(
      `UPDATE catalog_sync_history
       SET metadata = metadata - 'snapshot'
       WHERE id = $1`,
      [row.id]
    );
  }
}
