/**
 * Flow Handler Registry
 * 
 * Registry of flow handlers for each flow type
 */

import type { FlowType } from "./flow-type-resolver";
import type { FlowHandler } from "./flow-handlers";
import { ManualFlowHandler } from "./handlers/manual-flow-handler";
import { DiscoveryFlowHandler } from "./handlers/discovery-flow-handler";
import { OAuthFlowHandler } from "./handlers/oauth-flow-handler";
import { WizardFlowHandler } from "./handlers/wizard-flow-handler";
import { NoneFlowHandler } from "./handlers/none-flow-handler";
import { HybridFlowHandler } from "./handlers/hybrid-flow-handler";

// Registry of flow handlers
const handlers = new Map<FlowType, FlowHandler>();

// Register default handlers
handlers.set('none', new NoneFlowHandler());
handlers.set('manual', new ManualFlowHandler());
handlers.set('discovery', new DiscoveryFlowHandler());
handlers.set('oauth', new OAuthFlowHandler());
handlers.set('wizard', new WizardFlowHandler());
handlers.set('hybrid', new HybridFlowHandler());

/**
 * Get flow handler for a flow type
 */
export function getHandler(flowType: FlowType): FlowHandler {
  const handler = handlers.get(flowType);
  if (!handler) {
    // Fallback to manual handler if handler not found
    console.warn(`[FlowHandlerRegistry] No handler found for flow type: ${flowType}, using manual handler`);
    return handlers.get('manual')!;
  }
  return handler;
}

/**
 * Register a custom flow handler
 */
export function registerHandler(flowType: FlowType, handler: FlowHandler): void {
  handlers.set(flowType, handler);
}

/**
 * Get all registered flow types
 */
export function getRegisteredFlowTypes(): FlowType[] {
  return Array.from(handlers.keys());
}
