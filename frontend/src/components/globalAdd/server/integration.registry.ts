/**
 * Integration Registry
 * 
 * Backend-owned registry for managing device integrations
 * Integrations are the providers that can discover and manage devices
 */

import { query } from "@/lib/db";
import type { DeviceProvider } from "./registries.types";

export interface Integration {
  id: string;
  domain: string;
  name: string;
  description?: string;
  icon?: string;
  status: "loaded" | "setup" | "not_loaded" | "error";
  configData?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Get all installed integrations
 */
export async function getAllIntegrations(): Promise<Integration[]> {
  const rows = await query<any>(
    `SELECT id, domain, name, description, icon, status, config_data as "configData", created_at, updated_at
     FROM integrations
     WHERE status IN ('loaded', 'setup')
     ORDER BY name ASC`
  );
  // PostgreSQL JSONB columns are already parsed as objects
  return rows.map((row) => ({
    ...row,
    configData: row.configData || undefined,
  }));
}

/**
 * Get integration by domain
 */
export async function getIntegrationByDomain(domain: string): Promise<Integration | null> {
  const rows = await query<any>(
    `SELECT id, domain, name, description, icon, status, config_data as "configData", created_at, updated_at
     FROM integrations
     WHERE domain = $1`,
    [domain]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    configData: row.configData || undefined,
  };
}

/**
 * Get integration by ID
 */
export async function getIntegrationById(id: string): Promise<Integration | null> {
  const rows = await query<any>(
    `SELECT id, domain, name, description, icon, status, config_data as "configData", created_at, updated_at
     FROM integrations
     WHERE id = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const row = rows[0];
  return {
    ...row,
    configData: row.configData || undefined,
  };
}

/**
 * Create or update integration
 */
export async function saveIntegration(
  integration: Omit<Integration, "id" | "created_at" | "updated_at"> & { supportsDevices?: boolean }
): Promise<Integration> {
  const existing = await getIntegrationByDomain(integration.domain);
  
  // Check catalog for supports_devices flag if not provided
  let supportsDevices = integration.supportsDevices;
  if (supportsDevices === undefined) {
    const catalogRow = await query<any>(
      `SELECT supports_devices FROM integration_catalog WHERE domain = $1`,
      [integration.domain]
    );
    supportsDevices = catalogRow[0]?.supports_devices || false;
  }
  
  if (existing) {
    // Update existing
    const now = new Date().toISOString();
    await query(
      `UPDATE integrations 
       SET name = $1, description = $2, icon = $3, status = $4, config_data = $5, supports_devices = $6, updated_at = $7
       WHERE domain = $8`,
      [
        integration.name,
        integration.description || null,
        integration.icon || null,
        integration.status,
        integration.configData ? JSON.stringify(integration.configData) : null,
        supportsDevices,
        now,
        integration.domain,
      ]
    );
    const updated = await getIntegrationByDomain(integration.domain);
    if (!updated) throw new Error("Failed to update integration");
    return updated;
  } else {
    // Create new
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await query(
      `INSERT INTO integrations (id, domain, name, description, icon, status, config_data, supports_devices, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        integration.domain,
        integration.name,
        integration.description || null,
        integration.icon || null,
        integration.status,
        integration.configData ? JSON.stringify(integration.configData) : null,
        supportsDevices,
        now,
        now,
      ]
    );
    const created = await getIntegrationByDomain(integration.domain);
    if (!created) throw new Error("Failed to create integration");
    return created;
  }
}

/**
 * Convert integrations to device providers format
 */
export async function getDeviceProviders(): Promise<DeviceProvider[]> {
  const integrations = await getAllIntegrations();
  return integrations.map((integration) => ({
    id: integration.domain,
    name: integration.name,
    description: integration.description,
    icon: integration.icon,
  }));
}

