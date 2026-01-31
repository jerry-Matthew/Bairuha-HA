/**
 * System Info Service
 * 
 * Provides system health checks, version information, and configuration
 * for developer tools and debugging.
 */

import { query } from "@/lib/db";
import { createHARestClient } from "@/lib/home-assistant/rest-client";
import { getWebSocketServer } from "@/components/realtime/websocket.server";
import { getStateInspector } from "./state-inspector";

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'connected' | 'disconnected';
  responseTime?: string;
  error?: string;
  [key: string]: any;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    database: HealthCheck;
    homeAssistant: HealthCheck;
    websocket: HealthCheck;
  };
  timestamp: string;
}

export interface SystemInfo {
  version: string;
  environment: string;
  nodeVersion: string;
  database: {
    type: string;
    version?: string;
    connected: boolean;
  };
  homeAssistant: {
    connected: boolean;
    baseUrl?: string;
    version?: string;
    integrationStatus?: string;
  };
  features: Record<string, boolean>;
  statistics: {
    totalEntities: number;
    totalDevices: number;
    totalAutomations: number;
    totalGroups: number;
  };
}

/**
 * System Info Service
 */
export class SystemInfoService {
  /**
   * Get system health
   */
  async getHealth(): Promise<SystemHealth> {
    const timestamp = new Date().toISOString();
    const checks = {
      database: await this.checkDatabaseHealth(),
      homeAssistant: await this.checkHomeAssistantHealth(),
      websocket: await this.checkWebSocketHealth(),
    };

    // Determine overall status
    const allHealthy = Object.values(checks).every(
      check => check.status === 'healthy' || check.status === 'connected'
    );
    const anyUnhealthy = Object.values(checks).some(
      check => check.status === 'unhealthy' || check.status === 'disconnected'
    );

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (anyUnhealthy) {
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      checks,
      timestamp,
    };
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    // Get database info
    const dbInfo = await this.getDatabaseInfo();

    // Get HA info
    const haInfo = await this.getHomeAssistantInfo();

    // Get statistics
    const stats = await this.getStatistics();

    return {
      version: (import.meta.env || {}).npm_package_version || '1.0.0',
      environment: (import.meta.env || {}).NODE_ENV || 'development',
      nodeVersion: process.version,
      database: dbInfo,
      homeAssistant: haInfo,
      features: {
        automations: true, // Task 37 complete
        scenes: false, // Task 40 not done
        scripts: false, // Task 42 not done
        groups: true, // Task 41 complete
        history: true, // Task 39 complete
      },
      statistics: stats,
    };
  }

  /**
   * Get system configuration (non-sensitive)
   */
  getSystemConfig(): Record<string, any> {
    return {
      database: {
        host: (import.meta.env || {}).DB_HOST || 'localhost',
        port: parseInt((import.meta.env || {}).DB_PORT || '5432', 10),
        database: (import.meta.env || {}).DB_NAME || 'bairuha_ha',
        poolSize: parseInt((import.meta.env || {}).DB_POOL_SIZE || '10', 10),
      },
      homeAssistant: {
        baseUrl: (import.meta.env || {}).HA_BASE_URL || 'http://localhost:8123',
        timeout: parseInt((import.meta.env || {}).HA_TIMEOUT || '30000', 10),
        retryAttempts: parseInt((import.meta.env || {}).HA_RETRY_ATTEMPTS || '3', 10),
      },
      websocket: {
        port: parseInt((import.meta.env || {}).WS_PORT || '3001', 10),
        corsOrigin: (import.meta.env || {}).WS_CORS_ORIGIN || '*',
      },
      features: {
        enableAutomations: true,
        enableHistory: true,
        enableGroups: true,
      },
    };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await query('SELECT 1');
      const responseTime = `${Date.now() - start}ms`;
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message || 'Database connection failed',
      };
    }
  }

  /**
   * Check Home Assistant health
   */
  private async checkHomeAssistantHealth(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const client = createHARestClient();
      const config = await client.getConfig();
      const responseTime = `${Date.now() - start}ms`;
      return {
        status: 'connected',
        responseTime,
        baseUrl: config.location_name || 'Unknown',
        version: config.version || 'Unknown',
      };
    } catch (error: any) {
      return {
        status: 'disconnected',
        error: error.message || 'Home Assistant connection failed',
      };
    }
  }

  /**
   * Check WebSocket health
   */
  private async checkWebSocketHealth(): Promise<HealthCheck> {
    const server = getWebSocketServer();
    if (!server) {
      return {
        status: 'disconnected',
        error: 'WebSocket server not initialized',
      };
    }

    const connectedClients = server.sockets.sockets.size;
    return {
      status: 'connected',
      connectedClients,
    };
  }

  /**
   * Get database information
   */
  private async getDatabaseInfo(): Promise<{
    type: string;
    version?: string;
    connected: boolean;
  }> {
    try {
      const result = await query<{ version: string }>('SELECT version() as version');
      const version = result[0]?.version || 'Unknown';
      return {
        type: 'PostgreSQL',
        version: version.split(' ')[1] || 'Unknown',
        connected: true,
      };
    } catch (error) {
      return {
        type: 'PostgreSQL',
        connected: false,
      };
    }
  }

  /**
   * Get Home Assistant information
   */
  private async getHomeAssistantInfo(): Promise<{
    connected: boolean;
    baseUrl?: string;
    version?: string;
    integrationStatus?: string;
  }> {
    try {
      const client = createHARestClient();
      const config = await client.getConfig();
      return {
        connected: true,
        baseUrl: config.location_name || 'Unknown',
        version: config.version || 'Unknown',
        integrationStatus: 'loaded',
      };
    } catch (error) {
      return {
        connected: false,
      };
    }
  }

  /**
   * Get system statistics
   */
  private async getStatistics(): Promise<{
    totalEntities: number;
    totalDevices: number;
    totalAutomations: number;
    totalGroups: number;
  }> {
    try {
      // Get entity count
      const entityResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM entities');
      const totalEntities = parseInt(entityResult[0]?.count || '0', 10);

      // Get device count
      const deviceResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM devices');
      const totalDevices = parseInt(deviceResult[0]?.count || '0', 10);

      // Get automation count
      const automationResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM automations');
      const totalAutomations = parseInt(automationResult[0]?.count || '0', 10);

      // Get group count
      const groupResult = await query<{ count: string }>('SELECT COUNT(*) as count FROM groups');
      const totalGroups = parseInt(groupResult[0]?.count || '0', 10);

      return {
        totalEntities,
        totalDevices,
        totalAutomations,
        totalGroups,
      };
    } catch (error) {
      return {
        totalEntities: 0,
        totalDevices: 0,
        totalAutomations: 0,
        totalGroups: 0,
      };
    }
  }
}

/**
 * Singleton instance
 */
let systemInfoService: SystemInfoService | null = null;

/**
 * Get or create singleton instance
 */
export function getSystemInfoService(): SystemInfoService {
  if (!systemInfoService) {
    systemInfoService = new SystemInfoService();
  }
  return systemInfoService;
}
