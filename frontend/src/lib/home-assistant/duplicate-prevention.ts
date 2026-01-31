/**
 * Duplicate Prevention Service
 * 
 * Prevents duplicate entities by detecting potential duplicates before creation.
 * Uses fuzzy matching to detect similar entities.
 */

import { Entity, getEntityByHAEntityId, getEntityByEntityId, getEntities } from "@/components/globalAdd/server/entity.registry";

/**
 * Duplicate check result
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicates: Array<{
    entity: Entity;
    reason: string;
  }>;
  confidence: 'high' | 'medium' | 'low';
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
 * Simple fuzzy string matching
 */
function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase().replace(/\s+/g, '');
  const s2 = str2.toLowerCase().replace(/\s+/g, '');
  
  if (s1 === s2) return true;
  if (s1.includes(s2) || s2.includes(s1)) return true;
  
  const minLength = Math.min(s1.length, s2.length);
  const maxLength = Math.max(s1.length, s2.length);
  if (minLength === 0) return false;
  
  return minLength / maxLength >= 0.7;
}

/**
 * Duplicate Prevention Service
 */
export class DuplicatePreventionService {
  /**
   * Check for duplicates before creating an entity
   */
  async checkForDuplicates(
    entityId: string,
    haEntityId?: string,
    domain?: string,
    name?: string
  ): Promise<DuplicateCheckResult> {
    const duplicates: Array<{ entity: Entity; reason: string }> = [];
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Validate entityId
    if (!entityId) {
      return {
        isDuplicate: false,
        duplicates: [],
        confidence: 'low'
      };
    }

    // Check for exact ha_entity_id match
    if (haEntityId) {
      const existingByHAId = await getEntityByHAEntityId(haEntityId);
      if (existingByHAId) {
        duplicates.push({
          entity: existingByHAId,
          reason: `Exact ha_entity_id match: ${haEntityId}`
        });
        confidence = 'high';
      }
    }

    // Check for exact entity_id match
    const existingByEntityId = await getEntityByEntityId(entityId);
    if (existingByEntityId) {
      duplicates.push({
        entity: existingByEntityId,
        reason: `Exact entity_id match: ${entityId}`
      });
      confidence = 'high';
    }

    // Check for similar entities (fuzzy matching)
    if (domain || name) {
      const allEntities = await getEntities();
      const domainToCheck = domain || extractDomain(entityId);
      
      for (const entity of allEntities) {
        // Skip if already found as duplicate
        if (duplicates.some(d => d.entity.id === entity.id)) {
          continue;
        }

        // Check domain match
        if (entity.domain === domainToCheck) {
          // Check name similarity
          if (name && entity.name) {
            if (fuzzyMatch(name, entity.name)) {
              duplicates.push({
                entity,
                reason: `Similar name and domain: "${name}" vs "${entity.name}"`
              });
              if (confidence === 'low') confidence = 'medium';
            }
          }

          // Check entity_id similarity (without domain)
          const entityIdPart = entityId.split('.')[1] || '';
          const existingEntityIdPart = entity.entityId ? entity.entityId.split('.')[1] || '' : '';
          if (entityIdPart && existingEntityIdPart && fuzzyMatch(entityIdPart, existingEntityIdPart)) {
            duplicates.push({
              entity,
              reason: `Similar entity_id: "${entityId}" vs "${entity.entityId}"`
            });
            if (confidence === 'low') confidence = 'medium';
          }
        }
      }
    }

    return {
      isDuplicate: duplicates.length > 0,
      duplicates,
      confidence
    };
  }

  /**
   * Validate entity before creation (throws if duplicate)
   */
  async validateBeforeCreate(
    entityId: string,
    haEntityId?: string,
    domain?: string,
    name?: string
  ): Promise<void> {
    const check = await this.checkForDuplicates(entityId, haEntityId, domain, name);
    
    if (check.isDuplicate && check.confidence === 'high') {
      const reasons = check.duplicates.map(d => d.reason).join('; ');
      throw new Error(`Duplicate entity detected: ${reasons}`);
    }
  }
}

// Export singleton instance
export const duplicatePreventionService = new DuplicatePreventionService();
