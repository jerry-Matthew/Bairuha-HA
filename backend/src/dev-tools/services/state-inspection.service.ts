
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';

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

@Injectable()
export class StateInspectionService {
    constructor(@Inject('DATABASE_POOL') private pool: Pool) { }

    async getEntities(filters: EntityFilters) {
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

        const countSql = `SELECT COUNT(*) as count FROM (${sql}) as filtered`;
        const countResult = await this.pool.query(countSql, params);
        const total = parseInt(countResult.rows[0]?.count || '0', 10);

        const limit = filters.limit || 100;
        const offset = filters.offset || 0;
        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await this.pool.query(sql, params);

        const entities = result.rows.map(row => ({
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
            source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
        }));

        return { entities, total };
    }

    async getEntity(entityId: string) {
        const sql = `
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
          WHERE entity_id = $1
        `;
        const result = await this.pool.query(sql, [entityId]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return {
            ...row,
            attributes: typeof row.attributes === 'string' ? JSON.parse(row.attributes) : (row.attributes || {}),
            source: (row.source || 'internal') as 'ha' | 'internal' | 'hybrid'
        };
    }

    async getEntityStats(): Promise<EntityStats> {
        const totalResult = await this.pool.query('SELECT COUNT(*) as count FROM entities');
        const total = parseInt(totalResult.rows[0]?.count || '0', 10);

        // Get counts by domain
        const domainResult = await this.pool.query(
            `SELECT domain, COUNT(*) as count 
       FROM entities 
       GROUP BY domain 
       ORDER BY count DESC`
        );
        const byDomain: Record<string, number> = {};
        domainResult.rows.forEach(row => {
            byDomain[row.domain] = parseInt(row.count, 10);
        });

        // Get counts by source
        const sourceResult = await this.pool.query(
            `SELECT source, COUNT(*) as count 
       FROM entities 
       GROUP BY source 
       ORDER BY count DESC`
        );
        const bySource: Record<string, number> = {};
        sourceResult.rows.forEach(row => {
            bySource[row.source || 'internal'] = parseInt(row.count, 10);
        });

        // Get counts by state
        const stateResult = await this.pool.query(
            `SELECT state, COUNT(*) as count 
       FROM entities 
       GROUP BY state 
       ORDER BY count DESC 
       LIMIT 20`
        );
        const byState: Record<string, number> = {};
        stateResult.rows.forEach(row => {
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
