import { BaseConfigFlow } from "./base-config-flow";

// Registry type
export type ConfigFlowClass = new (flowId: string, integrationDomain: string, context: Record<string, any>) => BaseConfigFlow;

const FLOW_HANDLERS: Record<string, ConfigFlowClass> = {};

/**
 * Register a flow handler for a domain
 */
export function registerFlowHandler(domain: string, handler: ConfigFlowClass) {
    FLOW_HANDLERS[domain] = handler;
}

/**
 * Get the locally registered flow handler for a domain
 */
export function getRegisteredHandler(domain: string): ConfigFlowClass | undefined {
    return FLOW_HANDLERS[domain];
}
