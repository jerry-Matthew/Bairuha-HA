/**
 * Config Flow Logic Registry
 * 
 * Maps integration domains to their dynamic config flow handlers.
 */

import { BaseConfigFlow } from "./base-config-flow";
import { getRegisteredHandler, type ConfigFlowClass } from "./registry";
export { registerFlowHandler, type ConfigFlowClass } from "./registry";

/**
 * Get the flow handler class for a domain
 */
// Import handlers here to ensure they register themselves
import "./handlers/homekit_controller";
import "./handlers/mqtt";
import "./handlers/esphome";
import "./handlers/zwave";
import "./handlers/zigbee";
import "./handlers/hue";
import "./handlers/sonos";
import "./handlers/google";
import "./handlers/spotify";

import { HAProxyConfigFlow } from "./ha-proxy-config-flow";
import { GenericConfigFlow } from "./generic-config-flow";

/**
 * Get the flow handler class for a domain
 * Fallback to HA Proxy if no local handler exists
 */
export function getFlowHandlerClass(domain: string): ConfigFlowClass {
    // 1. Check for local override
    const localHandler = getRegisteredHandler(domain);
    if (localHandler) {
        return localHandler;
    }

    // 2. Default to Generic Config Flow (Local Schema -> Proxy Fallback)
    return GenericConfigFlow;
} 
