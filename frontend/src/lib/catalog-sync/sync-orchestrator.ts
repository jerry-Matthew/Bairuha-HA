/**
 * Catalog Sync Orchestrator
 * 
 * Main entry point for catalog sync operations.
 * Coordinates fetching from GitHub, change detection, and sync execution.
 */

import { SyncOptions, SyncResult, startSync, completeSync, failSync, performIncrementalSync, performFullSync, isSyncInProgress } from './sync-service';
import { createSnapshot, rollbackSync } from './rollback-service';
import { notifyCatalogUpdates } from './notification-service';
import { CatalogEntry } from './version-tracker';
import { detectCatalogChanges } from './change-detector';

// Import GitHub fetching functions from import script
// We'll need to refactor these to be reusable
// For now, we'll create a simplified version that uses the same logic

/**
 * Main sync orchestration function
 * This is the main entry point for all sync operations
 */
export async function syncCatalog(options: SyncOptions): Promise<SyncResult> {
  // Check if sync already in progress
  if (isSyncInProgress() && !options.force) {
    throw new Error('Sync already in progress. Use force=true to override.');
  }

  const syncId = await startSync(options.type);
  let snapshotCreated = false;

  try {
    // Create snapshot for rollback
    await createSnapshot(syncId);
    snapshotCreated = true;

    // Fetch integrations from Home Assistant GitHub
    // Note: This is a placeholder - we need to integrate with the import script's GitHub fetching logic
    const haEntries = await fetchHAIntegrations();

    // Perform sync based on type
    let result: SyncResult;
    if (options.type === 'incremental') {
      result = await performIncrementalSync(syncId, haEntries);
    } else {
      result = await performFullSync(syncId, haEntries);
    }

    // Detect changes for notifications
    const changes = await detectCatalogChanges(haEntries);

    // Send notifications
    if (!options.dryRun) {
      await notifyCatalogUpdates(changes, syncId);
    }

    // Complete sync
    await completeSync(syncId, result);

    return result;
  } catch (error: any) {
    // Rollback on error if snapshot was created
    if (snapshotCreated) {
      try {
        await rollbackSync(syncId);
      } catch (rollbackError: any) {
        console.error(`[Catalog Sync] Rollback failed:`, rollbackError);
      }
    }

    await failSync(syncId, error);
    throw error;
  }
}

/**
 * Fetch integrations from Home Assistant GitHub
 */
async function fetchHAIntegrations(): Promise<CatalogEntry[]> {
  const {
    fetchHAIntegrationDomains,
    fetchManifest,
    fetchBrandImageDomains,
    getBrandImageUrl,
    RATE_LIMIT_DELAY,
  } = await import('./github-client');
  const { mapManifestToCatalog } = await import('./manifest-mapper');

  function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fetch brand image domains
  const brandDomains = await fetchBrandImageDomains();

  // Fetch integration domains
  const domains = await fetchHAIntegrationDomains();

  const catalogEntries: CatalogEntry[] = [];

  // Fetch manifests with rate limiting
  for (let i = 0; i < domains.length; i++) {
    const domain = domains[i];
    
    try {
      // Rate limiting
      if (i > 0 && i % 10 === 0) {
        await sleep(RATE_LIMIT_DELAY);
      }

      const manifest = await fetchManifest(domain);

      if (!manifest) {
        // No manifest.json - create basic entry
        const entry: CatalogEntry = {
          domain,
          name: domain.split("_").map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(" "),
          description: `Home Assistant ${domain} integration`,
          icon: "mdi:puzzle",
          supports_devices: false,
          is_cloud: false,
          flow_type: 'none',
        };
        const brandImageUrl = getBrandImageUrl(domain, brandDomains);
        if (brandImageUrl) {
          entry.brand_image_url = brandImageUrl;
        }
        catalogEntries.push(entry);
        continue;
      }

      // Validate manifest has domain
      if (!manifest.domain) {
        manifest.domain = domain;
      }

      const entry = mapManifestToCatalog(manifest, domain);
      const brandImageUrl = getBrandImageUrl(entry.domain, brandDomains);
      if (brandImageUrl) {
        entry.brand_image_url = brandImageUrl;
      }
      catalogEntries.push(entry);

      // Small delay between requests
      await sleep(RATE_LIMIT_DELAY);
    } catch (error: any) {
      console.error(`Error fetching ${domain}:`, error.message);
      // Continue with other domains
    }
  }

  return catalogEntries;
}

/**
 * Export sync status for external use
 */
export { isSyncInProgress } from './sync-service';
