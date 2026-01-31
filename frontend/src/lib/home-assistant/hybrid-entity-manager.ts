/**
 * Hybrid Entity Manager
 * 
 * Handles entities that exist in both Bairuha and Home Assistant.
 * Manages merging internal entities with HA entities to create hybrid entities.
 */

import { Entity, getEntityByHAEntityId, updateEntityState } from "@/components/globalAdd/server/entity.registry";
import { HAEntityState } from "./rest-client";
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
 * Simple fuzzy string matching
 */
function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');
  
  // Exact match
  if (s1 === s2) return true;
  
  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  // Similarity check (simple - can be enhanced with Levenshtein distance)
  const minLength = Math.min(s1.length, s2.length);
  const maxLength = Math.max(s1.length, s2.length);
  if (minLength === 0) return false;
  
  // If shorter string is at least 70% of longer string, consider it a match
  return minLength / maxLength >= 0.7;
}

/**
 * Hybrid Entity Manager
 */
export class HybridEntityManager {
  /**
   * Check if internal entity matches HA entity
   */
  matchesHAEntity(internalEntity: Entity, haState: HAEntityState): boolean {
    // Must be same domain
    if (internalEntity.domain !== extractDomain(haState.entity_id)) {
      return false;
    }
    
    // Check name similarity
    const haName = deriveEntityName(haState);
    const internalName = internalEntity.name || '';
    
    if (fuzzyMatch(internalName, haName)) {
      return true;
    }
    
    // Check if entity IDs are similar (without domain)
    const haEntityIdPart = haState.entity_id ? haState.entity_id.split('.')[1] || '' : '';
    const internalEntityIdPart = internalEntity.entityId ? internalEntity.entityId.split('.')[1] || '' : '';
    
    if (haEntityIdPart && internalEntityIdPart && fuzzyMatch(haEntityIdPart, internalEntityIdPart)) {
      return true;
    }
    
    return false;
  }

  /**
   * Merge internal entity with HA entity to create hybrid entity
   */
  async mergeInternalWithHA(
    internalEntity: Entity,
    haState: HAEntityState
  ): Promise<Entity> {
    // Update entity to hybrid
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
        internalEntity.id
      ]
    );
    
    // Preserve Bairuha name/icon if user has customized them
    // (For now, we'll use HA name - can be enhanced to preserve customizations)
    const haName = deriveEntityName(haState);
    const haIcon = haState.attributes?.icon || null;
    
    // Only update if different (preserve user customizations)
    if (internalEntity.name !== haName || internalEntity.icon !== haIcon) {
      // Keep internal name/icon if they were customized
      // This is a simple heuristic - can be enhanced
      const defaultName = internalEntity.entityId ? `${internalEntity.entityId.split('.')[1]} Power` : 'Power';
      const preserveName = internalEntity.name && 
                          internalEntity.name !== defaultName; // Default pattern
      
      await query(
        `UPDATE entities 
         SET name = $1,
             icon = $2
         WHERE id = $3`,
        [
          preserveName ? internalEntity.name : haName,
          internalEntity.icon || haIcon,
          internalEntity.id
        ]
      );
    }
    
    // Get updated entity
    const updated = await getEntityByHAEntityId(haState.entity_id);
    if (!updated) {
      throw new Error('Failed to retrieve merged entity');
    }
    
    return updated;
  }

  /**
   * Find potential hybrid matches for an HA entity
   */
  async findPotentialMatches(haState: HAEntityState): Promise<Entity[]> {
    const domain = extractDomain(haState.entity_id);
    const haName = deriveEntityName(haState);
    
    // Get all internal entities with same domain
    const internalEntities = await query<Entity>(
      `SELECT * FROM entities 
       WHERE source = 'internal' 
       AND domain = $1`,
      [domain]
    );
    
    // Filter by name similarity
    const matches: Entity[] = [];
    for (const entity of internalEntities) {
      if (this.matchesHAEntity(entity, haState)) {
        matches.push({
          ...entity,
          attributes: typeof entity.attributes === 'string' 
            ? JSON.parse(entity.attributes) 
            : entity.attributes
        });
      }
    }
    
    return matches;
  }
}

// Export singleton instance
export const hybridEntityManager = new HybridEntityManager();
