/**
 * Integration Registry
 * 
 * Manages integrations that can provide devices
 * Only enabled integrations that support device creation are returned
 */

import { query } from "@/lib/db";
import type { Integration } from "./device.types";

/**
 * Get all integrations that support device creation
 * Only returns enabled integrations (status = 'loaded' or 'setup') that support devices
 */
export async function getDeviceCapableIntegrations(): Promise<Integration[]> {
  const rows = await query<any>(
    `SELECT id, domain, name, description, icon, status
     FROM integrations
     WHERE status IN ('loaded', 'setup')
       AND supports_devices = true
     ORDER BY name ASC`
  );

  // Map to Integration format, marking all as device-capable
  // In a real system, this would check integration metadata
  return rows.map((row) => ({
    id: row.domain, // Use domain as ID for consistency
    domain: row.domain,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    supportsDeviceCreation: true, // All enabled integrations support device creation
  }));
}

/**
 * Get integration by domain
 */
export async function getIntegrationByDomain(domain: string): Promise<Integration | null> {
  const rows = await query<any>(
    `SELECT id, domain, name, description, icon, status
     FROM integrations
     WHERE domain = $1 AND status IN ('loaded', 'setup') AND supports_devices = true`,
    [domain]
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    id: row.domain,
    domain: row.domain,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    supportsDeviceCreation: true,
  };
}

