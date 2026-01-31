/**
 * Device Registry
 * 
 * Backend-owned registry for managing devices
 * Devices come only from integrations and are persisted in the database
 */

import { query } from "@/lib/db";
import type { Device } from "./device.types";
import { getIntegrationByDomain } from "./integration.registry";

/**
 * Get all registered devices
 */
export async function getAllDevices(): Promise<Device[]> {
  const rows = await query<any>(
    `SELECT id, name, integration_id as "integrationId", 
            model, manufacturer, area_id as "areaId", 
            status, unique_id as "uniqueId", identifiers,
            created_at as "createdAt"
     FROM devices
     ORDER BY created_at DESC`
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    integrationId: row.integrationId,
    manufacturer: row.manufacturer || undefined,
    model: row.model || undefined,
    areaId: row.areaId || undefined,
    createdAt: row.createdAt,
    status: (row.status || "offline") as "online" | "offline",
    uniqueId: row.uniqueId || undefined,
    identifiers: row.identifiers || undefined,
  }));
}

/**
 * Get device by ID
 */
export async function getDeviceById(id: string): Promise<Device | null> {
  const rows = await query<any>(
    `SELECT id, name, integration_id as "integrationId", 
            model, manufacturer, area_id as "areaId", 
            status, unique_id as "uniqueId", identifiers,
            created_at as "createdAt"
     FROM devices
     WHERE id = $1`,
    [id]
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    integrationId: row.integrationId,
    manufacturer: row.manufacturer || undefined,
    model: row.model || undefined,
    areaId: row.areaId || undefined,
    createdAt: row.createdAt,
    status: (row.status || "offline") as "online" | "offline",
    uniqueId: row.uniqueId || undefined,
    identifiers: row.identifiers || undefined,
  };
}

/**
 * Generate a unique ID from device identifiers
 * Priority: MAC address > Serial number > Model + Manufacturer > Integration + Name
 */
function generateUniqueId(
  identifiers?: Record<string, string>,
  connections?: Array<[string, string]>,
  model?: string,
  manufacturer?: string,
  integrationId?: string,
  name?: string
): string | null {
  // Try MAC address first (most reliable)
  if (connections) {
    for (const [key, value] of connections) {
      if (key.toLowerCase() === "mac" && value) {
        return `mac:${value.toLowerCase().replace(/[:-]/g, "")}`;
      }
    }
  }
  
  if (identifiers) {
    // Try MAC from identifiers
    if (identifiers.mac || identifiers.MAC) {
      const mac = (identifiers.mac || identifiers.MAC).toLowerCase().replace(/[:-]/g, "");
      return `mac:${mac}`;
    }
    
    // Try serial number
    if (identifiers.serial || identifiers.serial_number) {
      return `serial:${identifiers.serial || identifiers.serial_number}`;
    }
    
    // Try any identifier
    for (const [key, value] of Object.entries(identifiers)) {
      if (value && key.toLowerCase() !== "name") {
        return `${key.toLowerCase()}:${value}`;
      }
    }
  }
  
  // Fallback: Use model + manufacturer if available
  if (model && manufacturer) {
    return `model:${manufacturer.toLowerCase().replace(/\s+/g, "_")}_${model.toLowerCase().replace(/\s+/g, "_")}`;
  }
  
  // Last resort: Use integration + name (less reliable, but better than nothing)
  if (integrationId && name) {
    return `name:${integrationId}_${name.toLowerCase().replace(/\s+/g, "_")}`;
  }
  
  return null;
}

/**
 * Check if a device with the same unique ID or identifiers already exists
 * @throws Error if duplicate found
 */
async function checkForDuplicate(
  uniqueId: string | null,
  identifiers?: Record<string, string>,
  integrationId?: string
): Promise<void> {
  if (!uniqueId && (!identifiers || Object.keys(identifiers).length === 0)) {
    // No unique identifiers available - can't check for duplicates
    // This is acceptable for devices without unique IDs
    return;
  }
  
  // Check by unique_id
  if (uniqueId) {
    const existingByUniqueId = await query<any>(
      `SELECT id, name, integration_id FROM devices WHERE unique_id = $1`,
      [uniqueId]
    );
    
    if (existingByUniqueId.length > 0) {
      const existing = existingByUniqueId[0];
      throw new Error(
        `Device already exists: "${existing.name}" (${existing.integration_id}). ` +
        `This device has already been added to your system.`
      );
    }
  }
  
  // Check by identifiers (if provided)
  if (identifiers && Object.keys(identifiers).length > 0) {
    // Check for devices with matching identifiers
    // Using JSONB containment operator (@>)
    const existingByIdentifiers = await query<any>(
      `SELECT id, name, integration_id, identifiers 
       FROM devices 
       WHERE identifiers @> $1::jsonb 
       AND identifiers IS NOT NULL`,
      [JSON.stringify(identifiers)]
    );
    
    if (existingByIdentifiers.length > 0) {
      const existing = existingByIdentifiers[0];
      throw new Error(
        `Device already exists: "${existing.name}" (${existing.integration_id}). ` +
        `A device with the same identifiers has already been added.`
      );
    }
  }
  
  // Check by integration + model + manufacturer combination (if no unique ID)
  if (!uniqueId && integrationId) {
    // This is a weaker check, but helps catch obvious duplicates
    // We'll skip this to avoid false positives
  }
}

/**
 * Register a new device
 * Device must come from an integration
 * @throws Error if device already exists (duplicate unique_id or identifiers)
 */
export async function registerDevice(
  device: Omit<Device, "id" | "createdAt" | "status"> & { 
    status?: "online" | "offline";
    deviceType?: string; // Device type for entity creation
    connections?: Array<[string, string]>; // Device connections (for unique ID generation)
  }
): Promise<Device> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = device.status || "offline";

  // Generate unique ID from identifiers
  const uniqueId = generateUniqueId(
    device.identifiers,
    device.connections,
    device.model,
    device.manufacturer,
    device.integrationId,
    device.name
  );

  // Check for duplicates BEFORE inserting
  await checkForDuplicate(uniqueId, device.identifiers, device.integrationId);

  // Get integration name
  const integration = await getIntegrationByDomain(device.integrationId);
  const integrationName = integration?.name || device.integrationId;

  // Insert device with unique_id and identifiers
  await query(
    `INSERT INTO devices (id, name, integration_id, integration_name, model, manufacturer, area_id, status, unique_id, identifiers, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      device.name,
      device.integrationId,
      integrationName,
      device.model || null,
      device.manufacturer || null,
      device.areaId || null,
      status,
      uniqueId || null,
      device.identifiers ? JSON.stringify(device.identifiers) : null,
      now,
      now,
    ]
  );

  const created = await getDeviceById(id);
  if (!created) {
    throw new Error("Failed to create device");
  }

  // Create entities for the device using the provided device type
  if (device.deviceType) {
    const { createEntitiesForDevice } = await import("@/components/globalAdd/server/entity.registry");
    await createEntitiesForDevice({
      id: created.id,
      name: created.name,
      integrationId: created.integrationId,
      model: created.model,
      deviceType: device.deviceType, // Pass the device type
    });
  }

  return created;
}

/**
 * Update device status
 */
export async function updateDeviceStatus(id: string, status: "online" | "offline"): Promise<Device> {
  await query(
    `UPDATE devices SET status = $1, updated_at = $2 WHERE id = $3`,
    [status, new Date().toISOString(), id]
  );

  const updated = await getDeviceById(id);
  if (!updated) {
    throw new Error("Device not found");
  }
  return updated;
}


