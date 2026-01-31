/**
 * Change Detection Service
 * 
 * Detects changes between Home Assistant catalog and database catalog
 * by comparing version hashes and identifying new, updated, and deleted integrations.
 */

import { query } from '../db';
import { CatalogEntry, calculateVersionHash, detectChanges, getVersionHashesForDomains } from './version-tracker';

export interface ChangeDetectionResult {
  new: CatalogEntry[]; // Integrations not in database
  updated: Array<{
    domain: string;
    oldEntry: CatalogEntry;
    newEntry: CatalogEntry;
    changedFields: string[];
  }>;
  deleted: CatalogEntry[]; // Integrations in database but not in HA anymore
  unchanged: string[]; // Domain names that haven't changed
}

/**
 * Get all integrations from database with version hashes
 */
export async function getDatabaseCatalog(): Promise<
  Map<string, { entry: CatalogEntry; versionHash: string | null }>
> {
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

  const map = new Map<string, { entry: CatalogEntry; versionHash: string | null }>();

  for (const row of result.rows) {
    map.set(row.domain, {
      entry: {
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
      },
      versionHash: row.version_hash,
    });
  }

  return map;
}

/**
 * Compare single integration for changes
 */
export function compareIntegration(
  oldEntry: CatalogEntry,
  newEntry: CatalogEntry,
  oldHash: string | null,
  newHash: string
): {
  changed: boolean;
  changedFields: string[];
} {
  // If no old hash, it's new
  if (!oldHash) {
    return {
      changed: true,
      changedFields: ['new'],
    };
  }

  // If hashes match, no change
  if (oldHash === newHash) {
    return {
      changed: false,
      changedFields: [],
    };
  }

  // Hashes differ, determine what changed
  const changedFields = detectChanges(oldHash, newHash, oldEntry, newEntry);
  
  return {
    changed: changedFields && changedFields.length > 0,
    changedFields: changedFields || [],
  };
}

/**
 * Detect changes between current HA catalog and database catalog
 */
export async function detectCatalogChanges(
  haEntries: CatalogEntry[]
): Promise<ChangeDetectionResult> {
  const dbCatalog = await getDatabaseCatalog();
  const haDomains = new Set(haEntries.map(e => e.domain));

  const result: ChangeDetectionResult = {
    new: [],
    updated: [],
    deleted: [],
    unchanged: [],
  };

  // Process HA entries (new or updated)
  for (const haEntry of haEntries) {
    const dbEntry = dbCatalog.get(haEntry.domain);

    if (!dbEntry) {
      // New integration
      result.new.push(haEntry);
    } else {
      // Check if updated
      const newHash = calculateVersionHash(haEntry).hash;
      const comparison = compareIntegration(
        dbEntry.entry,
        haEntry,
        dbEntry.versionHash,
        newHash
      );

      if (comparison.changed) {
        result.updated.push({
          domain: haEntry.domain,
          oldEntry: dbEntry.entry,
          newEntry: haEntry,
          changedFields: comparison.changedFields,
        });
      } else {
        result.unchanged.push(haEntry.domain);
      }
    }
  }

  // Find deleted integrations (in DB but not in HA)
  for (const [domain, dbEntry] of dbCatalog.entries()) {
    if (!haDomains.has(domain)) {
      result.deleted.push(dbEntry.entry);
    }
  }

  return result;
}

/**
 * Get all domains from database (including deprecated)
 */
export async function getAllDatabaseDomains(): Promise<Set<string>> {
  const result = await query<{ domain: string }>(
    'SELECT domain FROM integration_catalog'
  );

  return new Set(result.rows.map(row => row.domain));
}
