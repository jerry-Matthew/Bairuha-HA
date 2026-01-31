/**
 * Home Assistant Discovery Handler
 * 
 * Discovers devices from Home Assistant device registry
 */

import { BaseDiscoveryHandler } from "../discovery-handler";
import type { DiscoveredDevice } from "../discovery-handler";
import { haRestClient } from "@/lib/home-assistant/rest-client";

export class HomeAssistantDiscoveryHandler extends BaseDiscoveryHandler {
  getProtocolName(): string {
    return "homeassistant";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      const haConfig = await getConfigEntryByIntegration("homeassistant");
      return haConfig?.status === "loaded";
    } catch {
      return false;
    }
  }

  async discover(config?: any): Promise<DiscoveredDevice[]> {
    try {
      // Get HA credentials
      const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
      const haConfig = await getConfigEntryByIntegration("homeassistant");
      
      if (!haConfig || haConfig.status !== "loaded") {
        return [];
      }

      // Get device registry from HA
      // Use HA REST API to get devices
      const states = await haRestClient.getStates();
      
      const deviceMap = new Map<string, DiscoveredDevice>();
      
      for (const state of states) {
        const attributes = state.attributes || {};
        const deviceId = attributes.device_id;
        const deviceName = attributes.device_name || attributes.friendly_name;
        
        if (!deviceId || !deviceName) {
          continue;
        }
        
        if (deviceMap.has(deviceId)) {
          continue;
        }
        
        const domain = state.entity_id.split(".")[0];
        
        deviceMap.set(deviceId, {
          id: deviceId,
          name: deviceName,
          manufacturer: attributes.device_manufacturer || attributes.manufacturer,
          model: attributes.device_model || attributes.model,
          integrationDomain: domain,
          integrationName: domain,
          protocol: this.getProtocolName(),
          viaDeviceId: attributes.via_device_id,
          identifiers: attributes.device_identifiers || {},
          connections: attributes.device_connections || [],
          discoveredAt: new Date(),
        });
      }
      
      return Array.from(deviceMap.values());
    } catch (error: any) {
      console.warn("[HA Discovery] Failed:", error.message);
      return [];
    }
  }

  getTimeout(): number {
    return 15000; // 15 seconds for HA discovery
  }
}
