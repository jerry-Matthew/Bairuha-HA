/**
 * Entity Deletion Detection Service
 * 
 * Detects when entities are deleted from Home Assistant and handles them appropriately.
 * Supports soft delete (mark as unavailable) and hard delete (remove from registry).
 */

import { Entity, getHAEntities, updateEntityState } from "@/components/globalAdd/server/entity.registry";
import { haRestClient } from "./rest-client";
import { query } from "@/lib/db";

/**
 * Deletion configuration
 */
export interface DeletionConfig {
  strategy: 'soft' | 'hard' | 'preserve';
  preserveHistory: boolean;
  notifyUser: boolean;
}

/**
 * Deletion result
 */
export interface DeletionResult {
  deleted: number;
  markedUnavailable: number;
  convertedToInternal: number;
  errors: Array<{
    entityId: string;
    error: string;
  }>;
}

/**
 * Default deletion configuration
 */
const DEFAULT_CONFIG: DeletionConfig = {
  strategy: 'soft',
  preserveHistory: true,
  notifyUser: false
};

/**
 * Entity Deletion Detector
 */
export class EntityDeletionDetector {
  /**
   * Detect deleted entities from Home Assistant
   */
  async detectDeletedEntities(config: DeletionConfig = DEFAULT_CONFIG): Promise<DeletionResult> {
    const result: DeletionResult = {
      deleted: 0,
      markedUnavailable: 0,
      convertedToInternal: 0,
      errors: []
    };

    try {
      // Get all HA and hybrid entities from Bairuha registry
      const allHAEntities = await getHAEntities();

      if (allHAEntities.length === 0) {
        return result; // No HA entities to check
      }

      // Fetch current HA entities via REST API
      const currentHAStates = await haRestClient.getStates();
      const currentHAEntityIds = new Set(currentHAStates.map(s => s.entity_id));

      // Find entities that exist in Bairuha but not in HA
      for (const entity of allHAEntities) {
        if (!entity.haEntityId) {
          continue; // Skip entities without ha_entity_id (shouldn't happen, but safety check)
        }

        if (!currentHAEntityIds.has(entity.haEntityId)) {
          // Entity was deleted from HA
          try {
            await this.handleDeletedEntity(entity, config, result);
          } catch (error) {
            result.errors.push({
              entityId: entity.entityId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    } catch (error) {
      result.errors.push({
        entityId: 'DETECTION_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return result;
  }

  /**
   * Handle a deleted entity based on configuration
   */
  private async handleDeletedEntity(
    entity: Entity,
    config: DeletionConfig,
    result: DeletionResult
  ): Promise<void> {
    if (config.strategy === 'preserve') {
      // Do nothing - preserve entity as-is
      return;
    }

    if (config.strategy === 'soft') {
      // Soft delete: mark as unavailable, convert to internal if hybrid
      await updateEntityState(entity.id, 'unavailable', {
        ...entity.attributes,
        deleted_from_ha: true,
        deleted_at: new Date().toISOString()
      });

      if (entity.source === 'hybrid') {
        // Convert hybrid to internal
        await query(
          `UPDATE entities 
           SET source = 'internal',
               ha_entity_id = NULL
           WHERE id = $1`,
          [entity.id]
        );
        result.convertedToInternal++;
      } else {
        // Keep as HA but mark unavailable
        result.markedUnavailable++;
      }
    } else if (config.strategy === 'hard') {
      // Hard delete: remove from registry
      await query('DELETE FROM entities WHERE id = $1', [entity.id]);
      result.deleted++;
    }
  }

  /**
   * Clean up deleted entities (remove entities marked as deleted)
   */
  async cleanupDeletedEntities(): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM entities 
       WHERE state = 'unavailable' 
       AND attributes->>'deleted_from_ha' = 'true'`
    );

    const count = parseInt(result[0]?.count || '0', 10);

    if (count > 0) {
      await query(
        `DELETE FROM entities 
         WHERE state = 'unavailable' 
         AND attributes->>'deleted_from_ha' = 'true'`
      );
    }

    return count;
  }

  /**
   * Restore deleted entity (if it reappears in HA)
   */
  async restoreDeletedEntity(entityId: string): Promise<Entity | null> {
    const entity = await query<Entity>(
      `SELECT * FROM entities WHERE id = $1`,
      [entityId]
    );

    if (entity.length === 0) {
      return null;
    }

    // Remove deleted markers
    const attributes = typeof entity[0].attributes === 'string' 
      ? JSON.parse(entity[0].attributes) 
      : entity[0].attributes;
    
    delete attributes.deleted_from_ha;
    delete attributes.deleted_at;

    await query(
      `UPDATE entities 
       SET attributes = $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(attributes), entityId]
    );

    // Return updated entity (would need to fetch via entity registry)
    return null; // Simplified - would need proper entity fetch
  }
}

// Export singleton instance
export const entityDeletionDetector = new EntityDeletionDetector();
