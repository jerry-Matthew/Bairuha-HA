/**
 * Entity Update Handler
 * 
 * Handles entity updates from Home Assistant WebSocket events.
 * Detects conflicts, renames, domain changes, and new entities.
 */

import { Entity, getEntityByHAEntityId, getEntityByEntityId, updateEntityState } from "@/components/globalAdd/server/entity.registry";
import { HAEntityState } from "./rest-client";
import { entityConflictResolver } from "./entity-conflict-resolution";
import { query } from "@/lib/db";

/**
 * Extract domain from entity ID
 */
function extractDomain(entityId: string | undefined): string {
  if (!entityId) {
    return 'unknown';
  }
  const parts = entityId.split('.');
  return parts[0] || 'unknown';
}

/**
 * Entity Update Handler
 */
export class EntityUpdateHandler {
  /**
   * Handle HA entity update from WebSocket event
   */
  async handleHAEntityUpdate(
    haState: HAEntityState,
    oldState?: HAEntityState
  ): Promise<Entity | null> {
    // Check if entity exists by ha_entity_id
    let entity = await getEntityByHAEntityId(haState.entity_id);

    if (entity) {
      // Entity exists - check for conflicts
      const conflict = entityConflictResolver.detectConflict(haState, entity);
      
      if (conflict) {
        // Handle conflict
        const resolution = await entityConflictResolver.resolveEntityConflict(
          haState,
          entity,
          entity.deviceId
        );

        if (resolution.action === 'error') {
          console.error(`Failed to resolve conflict: ${resolution.message}`);
          return null;
        }

        // Get updated entity
        entity = await getEntityByHAEntityId(haState.entity_id);
        if (!entity) {
          return null;
        }
      }

      // Check for entity rename (entity_id changed in HA)
      if (oldState && oldState.entity_id !== haState.entity_id) {
        // Entity was renamed in HA
        await this.handleEntityRename(oldState.entity_id, haState.entity_id, entity);
        entity = await getEntityByHAEntityId(haState.entity_id);
        if (!entity) {
          return null;
        }
      }

      // Check for domain change
      if (entity.domain !== extractDomain(haState.entity_id)) {
        await query(
          `UPDATE entities 
           SET domain = $1
           WHERE id = $2`,
          [extractDomain(haState.entity_id), entity.id]
        );
      }

      // Update state
      await updateEntityState(
        entity.id,
        haState.state,
        haState.attributes || {}
      );

      // Update timestamps
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

      return await getEntityByHAEntityId(haState.entity_id);
    } else {
      // Entity doesn't exist - check if it's a new entity or renamed entity
      // Check if there's an entity with same entity_id but different ha_entity_id
      const entityByEntityId = await getEntityByEntityId(haState.entity_id);
      
      if (entityByEntityId && entityByEntityId.source === 'internal') {
        // Internal entity exists - could be a match
        // For now, we'll log it and let sync handle it
        console.log(`Potential match: internal entity ${entityByEntityId.entityId} matches HA entity ${haState.entity_id}`);
        return null; // Let sync process handle this
      }

      // New entity - should be created by sync, not here
      // Log for debugging (this is expected behavior - entities need manual sync)
      console.log(`[EntityUpdateHandler] New HA entity detected: ${haState.entity_id} - will be synced on next sync operation`);
      return null;
    }
  }

  /**
   * Handle entity rename (entity_id changed in HA)
   */
  private async handleEntityRename(
    oldHAEntityId: string,
    newHAEntityId: string,
    entity: Entity
  ): Promise<void> {
    // Update ha_entity_id and entity_id to match new HA entity_id
    await query(
      `UPDATE entities 
       SET ha_entity_id = $1,
           entity_id = $1,
           domain = $2
       WHERE id = $3`,
      [
        newHAEntityId,
        extractDomain(newHAEntityId),
        entity.id
      ]
    );
  }

  /**
   * Handle entity deletion (entity removed from HA)
   */
  async handleEntityDeletion(haEntityId: string): Promise<void> {
    const entity = await getEntityByHAEntityId(haEntityId);
    if (!entity) {
      return; // Entity doesn't exist
    }

    // Mark as unavailable
    await updateEntityState(entity.id, 'unavailable', {
      ...entity.attributes,
      deleted_from_ha: true,
      deleted_at: new Date().toISOString()
    });

    // If hybrid, convert to internal
    if (entity.source === 'hybrid') {
      await query(
        `UPDATE entities 
         SET source = 'internal',
             ha_entity_id = NULL
         WHERE id = $1`,
        [entity.id]
      );
    }
  }
}

// Export singleton instance
export const entityUpdateHandler = new EntityUpdateHandler();

// Export convenience function
export async function handleHAEntityUpdate(
  haState: HAEntityState,
  oldState?: HAEntityState
): Promise<Entity | null> {
  return entityUpdateHandler.handleHAEntityUpdate(haState, oldState);
}
