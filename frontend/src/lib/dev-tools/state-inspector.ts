/**
 * State Inspector Service
 * 
 * Provides entity state inspection with filtering capabilities
 * for developer tools and debugging.
 */

import { query } from "@/lib/db";
import { Entity, getEntities, getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";

export interface EntityFilters {
  domain?: string;
  deviceId?: string;
  state?: string;
  source?: 'ha' | 'internal' | 'hybrid';
  limit?: number;
  offset?: number;
}

export interface EntityStats {
  total: number;
  byDomain: Record<string, number>;
  bySource: Record<string, number>;
  byState: Record<string, number>;
}

/**
 * State Inspector Service
 */
export class StateInspector {
  /**
   * Get entities with filtering
   */
  async getEntities(filters: EntityFilters): Promise<{ entities: Entity[]; total: number }> {
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
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.domain) {
      sql += ` AND domain = $${paramIndex}`;
      params.push(filters.domain);
      paramIndex++;
    }

    if (filters.deviceId) {
      sql += ` AND device_id = $${paramIndex}`;
      params.push(filters.deviceId);
      paramIndex++;
    }

    if (filters.state) {
      sql += ` AND state = $${paramIndex}`;
      params.push(filters.state);
      paramIndex++;
    }

    if (filters.source) {
      sql += ` AND source = $${paramIndex}`;
      params.push(filters.source);
      paramIndex++;
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM (${sql}) as filtered`;
    const countResult = await query<{ count: string }>(countSql, params);
    const total = parseInt(countResult[0]?.count || '0', 10);

    // Apply pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const rows = await query<Entity>(sql, params);
    
    const entities = rows.map(row => ({
      ...row,
      attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
      source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
    }));

    return { entities, total };
  }

  /**
   * Get entity by entityId
   */
  async getEntity(entityId: string): Promise<Entity | null> {
    return getEntityByEntityId(entityId);
  }

  /**
   * Get entity statistics
   */
  async getEntityStats(): Promise<EntityStats> {
    // Get total count
    const totalResult = await query<{ count: string }>(
      'SELECT COUNT(*) as count FROM entities'
    );
    const total = parseInt(totalResult[0]?.count || '0', 10);

    // Get counts by domain
    const domainResult = await query<{ domain: string; count: string }>(
      `SELECT domain, COUNT(*) as count 
       FROM entities 
       GROUP BY domain 
       ORDER BY count DESC`
    );
    const byDomain: Record<string, number> = {};
    domainResult.forEach(row => {
      byDomain[row.domain] = parseInt(row.count, 10);
    });

    // Get counts by source
    const sourceResult = await query<{ source: string; count: string }>(
      `SELECT source, COUNT(*) as count 
       FROM entities 
       GROUP BY source 
       ORDER BY count DESC`
    );
    const bySource: Record<string, number> = {};
    sourceResult.forEach(row => {
      bySource[row.source || 'internal'] = parseInt(row.count, 10);
    });

    // Get counts by state
    const stateResult = await query<{ state: string; count: string }>(
      `SELECT state, COUNT(*) as count 
       FROM entities 
       GROUP BY state 
       ORDER BY count DESC 
       LIMIT 20`
    );
    const byState: Record<string, number> = {};
    stateResult.forEach(row => {
      byState[row.state] = parseInt(row.count, 10);
    });

    return {
      total,
      byDomain,
      bySource,
      byState,
    };
  }
}

/**
 * Singleton instance
 */
let stateInspector: StateInspector | null = null;

/**
 * Get or create singleton instance
 */
export function getStateInspector(): StateInspector {
  if (!stateInspector) {
    stateInspector = new StateInspector();
  }
  return stateInspector;
}
