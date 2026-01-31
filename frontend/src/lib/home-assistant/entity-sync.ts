/**
 * Home Assistant Entity Synchronization Service
 * 
 * Syncs entities from Home Assistant into Bairuha entity registry.
 * This service performs initial sync and handles entity creation/updates.
 * 
 * Architecture: Bairuha is authoritative for registry, HA is authoritative for state.
 */

import { haRestClient, HAEntityState } from "./rest-client";
import { 
  getEntityByHAEntityId, 
  getEntityByEntityId, 
  updateEntityState,
  Entity 
} from "@/components/globalAdd/server/entity.registry";
import { query } from "@/lib/db";
import { registerDevice, getDeviceById, getAllDevices } from "@/components/globalAdd/server/device.registry";
import { entityConflictResolver } from "./entity-conflict-resolution";
import { entityDeletionDetector } from "./entity-deletion-detector";
import { hybridEntityManager } from "./hybrid-entity-manager";
import { duplicatePreventionService } from "./duplicate-prevention";

/**
 * Sync result statistics
 */
export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  merged: number;
  errors: Array<{
    haEntityId: string;
    error: string;
  }>;
  total: number;
  deletions?: {
    deleted: number;
    markedUnavailable: number;
    convertedToInternal: number;
  };
}

/**
 * Sync options
 */
export interface SyncOptions {
  conflictResolution: 'auto' | 'prompt' | 'skip';
  handleDeletions: boolean;
  mergeHybrids: boolean;
  dryRun?: boolean;
}

/**
 * Extract domain from HA entity ID
 * e.g., "light.living_room" -> "light"
 */
function extractDomain(entityId: string | undefined): string {
  if (!entityId) {
    return 'unknown';
  }
  const parts = entityId.split('.');
  return parts[0] || 'unknown';
}

/**
 * Derive entity name from HA entity state
 */
function deriveEntityName(haState: HAEntityState): string {
  // Use friendly_name from attributes if available
  if (haState.attributes?.friendly_name) {
    return haState.attributes.friendly_name;
  }
  
  // Otherwise, derive from entity_id
  // e.g., "light.living_room" -> "Living Room"
  if (!haState.entity_id) {
    return 'Unknown Entity';
  }
  
  const parts = haState.entity_id.split('.');
  if (parts.length > 1) {
    const namePart = parts[1];
    return namePart
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  return haState.entity_id;
}

/**
 * Get or create the special "Home Assistant" device
 * All synced HA entities are associated with this device
 */
async function getOrCreateHADevice(): Promise<string> {
  // Check if device already exists
  const allDevices = await getAllDevices();
  const haDevice = allDevices.find(d => d.name === "Home Assistant");
  
  if (haDevice) {
    return haDevice.id;
  }
  
  // Create new device
  const device = await registerDevice({
    name: "Home Assistant",
    integrationId: "homeassistant",
    integrationName: "Home Assistant",
    model: null,
    manufacturer: null,
    areaId: null
  });
  
  return device.id;
}

/**
 * Create a Bairuha entity from Home Assistant state
 */
async function createEntityFromHA(
  haState: HAEntityState,
  deviceId: string
): Promise<Entity> {
  const domain = extractDomain(haState.entity_id);
  const name = deriveEntityName(haState);
  const icon = haState.attributes?.icon || null;
  const now = new Date().toISOString();
  
  // Parse attributes
  const attributes = haState.attributes || {};
  
  const result = await query<{ id: string }>(
    `INSERT INTO entities (
      device_id, entity_id, domain, name, icon, state, attributes,
      last_changed, last_updated, created_at, ha_entity_id, source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id`,
    [
      deviceId,
      haState.entity_id,  // Use HA entity_id as Bairuha entity_id
      domain,
      name,
      icon,
      haState.state,
      JSON.stringify(attributes),
      haState.last_changed || now,
      haState.last_updated || now,
      now,
      haState.entity_id,  // Store original HA entity_id
      'ha'  // Source is HA
    ]
  );
  
  if (result.length === 0) {
    throw new Error("Failed to create entity");
  }
  
  const created = await getEntityByHAEntityId(haState.entity_id);
  if (!created) {
    throw new Error("Failed to retrieve created entity");
  }
  
  return created;
}

/**
 * Update existing Bairuha entity with Home Assistant state
 * Preserves Bairuha metadata (name, icon) but updates state and attributes
 */
async function updateEntityFromHA(
  entity: Entity,
  haState: HAEntityState
): Promise<Entity> {
  // Update state and attributes using the entity registry service
  // This ensures events are emitted properly
  const updated = await updateEntityState(
    entity.id,
    haState.state,
    haState.attributes || {}
  );
  
  // Also update last_changed and last_updated timestamps
  await query(
    `UPDATE entities 
     SET last_changed = $1, 
         last_updated = $2
     WHERE id = $3`,
    [
      haState.last_changed || new Date().toISOString(),
      haState.last_updated || new Date().toISOString(),
      entity.id
    ]
  );
  
  return await getEntityByHAEntityId(haState.entity_id) || updated;
}

/**
 * Handle ID collision when entity_id exists but ha_entity_id doesn't match
 */
async function handleEntityIdCollision(
  haState: HAEntityState,
  existingEntity: Entity,
  deviceId: string
): Promise<Entity> {
  // If existing entity is internal, create new with modified entity_id
  if (existingEntity.source === 'internal') {
    const newEntityId = `${haState.entity_id}_ha`;
    // Check if this modified ID also exists
    const checkEntity = await getEntityByEntityId(newEntityId);
    if (checkEntity) {
      throw new Error(`Entity ID collision: ${newEntityId} already exists`);
    }
    
    // Create with modified entity_id
    const domain = extractDomain(haState.entity_id);
    const name = deriveEntityName(haState);
    const icon = haState.attributes?.icon || null;
    const now = new Date().toISOString();
    const attributes = haState.attributes || {};
    
    const result = await query<{ id: string }>(
      `INSERT INTO entities (
        device_id, entity_id, domain, name, icon, state, attributes,
        last_changed, last_updated, created_at, ha_entity_id, source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        deviceId,
        newEntityId,  // Modified entity_id to avoid collision
        domain,
        name,
        icon,
        haState.state,
        JSON.stringify(attributes),
        haState.last_changed || now,
        haState.last_updated || now,
        now,
        haState.entity_id,  // Original HA entity_id
        'ha'
      ]
    );
    
    if (result.length === 0) {
      throw new Error("Failed to create entity with modified ID");
    }
    
    const created = await getEntityByHAEntityId(haState.entity_id);
    if (!created) {
      throw new Error("Failed to retrieve created entity");
    }
    
    return created;
  }
  
  // If existing entity is already HA, update it
  return await updateEntityFromHA(existingEntity, haState);
}

/**
 * Sync all entities from Home Assistant
 * 
 * @param userId - Optional user ID (for future use)
 * @param options - Sync options for conflict resolution and deletion handling
 * @returns Sync result with statistics
 */
export async function syncEntitiesFromHA(
  userId?: string,
  options?: SyncOptions
): Promise<SyncResult> {
  const opts: SyncOptions = {
    conflictResolution: 'auto',
    handleDeletions: true,
    mergeHybrids: true,
    dryRun: false,
    ...options
  };

  const result: SyncResult = {
    success: true,
    created: 0,
    updated: 0,
    merged: 0,
    errors: [],
    total: 0
  };
  
  try {
    // Get or create Home Assistant device
    const deviceId = await getOrCreateHADevice();
    
    // Fetch all states from Home Assistant
    const haStates = await haRestClient.getStates();
    result.total = haStates.length;
    
    // Process each HA entity
    for (const haState of haStates) {
      try {
        // Skip entities without entity_id
        if (!haState.entity_id) {
          result.errors.push({
            haEntityId: 'UNKNOWN',
            error: 'Entity missing entity_id'
          });
          result.success = false;
          continue;
        }
        
        if (opts.dryRun) {
          // Dry run - just check for conflicts
          const existingEntity = await getEntityByHAEntityId(haState.entity_id);
          if (existingEntity) {
            const conflict = entityConflictResolver.detectConflict(haState, existingEntity);
            if (conflict) {
              console.log(`[DRY RUN] Conflict detected: ${conflict.type} for ${haState.entity_id}`);
            }
          }
          continue;
        }

        // Check for duplicates before processing
        const duplicateCheck = await duplicatePreventionService.checkForDuplicates(
          haState.entity_id,
          haState.entity_id,
          extractDomain(haState.entity_id),
          deriveEntityName(haState)
        );

        if (duplicateCheck.isDuplicate && duplicateCheck.confidence === 'high') {
          // High confidence duplicate - skip or handle based on options
          if (opts.conflictResolution === 'skip') {
            continue;
          }
        }

        // Check if entity already exists by ha_entity_id
        let existingEntity = await getEntityByHAEntityId(haState.entity_id);
        
        if (existingEntity) {
          // Entity exists - check for conflicts
          const conflict = entityConflictResolver.detectConflict(haState, existingEntity);
          
          if (conflict && opts.conflictResolution !== 'skip') {
            // Resolve conflict
            const resolution = await entityConflictResolver.resolveEntityConflict(
              haState,
              existingEntity,
              deviceId
            );

            if (resolution.action === 'merge') {
              result.merged++;
            } else if (resolution.action === 'update') {
              result.updated++;
            } else if (resolution.action === 'error') {
              result.errors.push({
                haEntityId: haState.entity_id,
                error: resolution.message
              });
              result.success = false;
            }
          } else {
            // No conflict - normal update
            await updateEntityFromHA(existingEntity, haState);
            result.updated++;
          }
        } else {
          // Entity doesn't exist - check for potential hybrid matches
          if (opts.mergeHybrids) {
            const potentialMatches = await hybridEntityManager.findPotentialMatches(haState);
            
            if (potentialMatches.length > 0) {
              // Merge with first match
              const merged = await hybridEntityManager.mergeInternalWithHA(
                potentialMatches[0],
                haState
              );
              result.merged++;
              continue;
            }
          }

          // Check if entity_id collision exists (same entity_id but different ha_entity_id)
          const collisionEntity = await getEntityByEntityId(haState.entity_id);
          
          if (collisionEntity) {
            // Handle collision using conflict resolver
            const resolution = await entityConflictResolver.resolveEntityConflict(
              haState,
              collisionEntity,
              deviceId
            );

            if (resolution.action === 'create') {
              result.created++;
            } else if (resolution.action === 'error') {
              result.errors.push({
                haEntityId: haState.entity_id,
                error: resolution.message
              });
              result.success = false;
            }
          } else {
            // No collision - create new entity
            await createEntityFromHA(haState, deviceId);
            result.created++;
          }
        }
      } catch (error) {
        // Log error but continue processing other entities
        result.errors.push({
          haEntityId: haState.entity_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.success = false;
      }
    }

    // Handle deletions if enabled
    if (opts.handleDeletions && !opts.dryRun) {
      const deletionResult = await entityDeletionDetector.detectDeletedEntities({
        strategy: 'soft',
        preserveHistory: true,
        notifyUser: false
      });

      result.deletions = {
        deleted: deletionResult.deleted,
        markedUnavailable: deletionResult.markedUnavailable,
        convertedToInternal: deletionResult.convertedToInternal
      };

      if (deletionResult.errors.length > 0) {
        result.errors.push(...deletionResult.errors.map(e => ({
          haEntityId: e.entityId,
          error: e.error
        })));
      }
    }
  } catch (error) {
    // Fatal error - sync failed completely
    result.success = false;
    result.errors.push({
      haEntityId: 'SYNC_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return result;
}
