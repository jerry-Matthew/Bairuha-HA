/**
 * Entity Source Migration Service
 * 
 * Handles migration of entities between source types (ha, internal, hybrid).
 * Validates source transitions and ensures data consistency.
 */

import { Entity, getEntityById, getEntityByHAEntityId } from "@/components/globalAdd/server/entity.registry";
import { query } from "@/lib/db";

/**
 * Source migration result
 */
export interface MigrationResult {
  success: boolean;
  entity?: Entity;
  message: string;
  error?: string;
}

/**
 * Valid source transitions
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  'internal': ['ha', 'hybrid'],
  'ha': ['internal', 'hybrid'],
  'hybrid': ['internal', 'ha']
};

/**
 * Entity Source Migration Service
 */
export class EntitySourceMigrationService {
  /**
   * Migrate entity source
   */
  async migrateEntitySource(
    entityId: string,
    newSource: 'ha' | 'internal' | 'hybrid',
    haEntityId?: string
  ): Promise<MigrationResult> {
    // Get entity
    const entity = await getEntityById(entityId);
    if (!entity) {
      return {
        success: false,
        message: 'Entity not found',
        error: `Entity with ID ${entityId} not found`
      };
    }

    const currentSource = entity.source;

    // Validate transition
    if (!this.isValidTransition(currentSource, newSource)) {
      return {
        success: false,
        message: `Invalid source transition: ${currentSource} → ${newSource}`,
        error: `Cannot migrate from ${currentSource} to ${newSource}`
      };
    }

    // Validate ha_entity_id consistency
    const validationError = this.validateHAEntityId(newSource, haEntityId, entity.haEntityId);
    if (validationError) {
      return {
        success: false,
        message: validationError,
        error: validationError
      };
    }

    // Perform migration
    try {
      if (newSource === 'internal') {
        // Remove ha_entity_id
        await query(
          `UPDATE entities 
           SET source = 'internal',
               ha_entity_id = NULL
           WHERE id = $1`,
          [entityId]
        );
      } else if (newSource === 'ha') {
        // Set ha_entity_id (use provided or existing)
        const haId = haEntityId || entity.haEntityId;
        if (!haId) {
          return {
            success: false,
            message: 'ha_entity_id is required for HA source',
            error: 'Cannot migrate to HA source without ha_entity_id'
          };
        }

        // Check if ha_entity_id is already used
        const existing = await getEntityByHAEntityId(haId);
        if (existing && existing.id !== entityId) {
          return {
            success: false,
            message: `ha_entity_id ${haId} is already in use`,
            error: `Another entity already uses ha_entity_id: ${haId}`
          };
        }

        await query(
          `UPDATE entities 
           SET source = 'ha',
               ha_entity_id = $1
           WHERE id = $2`,
          [haId, entityId]
        );
      } else if (newSource === 'hybrid') {
        // Set ha_entity_id (use provided or existing)
        const haId = haEntityId || entity.haEntityId;
        if (!haId) {
          return {
            success: false,
            message: 'ha_entity_id is required for hybrid source',
            error: 'Cannot migrate to hybrid source without ha_entity_id'
          };
        }

        // Check if ha_entity_id is already used
        const existing = await getEntityByHAEntityId(haId);
        if (existing && existing.id !== entityId) {
          return {
            success: false,
            message: `ha_entity_id ${haId} is already in use`,
            error: `Another entity already uses ha_entity_id: ${haId}`
          };
        }

        await query(
          `UPDATE entities 
           SET source = 'hybrid',
               ha_entity_id = $1
           WHERE id = $2`,
          [haId, entityId]
        );
      }

      // Get updated entity
      const updated = await getEntityById(entityId);
      if (!updated) {
        return {
          success: false,
          message: 'Failed to retrieve updated entity',
          error: 'Entity migration completed but retrieval failed'
        };
      }

      return {
        success: true,
        entity: updated,
        message: `Successfully migrated entity from ${currentSource} to ${newSource}`
      };
    } catch (error) {
      return {
        success: false,
        message: 'Migration failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if source transition is valid
   */
  private isValidTransition(currentSource: string, newSource: string): boolean {
    if (currentSource === newSource) {
      return true; // No change needed
    }

    const validTargets = VALID_TRANSITIONS[currentSource];
    return validTargets ? validTargets.includes(newSource) : false;
  }

  /**
   * Validate ha_entity_id consistency with source
   */
  private validateHAEntityId(
    source: 'ha' | 'internal' | 'hybrid',
    providedHAId?: string,
    existingHAId?: string
  ): string | null {
    if (source === 'internal') {
      // Internal entities must not have ha_entity_id
      if (providedHAId) {
        return 'Internal entities cannot have ha_entity_id';
      }
    } else {
      // HA and hybrid entities must have ha_entity_id
      const haId = providedHAId || existingHAId;
      if (!haId) {
        return `${source} entities must have ha_entity_id`;
      }
    }

    return null;
  }
}

// Export singleton instance
export const entitySourceMigrationService = new EntitySourceMigrationService();
