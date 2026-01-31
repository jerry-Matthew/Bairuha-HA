/**
 * Entity Registry
 * 
 * Backend-owned registry for managing entities
 * Entities are the only controllable & observable units
 * Devices are metadata containers only
 */

import { query } from "@/lib/db";
import { emitEntityStateChanged } from "./entity.events";
import { broadcastEntitiesCreated } from "@/components/realtime/websocket.server";

export interface Entity {
  id: string;
  deviceId: string;
  entityId: string;      // e.g. "light.living_room"
  domain: string;        // e.g. "light", "sensor", "switch"
  name?: string;
  icon?: string;
  state: string;
  attributes: Record<string, any>;
  lastChanged?: string;
  lastUpdated: string;
  createdAt: string;
  haEntityId?: string;   // Home Assistant entity ID (only for HA entities)
  source: 'ha' | 'internal' | 'hybrid';  // Entity source
}

export interface EntityStateUpdate {
  state: string;
  attributes?: Record<string, any>;
}

/**
 * Device type to entity mapping
 * This is a static mapping for now - can be enhanced later
 */
const DEVICE_TYPE_TO_ENTITIES: Record<string, Array<{ domain: string; entityId: string; name: string; icon?: string }>> = {
  smart_light: [
    { domain: "light", entityId: "power", name: "Power" }
  ],
  temperature_sensor: [
    { domain: "sensor", entityId: "temperature", name: "Temperature" }
  ],
  motion_sensor: [
    { domain: "binary_sensor", entityId: "motion", name: "Motion" }
  ],
  smart_switch: [
    { domain: "switch", entityId: "power", name: "Power" }
  ],
  thermostat: [
    { domain: "climate", entityId: "thermostat", name: "Thermostat" }
  ],
  door_lock: [
    { domain: "lock", entityId: "lock", name: "Lock" }
  ],
  garage_door: [
    { domain: "cover", entityId: "garage_door", name: "Garage Door" }
  ],
  camera: [
    { domain: "camera", entityId: "stream", name: "Camera Stream" }
  ],
  fan: [
    { domain: "fan", entityId: "speed", name: "Fan Speed" }
  ],
  cover: [
    { domain: "cover", entityId: "position", name: "Cover Position" }
  ],
  climate: [
    { domain: "climate", entityId: "temperature", name: "Temperature Control" }
  ],
  // Default fallback - creates a generic switch entity
  default: [
    { domain: "switch", entityId: "main", name: "Main" }
  ]
};

/**
 * Create entities for a device based on device type
 * This is called automatically when a device is registered
 */
export async function createEntitiesForDevice(device: {
  id: string;
  name: string;
  integrationId?: string;
  model?: string;
  deviceType?: string; // Optional explicit device type
}): Promise<Entity[]> {
  // Use provided device type, or infer from model/integration
  const deviceType = device.deviceType || inferDeviceType(device.model || "", device.integrationId || "");

  // Get entity definitions for this device type
  const entityDefinitions = DEVICE_TYPE_TO_ENTITIES[deviceType] || DEVICE_TYPE_TO_ENTITIES.default;

  const now = new Date().toISOString();
  const createdEntities: Entity[] = [];

  // Create each entity for the device
  for (const def of entityDefinitions) {
    const entityId = `${def.domain}.${sanitizeEntityId(device.name)}_${def.entityId}`;
    const entityName = `${device.name} ${def.name}`;

    const result = await query<{ id: string }>(
      `INSERT INTO entities (
        device_id, entity_id, domain, name, icon, state, attributes, 
        last_changed, last_updated, created_at, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        device.id,
        entityId,
        def.domain,
        entityName,
        def.icon || null,
        "unknown", // Initial state
        "{}",      // Empty attributes
        now,
        now,
        now,
        'internal' // Default source for device-created entities
      ]
    );

    if (result.length > 0) {
      const created = await getEntityById(result[0].id);
      if (created) {
        createdEntities.push(created);
      }
    }
  }

  // Broadcast entity creation event via WebSocket
  if (createdEntities.length > 0) {
    broadcastEntitiesCreated({
      entities: createdEntities.map(e => ({
        id: e.id,
        deviceId: e.deviceId,
        entityId: e.entityId,
        domain: e.domain,
        name: e.name,
        icon: e.icon,
        state: e.state,
        attributes: e.attributes,
        lastChanged: e.lastChanged,
        lastUpdated: e.lastUpdated,
        createdAt: e.createdAt,
      })),
    });
  }

  return createdEntities;
}

/**
 * Infer device type from model or integration
 * This is a simple heuristic - in production would be more sophisticated
 */
function inferDeviceType(model: string, integrationId: string): string {
  const modelLower = model.toLowerCase();
  const integrationLower = integrationId.toLowerCase();

  if (modelLower.includes("light") || integrationLower.includes("light")) {
    return "smart_light";
  }
  if (modelLower.includes("sensor") && (modelLower.includes("temp") || modelLower.includes("temperature"))) {
    return "temperature_sensor";
  }
  if (modelLower.includes("motion") || modelLower.includes("pir")) {
    return "motion_sensor";
  }
  if (modelLower.includes("switch")) {
    return "smart_switch";
  }
  if (modelLower.includes("thermostat")) {
    return "thermostat";
  }
  if (modelLower.includes("lock") || modelLower.includes("door lock")) {
    return "door_lock";
  }
  if (modelLower.includes("garage")) {
    return "garage_door";
  }

  return "default";
}

/**
 * Sanitize entity ID - convert to lowercase and replace spaces with underscores
 */
function sanitizeEntityId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Get all entities
 */
export async function getEntities(deviceId?: string): Promise<Entity[]> {
  let sql = `
    SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
  `;

  const params: any[] = [];

  if (deviceId) {
    sql += ` WHERE device_id = $1`;
    params.push(deviceId);
  }

  sql += ` ORDER BY created_at DESC`;

  const rows = await query<Entity>(sql, params);
  return rows.map(row => ({
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  }));
}

/**
 * Get entities by device ID
 */
export async function getEntitiesByDevice(deviceId: string): Promise<Entity[]> {
  return getEntities(deviceId);
}

/**
 * Get entity by ID (UUID)
 */
export async function getEntityById(id: string): Promise<Entity | null> {
  const rows = await query<Entity>(
    `SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
    WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  };
}

/**
 * Get entity by entity_id (string identifier like "sensor.temperature")
 * Used for entity lookup by string identifier (e.g., for command validation)
 * 
 * @param entityId - Entity ID string (e.g., "sensor.temperature")
 */
export async function getEntityByEntityId(entityId: string): Promise<Entity | null> {
  const rows = await query<Entity>(
    `SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
    WHERE entity_id = $1`,
    [entityId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  };
}

/**
 * Get entity by Home Assistant entity ID
 * 
 * @param haEntityId - Home Assistant entity ID (e.g., "light.living_room")
 */
export async function getEntityByHAEntityId(haEntityId: string): Promise<Entity | null> {
  const rows = await query<Entity>(
    `SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
    WHERE ha_entity_id = $1`,
    [haEntityId]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  };
}

/**
 * Update entity state by UUID
 * This is the ONLY way to update entity state
 * 
 * @param id - Entity UUID
 * @param state - New state value
 * @param attributes - Optional attributes object
 */
export async function updateEntityState(
  id: string,
  state: string,
  attributes?: Record<string, any>
): Promise<Entity> {
  // Call the backend API to update entity state
  // This ensures activity logging and other backend logic is triggered
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${API_BASE_URL}/api/entities/${id}/state`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ state, attributes }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update entity state: ${response.status} ${errorText}`);
    }

    const updated = await response.json();

    // Emit entity_state_changed event (for WebSocket integration)
    emitEntityStateChanged({
      entityId: updated.entityId,
      state: updated.state,
      attributes: updated.attributes,
      lastChanged: updated.lastChanged || new Date().toISOString(),
      lastUpdated: updated.lastUpdated
    });

    return updated;
  } catch (error) {
    console.error('Error updating entity state:', error);
    throw error;
  }
}

/**
 * Delete entities for a device (called when device is deleted)
 */
export async function deleteEntitiesByDevice(deviceId: string): Promise<void> {
  // CASCADE should handle this, but we'll be explicit
  await query("DELETE FROM entities WHERE device_id = $1", [deviceId]);
}

/**
 * Get entities by source
 */
export async function getEntitiesBySource(source: 'ha' | 'internal' | 'hybrid'): Promise<Entity[]> {
  const rows = await query<Entity>(
    `SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
    WHERE source = $1
    ORDER BY created_at DESC`,
    [source]
  );

  return rows.map(row => ({
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  }));
}

/**
 * Get all HA entities (source='ha' or 'hybrid')
 */
export async function getHAEntities(): Promise<Entity[]> {
  const rows = await query<Entity>(
    `SELECT 
      id,
      device_id as "deviceId",
      entity_id as "entityId",
      domain,
      name,
      icon,
      state,
      attributes,
      last_changed as "lastChanged",
      last_updated as "lastUpdated",
      created_at as "createdAt",
      ha_entity_id as "haEntityId",
      source
    FROM entities
    WHERE source IN ('ha', 'hybrid')
    ORDER BY created_at DESC`
  );

  return rows.map(row => ({
    ...row,
    attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
    source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
  }));
}

/**
 * Get all internal entities (source='internal')
 */
export async function getInternalEntities(): Promise<Entity[]> {
  return getEntitiesBySource('internal');
}
