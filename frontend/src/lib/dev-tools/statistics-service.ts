/**
 * Statistics Service
 * 
 * Provides entity statistics and metrics calculation from state_history table
 * for developer tools and debugging.
 */

import { query } from '@/lib/db';
import { getEntities } from '@/components/globalAdd/server/entity.registry';

export interface StatisticsFilters {
  domain?: string;
  deviceId?: string;
  entityId?: string;
  timeRange?: string; // '1h', '24h', '7d', '30d', or ISO date range
  limit?: number;
  offset?: number;
}

export interface EntityStatistics {
  entityId: string;
  entityName: string;
  domain: string;
  stateChangeCount: number;
  currentState: string;
  lastChanged: string;
  lastUpdated: string;
  uptimePercentage: number;
  averageStateDuration: string;
  mostCommonState: string;
  stateDistribution: Record<string, number>;
}

export interface DomainStatistics {
  domain: string;
  entityCount: number;
  totalStateChanges: number;
  averageStateChanges: number;
  mostActiveEntity: string;
}

export interface DeviceStatistics {
  deviceId: string;
  deviceName: string;
  entityCount: number;
  totalStateChanges: number;
  averageStateChanges: number;
}

export interface SummaryStatistics {
  totalEntities: number;
  totalStateChanges: number;
  mostActiveEntity: string;
  mostActiveDomain: string;
  averageStateChangesPerEntity: number;
  timeRange: {
    start: string;
    end: string;
  };
}

/**
 * Statistics Service
 */
export class StatisticsService {
  /**
   * Parse time range string to start and end timestamps
   */
  private parseTimeRange(timeRange?: string): { start: string; end: string } {
    let end = new Date();
    let start: Date;

    if (!timeRange || timeRange === 'all') {
      // Default to last 24 hours
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '1h') {
      start = new Date(end.getTime() - 60 * 60 * 1000);
    } else if (timeRange === '24h') {
      start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === '7d') {
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      // Try to parse as ISO date range (start,end)
      const parts = timeRange.split(',');
      if (parts.length === 2) {
        start = new Date(parts[0]);
        end = new Date(parts[1]);
      } else {
        // Default to last 24 hours
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      }
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  /**
   * Get entity statistics
   */
  async getEntityStatistics(filters: StatisticsFilters): Promise<{
    statistics: EntityStatistics[];
    total: number;
    timeRange: { start: string; end: string };
  }> {
    const timeRange = this.parseTimeRange(filters.timeRange);

    // Build base query for state change counts
    let sql = `
      SELECT 
        sh.entity_id,
        COUNT(*) as state_change_count,
        MAX(sh.recorded_at) as last_recorded,
        COUNT(DISTINCT sh.state) as unique_states
      FROM state_history sh
      WHERE sh.recorded_at >= $1 AND sh.recorded_at <= $2
    `;

    const params: any[] = [timeRange.start, timeRange.end];
    let paramIndex = 3;

    // Apply filters
    if (filters.entityId) {
      sql += ` AND sh.entity_id = $${paramIndex}`;
      params.push(filters.entityId);
      paramIndex++;
    }

    sql += ` GROUP BY sh.entity_id`;

    // Get entity details to join
    const entities = await getEntities({});
    const entityMap = new Map(entities.map(e => [e.entityId, e]));

    // Apply domain filter if specified
    let filteredEntities = entities;
    if (filters.domain) {
      filteredEntities = entities.filter(e => e.domain === filters.domain);
    }
    if (filters.deviceId) {
      filteredEntities = filteredEntities.filter(e => e.deviceId === filters.deviceId);
    }

    // Get state history data
    const historyRows = await query<{
      entity_id: string;
      state_change_count: string;
      last_recorded: Date;
      unique_states: string;
    }>(sql, params);

    // Get current states and state distribution for each entity
    const statistics: EntityStatistics[] = [];

    for (const entity of filteredEntities.slice(
      filters.offset || 0,
      (filters.offset || 0) + (filters.limit || 100)
    )) {
      const historyRow = historyRows.find(h => h.entity_id === entity.entityId);
      
      // Get state distribution for this entity
      const distributionSql = `
        SELECT state, COUNT(*) as count
        FROM state_history
        WHERE entity_id = $1 AND recorded_at >= $2 AND recorded_at <= $3
        GROUP BY state
        ORDER BY count DESC
      `;
      const distributionRows = await query<{ state: string; count: string }>(
        distributionSql,
        [entity.entityId, timeRange.start, timeRange.end]
      );

      const stateDistribution: Record<string, number> = {};
      let mostCommonState = 'unknown';
      let maxCount = 0;

      for (const row of distributionRows) {
        const count = parseInt(row.count, 10);
        stateDistribution[row.state] = count;
        if (count > maxCount) {
          maxCount = count;
          mostCommonState = row.state;
        }
      }

      // Calculate uptime percentage (simplified - assumes 'on' or 'unavailable' states)
      const totalChanges = historyRow ? parseInt(historyRow.state_change_count, 10) : 0;
      const onCount = stateDistribution['on'] || 0;
      const uptimePercentage = totalChanges > 0 ? (onCount / totalChanges) * 100 : 0;

      // Calculate average state duration (simplified)
      const avgDuration = totalChanges > 0 
        ? `${Math.floor((24 * 60 * 60 * 1000) / totalChanges / 60)}m`
        : 'N/A';

      statistics.push({
        entityId: entity.entityId,
        entityName: entity.name || entity.entityId,
        domain: entity.domain,
        stateChangeCount: totalChanges,
        currentState: entity.state || 'unknown',
        lastChanged: entity.lastChanged?.toISOString() || new Date().toISOString(),
        lastUpdated: entity.lastUpdated?.toISOString() || new Date().toISOString(),
        uptimePercentage: Math.round(uptimePercentage * 10) / 10,
        averageStateDuration: avgDuration,
        mostCommonState,
        stateDistribution,
      });
    }

    return {
      statistics,
      total: filteredEntities.length,
      timeRange,
    };
  }

  /**
   * Get domain statistics
   */
  async getDomainStatistics(timeRange?: string): Promise<DomainStatistics[]> {
    const range = this.parseTimeRange(timeRange);

    // Get all entities grouped by domain
    const entities = await getEntities({});
    const domainMap = new Map<string, string[]>(); // domain -> entityIds

    for (const entity of entities) {
      if (!domainMap.has(entity.domain)) {
        domainMap.set(entity.domain, []);
      }
      domainMap.get(entity.domain)!.push(entity.entityId);
    }

    const statistics: DomainStatistics[] = [];

    for (const [domain, entityIds] of domainMap.entries()) {
      if (entityIds.length === 0) continue;

      // Get total state changes for this domain
      const sql = `
        SELECT COUNT(*) as total
        FROM state_history
        WHERE entity_id = ANY($1) AND recorded_at >= $2 AND recorded_at <= $3
      `;
      const result = await query<{ total: string }>(sql, [
        entityIds,
        range.start,
        range.end,
      ]);

      const totalStateChanges = parseInt(result[0]?.total || '0', 10);
      const averageStateChanges = entityIds.length > 0 
        ? Math.round((totalStateChanges / entityIds.length) * 10) / 10
        : 0;

      // Find most active entity
      const entityStatsSql = `
        SELECT entity_id, COUNT(*) as count
        FROM state_history
        WHERE entity_id = ANY($1) AND recorded_at >= $2 AND recorded_at <= $3
        GROUP BY entity_id
        ORDER BY count DESC
        LIMIT 1
      `;
      const mostActiveResult = await query<{ entity_id: string; count: string }>(
        entityStatsSql,
        [entityIds, range.start, range.end]
      );

      statistics.push({
        domain,
        entityCount: entityIds.length,
        totalStateChanges,
        averageStateChanges,
        mostActiveEntity: mostActiveResult[0]?.entity_id || 'N/A',
      });
    }

    return statistics.sort((a, b) => b.totalStateChanges - a.totalStateChanges);
  }

  /**
   * Get device statistics
   */
  async getDeviceStatistics(timeRange?: string): Promise<DeviceStatistics[]> {
    const range = this.parseTimeRange(timeRange);

    // Get all entities grouped by device
    const entities = await getEntities({});
    const deviceMap = new Map<string, { deviceName: string; entityIds: string[] }>();

    for (const entity of entities) {
      if (!entity.deviceId) continue;
      
      if (!deviceMap.has(entity.deviceId)) {
        deviceMap.set(entity.deviceId, {
          deviceName: entity.name || entity.deviceId,
          entityIds: [],
        });
      }
      deviceMap.get(entity.deviceId)!.entityIds.push(entity.entityId);
    }

    const statistics: DeviceStatistics[] = [];

    for (const [deviceId, device] of deviceMap.entries()) {
      if (device.entityIds.length === 0) continue;

      // Get total state changes for this device
      const sql = `
        SELECT COUNT(*) as total
        FROM state_history
        WHERE entity_id = ANY($1) AND recorded_at >= $2 AND recorded_at <= $3
      `;
      const result = await query<{ total: string }>(sql, [
        device.entityIds,
        range.start,
        range.end,
      ]);

      const totalStateChanges = parseInt(result[0]?.total || '0', 10);
      const averageStateChanges = device.entityIds.length > 0
        ? Math.round((totalStateChanges / device.entityIds.length) * 10) / 10
        : 0;

      statistics.push({
        deviceId,
        deviceName: device.deviceName,
        entityCount: device.entityIds.length,
        totalStateChanges,
        averageStateChanges,
      });
    }

    return statistics.sort((a, b) => b.totalStateChanges - a.totalStateChanges);
  }

  /**
   * Get summary statistics
   */
  async getSummaryStatistics(timeRange?: string): Promise<SummaryStatistics> {
    const range = this.parseTimeRange(timeRange);

    // Get total entities
    const entities = await getEntities({});
    const totalEntities = entities.length;

    // Get total state changes
    const totalChangesSql = `
      SELECT COUNT(*) as total
      FROM state_history
      WHERE recorded_at >= $1 AND recorded_at <= $2
    `;
    const totalResult = await query<{ total: string }>(totalChangesSql, [
      range.start,
      range.end,
    ]);
    const totalStateChanges = parseInt(totalResult[0]?.total || '0', 10);

    // Get most active entity
    const mostActiveEntitySql = `
      SELECT entity_id, COUNT(*) as count
      FROM state_history
      WHERE recorded_at >= $1 AND recorded_at <= $2
      GROUP BY entity_id
      ORDER BY count DESC
      LIMIT 1
    `;
    const mostActiveEntityResult = await query<{ entity_id: string; count: string }>(
      mostActiveEntitySql,
      [range.start, range.end]
    );
    const mostActiveEntity = mostActiveEntityResult[0]?.entity_id || 'N/A';

    // Get most active domain
    const domainStats = await this.getDomainStatistics(timeRange);
    const mostActiveDomain = domainStats.length > 0 ? domainStats[0].domain : 'N/A';

    const averageStateChangesPerEntity = totalEntities > 0
      ? Math.round((totalStateChanges / totalEntities) * 10) / 10
      : 0;

    return {
      totalEntities,
      totalStateChanges,
      mostActiveEntity,
      mostActiveDomain,
      averageStateChangesPerEntity,
      timeRange: range,
    };
  }
}

/**
 * Singleton instance
 */
let statisticsService: StatisticsService | null = null;

/**
 * Get or create singleton instance
 */
export function getStatisticsService(): StatisticsService {
  if (!statisticsService) {
    statisticsService = new StatisticsService();
  }
  return statisticsService;
}
