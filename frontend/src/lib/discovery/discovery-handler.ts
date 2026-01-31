/**
 * Discovery Handler Interface
 * 
 * Defines the interface for protocol-specific discovery handlers
 */

export interface DiscoveredDevice {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  integrationDomain?: string;
  integrationName?: string;
  protocol: string; // Protocol that discovered this device
  viaDeviceId?: string;
  identifiers?: Record<string, string>;
  connections?: Array<[string, string]>;
  config?: Record<string, any>; // Protocol-specific configuration
  discoveredAt: Date;
}

export interface DiscoveryHandler {
  /**
   * Get the protocol name (e.g., "mqtt", "esphome", "zigbee")
   */
  getProtocolName(): string;

  /**
   * Check if this discovery protocol is available/configured
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get configuration schema for this protocol
   */
  getConfigSchema(): any;

  /**
   * Discover devices using this protocol
   */
  discover(config?: any): Promise<DiscoveredDevice[]>;

  /**
   * Get timeout for discovery (in milliseconds)
   */
  getTimeout(): number;
}

export abstract class BaseDiscoveryHandler implements DiscoveryHandler {
  abstract getProtocolName(): string;
  abstract isAvailable(): Promise<boolean>;
  abstract discover(config?: any): Promise<DiscoveredDevice[]>;

  getConfigSchema(): any {
    return {}; // Default: no config required
  }

  getTimeout(): number {
    return 10000; // Default: 10 seconds
  }
}
