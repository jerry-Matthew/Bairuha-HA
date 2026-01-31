/**
 * Device Registry
 * 
 * Backend-owned registry for managing devices in the system
 * Devices come from integrations and are persisted in the database
 */

import { query } from "@/lib/db";
import type { Device, DeviceProvider } from "./registries.types";
import { getDeviceProviders as getIntegrationProviders } from "./integration.registry";
import { createEntitiesForDevice } from "./entity.registry";

/**
 * Get all registered devices
 */
export async function getAllDevices(): Promise<Device[]> {
  const rows = await query<Device>(
    `SELECT id, name, integration_id as "integrationId", integration_name as "integrationName",
            model, manufacturer, area_id as "areaId", created_at, updated_at
     FROM devices
     ORDER BY created_at DESC`
  );
  return rows;
}

/**
 * Get device by ID
 */
export async function getDeviceById(id: string): Promise<Device | null> {
  const rows = await query<Device>(
    `SELECT id, name, integration_id as "integrationId", integration_name as "integrationName",
            model, manufacturer, area_id as "areaId", created_at, updated_at
     FROM devices
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Register a new device
 * 
 * CRITICAL: This function MUST create entities immediately when a device is registered.
 * Devices without entities are invalid. Entities are the only controllable/observable units.
 */
export async function registerDevice(device: Omit<Device, "id" | "created_at" | "updated_at">): Promise<Device> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await query(
    `INSERT INTO devices (id, name, integration_id, integration_name, model, manufacturer, area_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      device.name,
      device.integrationId,
      device.integrationName,
      device.model || null,
      device.manufacturer || null,
      device.areaId || null,
      now,
      now,
    ]
  );

  const created = await getDeviceById(id);
  if (!created) {
    throw new Error("Failed to create device");
  }
  
  // MANDATORY: Create entities for the device immediately
  // Devices are metadata containers only - entities are the controllable units
  try {
    await createEntitiesForDevice({
      id: created.id,
      name: created.name,
      integrationId: created.integrationId,
      model: created.model
    });
  } catch (error) {
    // If entity creation fails, device creation should fail too
    // Rollback device creation
    await deleteDevice(id);
    throw new Error(`Failed to create entities for device: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return created;
}

/**
 * Update device
 */
export async function updateDevice(id: string, updates: Partial<Device>): Promise<Device> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.areaId !== undefined) {
    updatesList.push(`area_id = $${paramIndex++}`);
    values.push(updates.areaId);
  }
  if (updates.model !== undefined) {
    updatesList.push(`model = $${paramIndex++}`);
    values.push(updates.model);
  }
  if (updates.manufacturer !== undefined) {
    updatesList.push(`manufacturer = $${paramIndex++}`);
    values.push(updates.manufacturer);
  }

  updatesList.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  values.push(id);

  if (updatesList.length > 1) {
    await query(
      `UPDATE devices SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
  }

  const updated = await getDeviceById(id);
  if (!updated) {
    throw new Error("Device not found");
  }
  return updated;
}

/**
 * Delete device
 */
export async function deleteDevice(id: string): Promise<void> {
  await query("DELETE FROM devices WHERE id = $1", [id]);
}

/**
 * Get available device providers/integrations
 * Queries the integration registry for installed integrations
 */
export async function getDeviceProviders(): Promise<DeviceProvider[]> {
  // Query real installed integrations from the database
  return await getIntegrationProviders();
}


