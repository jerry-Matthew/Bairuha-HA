/**
 * Manifest Mapper
 * 
 * Maps Home Assistant manifests to CatalogEntry format.
 * Shared utility for import script and sync service.
 */

import { HAManifest } from './github-client';
import { CatalogEntry } from './version-tracker';

type FlowType = 'none' | 'manual' | 'discovery' | 'oauth' | 'wizard' | 'hybrid';

interface FlowConfig {
  discovery_protocols?: {
    dhcp?: any[];
    zeroconf?: any[];
    ssdp?: any[];
    homekit?: any;
  };
  oauth_provider?: string;
  scopes?: string[];
  authorization_url?: string;
  token_url?: string;
  steps?: Array<{
    step_id: string;
    title: string;
    schema: any;
  }>;
  [key: string]: any;
}

function hasOAuthIndicators(manifest: HAManifest): boolean {
  const oauthKeywords = ['oauth', 'authlib', 'google', 'spotify', 'nest'];
  const deps = [...(manifest.dependencies || []), ...(manifest.requirements || [])];
  return deps.some(dep => oauthKeywords.some(keyword => dep.toLowerCase().includes(keyword)));
}

function detectFlowType(manifest: HAManifest): FlowType {
  if (!manifest.config_flow) {
    return 'none';
  }

  if (hasOAuthIndicators(manifest)) {
    return 'oauth';
  }

  const hasDiscovery = !!(manifest.dhcp || manifest.zeroconf || manifest.ssdp || manifest.homekit);
  if (hasDiscovery) {
    return 'discovery';
  }

  return 'manual';
}

function buildFlowConfig(manifest: HAManifest): FlowConfig | undefined {
  const config: FlowConfig = {};
  const discoveryProtocols: any = {};

  if (manifest.dhcp) discoveryProtocols.dhcp = manifest.dhcp;
  if (manifest.zeroconf) discoveryProtocols.zeroconf = manifest.zeroconf;
  if (manifest.ssdp) discoveryProtocols.ssdp = manifest.ssdp;
  if (manifest.homekit) discoveryProtocols.homekit = manifest.homekit;

  if (Object.keys(discoveryProtocols).length > 0) {
    config.discovery_protocols = discoveryProtocols;
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function buildMetadata(manifest: HAManifest): Record<string, any> {
  const metadata: Record<string, any> = {};
  
  if (manifest.requirements) metadata.requirements = manifest.requirements;
  if (manifest.dependencies) metadata.dependencies = manifest.dependencies;
  if (manifest.after_dependencies) metadata.after_dependencies = manifest.after_dependencies;
  if (manifest.codeowners) metadata.codeowners = manifest.codeowners;
  if (manifest.iot_class) metadata.iot_class = manifest.iot_class;
  
  return metadata;
}

function inferIconFromDomain(domain: string): string {
  // Simplified icon inference - full version is in import script
  const iconMap: Record<string, string> = {
    light: "mdi:lightbulb",
    switch: "mdi:toggle-switch",
    sensor: "mdi:gauge",
    climate: "mdi:thermostat",
    cover: "mdi:window-shutter",
    fan: "mdi:fan",
    lock: "mdi:lock",
    camera: "mdi:cctv",
    media_player: "mdi:play-circle",
    weather: "mdi:weather-cloudy",
    zigbee: "mdi:zigbee",
    zwave: "mdi:zwave",
    mqtt: "mdi:message-text",
    bluetooth: "mdi:bluetooth",
    wifi: "mdi:wifi",
  };

  const normalized = domain.toLowerCase();
  if (iconMap[normalized]) {
    return iconMap[normalized];
  }

  // Check for partial matches
  for (const [key, icon] of Object.entries(iconMap)) {
    if (normalized.includes(key)) {
      return icon;
    }
  }

  // Default icon
  return "mdi:puzzle";
}

/**
 * Map Home Assistant manifest to catalog entry
 */
export function mapManifestToCatalog(manifest: HAManifest, domain: string): CatalogEntry {
  const name = manifest.name || domain.split("_").map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");

  let documentation_url: string | undefined;
  if (manifest.documentation) {
    if (typeof manifest.documentation === "string") {
      documentation_url = manifest.documentation;
    } else if (Array.isArray(manifest.documentation) && manifest.documentation.length > 0) {
      documentation_url = manifest.documentation[0];
    }
  }

  const is_cloud = manifest.iot_class === "cloud_polling" || 
                   manifest.iot_class === "cloud_push";

  const supports_devices = manifest.config_flow === true || 
                          manifest.iot_class !== undefined ||
                          manifest.dhcp !== undefined ||
                          manifest.zeroconf !== undefined ||
                          manifest.ssdp !== undefined ||
                          manifest.homekit !== undefined;

  const description = `Home Assistant ${name} integration${manifest.config_flow ? " (supports config flow)" : ""}`;
  const icon = inferIconFromDomain(domain);
  const flowType = detectFlowType(manifest);
  const flowConfig = buildFlowConfig(manifest);
  const metadata = buildMetadata(manifest);

  return {
    domain: manifest.domain || domain,
    name,
    description,
    icon,
    supports_devices,
    is_cloud,
    documentation_url,
    flow_type: flowType,
    flow_config: flowConfig,
    handler_class: undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
