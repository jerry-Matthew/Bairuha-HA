/**
 * Home Assistant Device Discovery
 * 
 * Discovers devices available for setup from Home Assistant
 * Queries HA for discovered devices via config_entries and device_registry APIs
 */

import { haRestClient } from "./rest-client";
import type { DiscoveredDevice } from "@/components/addDevice/server/device.types";

/**
 * Home Assistant device registry entry
 */
interface HADeviceRegistryEntry {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  identifiers?: Array<[string, string]>;
  connections?: Array<[string, string]>;
  via_device_id?: string;
  config_entries?: string[];
  area_id?: string;
  name_by_user?: string;
}

/**
 * Home Assistant config entry
 */
interface HAConfigEntry {
  entry_id: string;
  domain: string;
  title: string;
  source: string;
  state: string;
  supports_options: boolean;
  supports_remove_device: boolean;
  supports_unload: boolean;
  disabled_by: string | null;
}

/**
 * Discover devices from Home Assistant
 * 
 * Returns devices that are:
 * - In HA's device registry but not yet registered in our system
 * - Available for setup (not disabled)
 * 
 * @returns Array of discovered devices
 */
export async function discoverDevicesFromHA(): Promise<DiscoveredDevice[]> {
  try {
    // Get HA credentials - if not configured, return empty array
    const { getConfigEntryByIntegration } = await import("@/components/globalAdd/server/config-entry.registry");
    const haConfig = await getConfigEntryByIntegration("homeassistant");
    
    if (!haConfig || haConfig.status !== "loaded") {
      // Home Assistant not configured - return empty discovery
      console.log("Home Assistant not configured, skipping HA device discovery");
      return [];
    }

    const client = haRestClient;
    
    // Get device registry from Home Assistant
    // Note: HA doesn't have a direct device registry API endpoint
    // We'll use the config_entries API and infer devices from entities
    // For now, we'll get devices via the states API and extract device info
    
    const states = await client.getStates();
    
    // Extract unique device identifiers from entities
    const deviceMap = new Map<string, DiscoveredDevice>();
    
    for (const state of states) {
      const attributes = state.attributes || {};
      const deviceId = attributes.device_id;
      const deviceName = attributes.device_name || attributes.friendly_name;
      
      if (!deviceId || !deviceName) {
        continue;
      }
      
      // Check if we already have this device
      if (deviceMap.has(deviceId)) {
        continue;
      }
      
      // Extract device info from entity attributes
      const manufacturer = attributes.device_manufacturer || attributes.manufacturer;
      const model = attributes.device_model || attributes.model;
      const viaDeviceId = attributes.via_device_id;
      
      // Extract integration domain from entity_id
      const domain = state.entity_id.split(".")[0];
      
      deviceMap.set(deviceId, {
        id: deviceId,
        name: deviceName,
        manufacturer: manufacturer || undefined,
        model: model || undefined,
        integrationDomain: domain,
        integrationName: domain, // Will be resolved later
        viaDeviceId: viaDeviceId || undefined,
        identifiers: attributes.device_identifiers || {},
        connections: attributes.device_connections || [],
      });
    }
    
    return Array.from(deviceMap.values());
  } catch (error: any) {
    // If HA is not available or not configured, return empty array
    console.warn("Device discovery from Home Assistant failed:", error.message);
    return [];
  }
}

/**
 * Discover devices from local protocols
 * 
 * This would scan for devices on:
 * - Zigbee (via coordinator)
 * - Z-Wave (via controller)
 * - Bluetooth (BLE scan)
 * - WiFi (network scan)
 * 
 * For now, this is a placeholder that returns empty array
 * In production, this would integrate with protocol-specific discovery
 */
export async function discoverDevicesFromProtocols(): Promise<DiscoveredDevice[]> {
  // TODO: Implement protocol-specific discovery
  // - Zigbee: Query coordinator for new devices
  // - Z-Wave: Query controller for new devices
  // - Bluetooth: Scan for BLE devices
  // - WiFi: Network scan for smart devices
  
  return [];
}

/**
 * Discover all available devices
 * 
 * Combines discovery from Home Assistant and local protocols
 * 
 * @returns Array of all discovered devices
 */
export async function discoverDevices(): Promise<DiscoveredDevice[]> {
  const [haDevices, protocolDevices] = await Promise.all([
    discoverDevicesFromHA(),
    discoverDevicesFromProtocols(),
  ]);
  
  // Merge and deduplicate devices
  const deviceMap = new Map<string, DiscoveredDevice>();
  
  for (const device of [...haDevices, ...protocolDevices]) {
    // Use device ID or name+manufacturer+model as key
    const key = device.id || `${device.name}-${device.manufacturer}-${device.model}`;
    if (!deviceMap.has(key)) {
      deviceMap.set(key, device);
    }
  }
  
  return Array.from(deviceMap.values());
}
