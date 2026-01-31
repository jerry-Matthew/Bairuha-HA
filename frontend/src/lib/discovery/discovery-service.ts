/**
 * Discovery Service Framework
 * 
 * Central discovery service that coordinates protocol-specific handlers
 */

import type { DiscoveryHandler, DiscoveredDevice } from "./discovery-handler";
import type { FlowConfig } from "@/lib/config-flow/flow-type-resolver";

class DiscoveryService {
  private handlers = new Map<string, DiscoveryHandler>();
  private discoveryCache = new Map<string, { devices: DiscoveredDevice[]; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Register a discovery handler for a protocol
   */
  registerHandler(protocol: string, handler: DiscoveryHandler): void {
    this.handlers.set(protocol, handler);
  }

  /**
   * Get supported protocols for an integration based on flow_config
   */
  async getSupportedProtocols(integrationDomain: string, flowConfig?: FlowConfig): Promise<string[]> {
    if (!flowConfig?.discovery_protocols) {
      return [];
    }

    const protocols: string[] = [];
    const discoveryProtocols = flowConfig.discovery_protocols;

    // Map flow_config discovery_protocols to handler names
    if (discoveryProtocols.dhcp) protocols.push("dhcp");
    if (discoveryProtocols.zeroconf) protocols.push("zeroconf");
    if (discoveryProtocols.ssdp) protocols.push("ssdp");
    if (discoveryProtocols.homekit) protocols.push("homekit");
    if (discoveryProtocols.mqtt) protocols.push("mqtt");
    if (discoveryProtocols.esphome) protocols.push("esphome");
    if (discoveryProtocols.zigbee) protocols.push("zigbee");
    if (discoveryProtocols.zwave) protocols.push("zwave");

    // Filter to only available protocols
    const availableProtocols: string[] = [];
    for (const protocol of protocols) {
      const handler = this.handlers.get(protocol);
      if (handler && await handler.isAvailable()) {
        availableProtocols.push(protocol);
      }
    }

    return availableProtocols;
  }

  /**
   * Discover devices for an integration
   */
  async discoverDevices(
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<DiscoveredDevice[]> {
    const cacheKey = `${integrationDomain}-${JSON.stringify(flowConfig)}`;
    const cached = this.discoveryCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.devices;
    }

    const supportedProtocols = await this.getSupportedProtocols(integrationDomain, flowConfig);

    if (supportedProtocols.length === 0) {
      // Fallback to Home Assistant discovery if no protocols specified
      const haHandler = this.handlers.get("homeassistant");
      if (haHandler && await haHandler.isAvailable()) {
        return await haHandler.discover();
      }
      return [];
    }

    // Discover from all supported protocols in parallel
    const discoveryPromises = supportedProtocols.map(async (protocol) => {
      const handler = this.handlers.get(protocol);
      if (!handler) {
        return [];
      }

      try {
        const protocolConfig = this.getProtocolConfig(protocol, flowConfig);
        const devices = await Promise.race([
          handler.discover(protocolConfig),
          new Promise<DiscoveredDevice[]>((_, reject) =>
            setTimeout(() => reject(new Error(`Discovery timeout for ${protocol}`)), handler.getTimeout())
          ),
        ]);

        return devices.map(device => ({
          ...device,
          protocol: handler.getProtocolName(),
        }));
      } catch (error: any) {
        console.warn(`[Discovery] Failed to discover devices via ${protocol}:`, error.message);
        return [];
      }
    });

    const results = await Promise.all(discoveryPromises);
    const allDevices = results.flat();

    // Deduplicate devices by identifiers
    const deviceMap = new Map<string, DiscoveredDevice>();
    for (const device of allDevices) {
      const key = this.getDeviceKey(device);
      if (!deviceMap.has(key)) {
        deviceMap.set(key, device);
      }
    }

    const devices = Array.from(deviceMap.values());

    // Cache results
    this.discoveryCache.set(cacheKey, {
      devices,
      timestamp: Date.now(),
    });

    return devices;
  }

  /**
   * Get discovered devices from cache for a domain
   */
  getDiscoveredDevices(integrationDomain: string): DiscoveredDevice[] {
    // Iterate cache to find matching entries
    const devices: DiscoveredDevice[] = [];
    for (const [key, cached] of this.discoveryCache.entries()) {
      if (key.startsWith(`${integrationDomain}-`)) {
        devices.push(...cached.devices);
      }
    }
    return devices;
  }

  /**
   * Refresh discovery (clear cache and rediscover)
   */
  async refreshDiscovery(integrationDomain: string, flowConfig?: FlowConfig): Promise<DiscoveredDevice[]> {
    const cacheKey = `${integrationDomain}-${JSON.stringify(flowConfig)}`;
    this.discoveryCache.delete(cacheKey);
    return this.discoverDevices(integrationDomain, flowConfig);
  }

  /**
   * Get protocol-specific configuration from flow_config
   */
  private getProtocolConfig(protocol: string, flowConfig?: FlowConfig): any {
    if (!flowConfig?.discovery_protocols) {
      return {};
    }

    const protocols = flowConfig.discovery_protocols;
    switch (protocol) {
      case "dhcp":
        return protocols.dhcp || {};
      case "zeroconf":
        return protocols.zeroconf || {};
      case "ssdp":
        return protocols.ssdp || {};
      case "homekit":
        return protocols.homekit || {};
      case "mqtt":
        return protocols.mqtt || {};
      case "esphome":
        return protocols.esphome || {};
      case "zigbee":
        return protocols.zigbee || {};
      case "zwave":
        return protocols.zwave || {};
      default:
        return {};
    }
  }

  /**
   * Generate unique key for device deduplication
   */
  private getDeviceKey(device: DiscoveredDevice): string {
    // Use identifiers if available
    if (device.identifiers && Object.keys(device.identifiers).length > 0) {
      const idParts = Object.entries(device.identifiers)
        .map(([key, value]) => `${key}:${value}`)
        .sort()
        .join("|");
      return `${device.protocol}:${idParts}`;
    }

    // Use connections if available
    if (device.connections && device.connections.length > 0) {
      const connParts = device.connections
        .map(([type, value]) => `${type}:${value}`)
        .sort()
        .join("|");
      return `${device.protocol}:${connParts}`;
    }

    // Fallback to name + manufacturer + model
    return `${device.protocol}:${device.name}-${device.manufacturer || ""}-${device.model || ""}`;
  }
}

// Singleton instance
export const discoveryService = new DiscoveryService();
