/**
 * Version Tracking Service
 * 
 * Calculates and stores version hashes for integration catalog entries.
 * Version hashes are used to detect changes between syncs.
 */

import crypto from 'crypto';
import { query } from '../db';

export interface CatalogEntry {
  domain: string;
  name: string;
  description?: string;
  icon?: string;
  supports_devices: boolean;
  is_cloud: boolean;
  documentation_url?: string;
  flow_type?: string;
  flow_config?: any;
  handler_class?: string;
  metadata?: any;
  brand_image_url?: string;
}

export interface VersionHash {
  hash: string;
  fields: string[]; // Fields included in hash
}

/**
 * Calculate version hash for an integration entry
 * Hash includes all fields that indicate a change
 */
export function calculateVersionHash(entry: CatalogEntry): VersionHash {
  // Include all fields that indicate a change
  // Sort keys for deterministic hashing
  const hashData: Record<string, any> = {
    name: entry.name,
    description: entry.description || null,
    icon: entry.icon || null,
    supports_devices: entry.supports_devices,
    is_cloud: entry.is_cloud,
    documentation_url: entry.documentation_url || null,
    flow_type: entry.flow_type || null,
    flow_config: entry.flow_config ? JSON.stringify(entry.flow_config) : null,
    handler_class: entry.handler_class || null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    brand_image_url: entry.brand_image_url || null,
  };

  // Create deterministic hash by sorting keys and stringifying
  const sortedKeys = Object.keys(hashData).sort();
  const hashString = JSON.stringify(
    sortedKeys.reduce((acc, key) => {
      acc[key] = hashData[key];
      return acc;
    }, {} as Record<string, any>)
  );

  const hash = crypto.createHash('sha256').update(hashString).digest('hex');

  return {
    hash,
    fields: sortedKeys,
  };
}

/**
 * Compare two version hashes to detect changes
 * Returns array of field names that changed
 */
export function detectChanges(
  oldHash: string,
  newHash: string,
  oldEntry: CatalogEntry,
  newEntry: CatalogEntry
): string[] {
  // If hashes are the same, no changes
  if (oldHash === newHash) {
    return [];
  }

  // If hashes differ, compare individual fields to determine what changed
  const changedFields: string[] = [];
  const fieldsToCheck: Array<keyof CatalogEntry> = [
    'name',
    'description',
    'icon',
    'supports_devices',
    'is_cloud',
    'documentation_url',
    'flow_type',
    'handler_class',
    'brand_image_url',
  ];

  for (const field of fieldsToCheck) {
    const oldValue = oldEntry[field];
    const newValue = newEntry[field];

    // Handle JSON fields
    if (field === 'flow_config' || field === 'metadata') {
      const oldJson = oldValue ? JSON.stringify(oldValue) : null;
      const newJson = newValue ? JSON.stringify(newValue) : null;
      if (oldJson !== newJson) {
        changedFields.push(field);
      }
    } else {
      // Simple comparison for other fields
      if (oldValue !== newValue) {
        changedFields.push(field);
      }
    }
  }

  return changedFields;
}

/**
 * Get current version hash for an integration from database
 */
export async function getCurrentVersionHash(domain: string): Promise<string | null> {
  const result = await query<{ version_hash: string | null }>(
    'SELECT version_hash FROM integration_catalog WHERE domain = $1',
    [domain]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].version_hash;
}

/**
 * Store version hash for an integration
 */
export async function storeVersionHash(domain: string, hash: string): Promise<void> {
  await query(
    `UPDATE integration_catalog 
     SET version_hash = $1, last_synced_at = now(), sync_status = 'synced'
     WHERE domain = $2`,
    [hash, domain]
  );
}

/**
 * Get version hash and entry for multiple domains
 */
export async function getVersionHashesForDomains(
  domains: string[]
): Promise<Map<string, { entry: CatalogEntry; versionHash: string | null }>> {
  if (domains.length === 0) {
    return new Map();
  }

  const placeholders = domains.map((_, i) => `$${i + 1}`).join(', ');
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
     WHERE domain IN (${placeholders})`,
    domains
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
