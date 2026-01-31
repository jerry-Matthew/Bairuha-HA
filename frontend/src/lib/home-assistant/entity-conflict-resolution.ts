/**
 * Entity Conflict Resolution Service
 * 
 * Handles conflicts when syncing entities from Home Assistant.
 * Detects and resolves various conflict scenarios including:
 * - Same ha_entity_id but different entity_id
 * - Same entity_id but different ha_entity_id
 * - Internal entity matches HA entity (should become hybrid)
 * - Entity domain changes
 * - Entity renames
 */

import { Entity, getEntityByHAEntityId, getEntityByEntityId, updateEntityState } from "@/components/globalAdd/server/entity.registry";
import { HAEntityState } from "./rest-client";
import { query } from "@/lib/db";

/**
 * Resolution result from conflict resolution
 */
export interface ResolutionResult {
  action: 'update' | 'create' | 'merge' | 'skip' | 'error';
  entity?: Entity;
  message: string;
  requiresUserAction?: boolean; // True if user should review
}

/**
 * Conflict scenario types
 */
export interface ConflictScenario {
  type: 'same_ha_id_different_entity_id' | 
        'same_entity_id_different_ha_id' | 
        'internal_matches_ha' | 
        'domain_change' |
        'name_change';
  haState: HAEntityState;
  existingEntity: Entity;
}

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
 * Derive entity name from HA entity state
 */
function deriveEntityName(haState: HAEntityState): string {
  if (haState.attributes?.friendly_name) {
    return haState.attributes.friendly_name;
  }
  
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
 * Entity Conflict Resolver
 */
export class EntityConflictResolver {
  /**
   * Detect conflict scenario between HA state and existing entity
   */
  detectConflict(haState: HAEntityState, existingEntity: Entity): ConflictScenario | null {
    // Same ha_entity_id but different entity_id
    if (existingEntity.haEntityId === haState.entity_id && existingEntity.entityId !== haState.entity_id) {
      return {
        type: 'same_ha_id_different_entity_id',
        haState,
        existingEntity
      };
    }
    
    // Same entity_id but different ha_entity_id
    if (existingEntity.entityId === haState.entity_id && existingEntity.haEntityId !== haState.entity_id) {
      return {
        type: 'same_entity_id_different_ha_id',
        haState,
        existingEntity
      };
    }
    
    // Domain change
    if (existingEntity.haEntityId === haState.entity_id && existingEntity.domain !== extractDomain(haState.entity_id)) {
      return {
        type: 'domain_change',
        haState,
        existingEntity
      };
    }
    
    // Name change (detected by comparing friendly_name)
    const haName = deriveEntityName(haState);
    if (existingEntity.haEntityId === haState.entity_id && existingEntity.name !== haName) {
      return {
        type: 'name_change',
        haState,
        existingEntity
      };
    }
    
    // Internal entity matches HA entity (same domain, similar name)
    if (existingEntity.source === 'internal' && 
        existingEntity.domain === extractDomain(haState.entity_id)) {
      // Check if names are similar (simple fuzzy match)
      const existingName = (existingEntity.name || '').toLowerCase();
      const haNameLower = haName.toLowerCase();
      if (existingName.includes(haNameLower) || haNameLower.includes(existingName)) {
        return {
          type: 'internal_matches_ha',
          haState,
          existingEntity
        };
      }
    }
    
    return null;
  }

  /**
   * Resolve entity conflict
   */
  async resolveEntityConflict(
    haState: HAEntityState,
    existingEntity: Entity,
    deviceId: string
  ): Promise<ResolutionResult> {
    const conflict = this.detectConflict(haState, existingEntity);
    
    if (!conflict) {
      // No conflict - normal update
      return {
        action: 'update',
        entity: existingEntity,
        message: 'No conflict detected, normal update'
      };
    }

    switch (conflict.type) {
      case 'same_ha_id_different_entity_id':
        return await this.resolveSameHAIdDifferentEntityId(haState, existingEntity);
      
      case 'same_entity_id_different_ha_id':
        return await this.resolveSameEntityIdDifferentHAId(haState, existingEntity, deviceId);
      
      case 'internal_matches_ha':
        return await this.resolveInternalMatchesHA(haState, existingEntity);
      
      case 'domain_change':
        return await this.resolveDomainChange(haState, existingEntity);
      
      case 'name_change':
        return await this.resolveNameChange(haState, existingEntity);
      
      default:
        return {
          action: 'error',
          message: `Unknown conflict type: ${(conflict as any).type}`
        };
    }
  }

  /**
   * Resolve: Same ha_entity_id but different entity_id
   */
  private async resolveSameHAIdDifferentEntityId(
    haState: HAEntityState,
    existingEntity: Entity
  ): Promise<ResolutionResult> {
    if (existingEntity.source === 'ha' || existingEntity.source === 'hybrid') {
      // HA is authoritative - update entity_id to match HA
      await query(
        `UPDATE entities 
         SET entity_id = $1, domain = $2
         WHERE id = $3`,
        [haState.entity_id, extractDomain(haState.entity_id), existingEntity.id]
      );
      
      // Update state
      await updateEntityState(
        existingEntity.id,
        haState.state,
        haState.attributes || {}
      );
      
      const updated = await getEntityByHAEntityId(haState.entity_id);
      return {
        action: 'update',
        entity: updated || existingEntity,
        message: `Updated entity_id to match HA: ${haState.entity_id}`
      };
    }
    
    if (existingEntity.source === 'internal') {
      // Internal entity exists with same ha_entity_id - this shouldn't happen
      // but if it does, create new HA entity
      return {
        action: 'create',
        message: 'Internal entity conflicts with HA entity, creating new HA entity',
        requiresUserAction: true
      };
    }
    
    return {
      action: 'error',
      message: `Cannot resolve conflict: existing entity source is ${existingEntity.source}`
    };
  }

  /**
   * Resolve: Same entity_id but different ha_entity_id
   */
  private async resolveSameEntityIdDifferentHAId(
    haState: HAEntityState,
    existingEntity: Entity,
    deviceId: string
  ): Promise<ResolutionResult> {
    if (existingEntity.source === 'internal') {
      // Create new HA entity with modified entity_id
      const newEntityId = `${haState.entity_id}_ha`;
      
      // Check if modified ID also exists
      const checkEntity = await getEntityByEntityId(newEntityId);
      if (checkEntity) {
        return {
          action: 'error',
          message: `Entity ID collision: ${newEntityId} already exists`
        };
      }
      
      // Create new entity
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
          newEntityId,
          domain,
          name,
          icon,
          haState.state,
          JSON.stringify(attributes),
          haState.last_changed || now,
          haState.last_updated || now,
          now,
          haState.entity_id,
          'ha'
        ]
      );
      
      if (result.length === 0) {
        return {
          action: 'error',
          message: 'Failed to create entity with modified ID'
        };
      }
      
      const created = await getEntityByHAEntityId(haState.entity_id);
      return {
        action: 'create',
        entity: created || undefined,
        message: `Created new HA entity with modified ID: ${newEntityId}`
      };
    }
    
    if (existingEntity.source === 'ha' || existingEntity.source === 'hybrid') {
      // This shouldn't happen due to unique constraint, but log it
      return {
        action: 'error',
        message: `HA entity with same entity_id but different ha_entity_id - possible data corruption`
      };
    }
    
    return {
      action: 'error',
      message: `Cannot resolve conflict: existing entity source is ${existingEntity.source}`
    };
  }

  /**
   * Resolve: Internal entity matches HA entity (should become hybrid)
   */
  private async resolveInternalMatchesHA(
    haState: HAEntityState,
    existingEntity: Entity
  ): Promise<ResolutionResult> {
    // Merge into hybrid entity
    await query(
      `UPDATE entities 
       SET source = 'hybrid',
           ha_entity_id = $1,
           domain = $2,
           state = $3,
           attributes = $4::jsonb,
           last_changed = $5,
           last_updated = $6
       WHERE id = $7`,
      [
        haState.entity_id,
        extractDomain(haState.entity_id),
        haState.state,
        JSON.stringify(haState.attributes || {}),
        haState.last_changed || new Date().toISOString(),
        haState.last_updated || new Date().toISOString(),
        existingEntity.id
      ]
    );
    
    const updated = await getEntityByHAEntityId(haState.entity_id);
    return {
      action: 'merge',
      entity: updated || existingEntity,
      message: `Merged internal entity with HA entity, converted to hybrid`
    };
  }

  /**
   * Resolve: Domain change
   */
  private async resolveDomainChange(
    haState: HAEntityState,
    existingEntity: Entity
  ): Promise<ResolutionResult> {
    const newDomain = extractDomain(haState.entity_id);
    
    // Update domain
    await query(
      `UPDATE entities 
       SET domain = $1
       WHERE id = $2`,
      [newDomain, existingEntity.id]
    );
    
    // Update state
    await updateEntityState(
      existingEntity.id,
      haState.state,
      haState.attributes || {}
    );
    
    const updated = await getEntityByHAEntityId(haState.entity_id);
    return {
      action: 'update',
      entity: updated || existingEntity,
      message: `Updated domain from ${existingEntity.domain} to ${newDomain}`
    };
  }

  /**
   * Resolve: Name change
   */
  private async resolveNameChange(
    haState: HAEntityState,
    existingEntity: Entity
  ): Promise<ResolutionResult> {
    const newName = deriveEntityName(haState);
    
    // Only update name if it's different (preserve user customizations if they exist)
    // For now, we'll update it - can be made configurable later
    await query(
      `UPDATE entities 
       SET name = $1
       WHERE id = $2`,
      [newName, existingEntity.id]
    );
    
    // Update state
    await updateEntityState(
      existingEntity.id,
      haState.state,
      haState.attributes || {}
    );
    
    const updated = await getEntityByHAEntityId(haState.entity_id);
    return {
      action: 'update',
      entity: updated || existingEntity,
      message: `Updated name from ${existingEntity.name} to ${newName}`
    };
  }
}

// Export singleton instance
export const entityConflictResolver = new EntityConflictResolver();
