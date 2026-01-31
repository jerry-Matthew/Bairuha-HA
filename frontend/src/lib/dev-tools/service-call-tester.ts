/**
 * Service Call Tester Service
 * 
 * Provides testing capabilities for Home Assistant service calls
 * for developer tools and debugging.
 */

import { getHAServiceCallService } from "@/lib/home-assistant/service-call";
import { getEntityByEntityId } from "@/components/globalAdd/server/entity.registry";
import { createHARestClient } from "@/lib/home-assistant/rest-client";

export interface ServiceCallTestParams {
  domain: string;
  service: string;
  serviceData?: Record<string, any>;
}

export interface ServiceCallTestResult {
  success: boolean;
  serviceCall: ServiceCallTestParams;
  haResponse?: any;
  error?: string;
  haError?: any;
  executedAt: string;
}

/**
 * Service Call Tester Service
 */
export class ServiceCallTester {
  private haServiceCallService = getHAServiceCallService();
  private haRestClient = createHARestClient();

  /**
   * Execute a service call for testing
   */
  async testServiceCall(params: ServiceCallTestParams): Promise<ServiceCallTestResult> {
    const executedAt = new Date().toISOString();

    try {
      // If entity_id is provided, validate it exists
      if (params.serviceData?.entity_id) {
        const entity = await getEntityByEntityId(params.serviceData.entity_id);
        if (!entity) {
          return {
            success: false,
            serviceCall: params,
            error: `Entity not found: ${params.serviceData.entity_id}`,
            executedAt,
          };
        }
      }

      // Execute service call directly via REST client
      const haResponse = await this.haRestClient.callService(
        params.domain,
        params.service,
        params.serviceData || {}
      );

      return {
        success: true,
        serviceCall: params,
        haResponse,
        executedAt,
      };
    } catch (error: any) {
      return {
        success: false,
        serviceCall: params,
        error: error.message || "Service call failed",
        haError: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        executedAt,
      };
    }
  }

  /**
   * Get available services for a domain
   * Note: This requires HA API access to /api/services endpoint
   */
  async getAvailableServices(domain: string): Promise<string[]> {
    try {
      // Try to get services from HA API
      // This is a simplified implementation - full implementation would call HA's /api/services endpoint
      const commonServices: Record<string, string[]> = {
        light: ['turn_on', 'turn_off', 'toggle', 'set_brightness', 'set_color', 'set_color_temp'],
        switch: ['turn_on', 'turn_off', 'toggle'],
        climate: ['turn_on', 'turn_off', 'set_temperature', 'set_hvac_mode'],
        cover: ['open_cover', 'close_cover', 'stop_cover', 'set_cover_position'],
        fan: ['turn_on', 'turn_off', 'set_speed'],
        lock: ['lock', 'unlock'],
      };

      return commonServices[domain] || ['turn_on', 'turn_off', 'toggle'];
    } catch (error) {
      console.error("Error getting available services:", error);
      return [];
    }
  }

  /**
   * Get service schema
   * Note: This would require HA API access to /api/services/{domain}/{service} endpoint
   */
  async getServiceSchema(domain: string, service: string): Promise<any> {
    // This is a placeholder - full implementation would call HA's service schema endpoint
    return {
      domain,
      service,
      fields: {},
      description: `Service ${domain}.${service}`,
    };
  }
}

/**
 * Singleton instance
 */
let serviceCallTester: ServiceCallTester | null = null;

/**
 * Get or create singleton instance
 */
export function getServiceCallTester(): ServiceCallTester {
  if (!serviceCallTester) {
    serviceCallTester = new ServiceCallTester();
  }
  return serviceCallTester;
}
