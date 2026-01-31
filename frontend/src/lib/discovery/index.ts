/**
 * Discovery Module
 * 
 * Exports discovery service and registers all discovery handlers
 */

import { discoveryService } from "./discovery-service";
import { HomeAssistantDiscoveryHandler } from "./handlers/homeassistant-discovery-handler";
import { MQTTDiscoveryHandler } from "./handlers/mqtt-discovery-handler";
import { ESPHomeDiscoveryHandler } from "./handlers/esphome-discovery-handler";
import { ZigbeeDiscoveryHandler } from "./handlers/zigbee-discovery-handler";
import { ZWaveDiscoveryHandler } from "./handlers/zwave-discovery-handler";
import { ZeroconfDiscoveryHandler } from "./handlers/zeroconf-discovery-handler";
import { SSDPDiscoveryHandler } from "./handlers/ssdp-discovery-handler";

// Register all discovery handlers
discoveryService.registerHandler("homeassistant", new HomeAssistantDiscoveryHandler());
discoveryService.registerHandler("mqtt", new MQTTDiscoveryHandler());
discoveryService.registerHandler("esphome", new ESPHomeDiscoveryHandler());
discoveryService.registerHandler("zigbee", new ZigbeeDiscoveryHandler());
discoveryService.registerHandler("zwave", new ZWaveDiscoveryHandler());
discoveryService.registerHandler("zeroconf", new ZeroconfDiscoveryHandler());
discoveryService.registerHandler("ssdp", new SSDPDiscoveryHandler());

export { discoveryService };
export * from "./discovery-handler";
export * from "./discovery-service";
