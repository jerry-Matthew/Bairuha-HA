/**
 * Base Config Flow Handler
 * 
 * Implements the "Code-First" config flow pattern similar to Home Assistant's Python implementation.
 * Allows integrations to define dynamic logic for flow steps instead of relying solely on static schemas.
 */

import type { IntegrationConfigSchema } from "@/components/addDevice/server/integration-config-schemas";
import { discoveryService } from "@/lib/discovery/discovery-service";
import type { DiscoveredDevice } from "@/components/addDevice/server/device.types";

export type FlowResultType = "form" | "abort" | "create_entry" | "menu" | "external_step" | "external_step_done";

export interface FlowResult {
    type: FlowResultType;
    step_id?: string;
    data_schema?: IntegrationConfigSchema;
    errors?: Record<string, string>;
    description_placeholders?: Record<string, string>;
    reason?: string;
    title?: string;
    description?: string;
    data?: Record<string, any>;
    menu_options?: string[] | Record<string, string>;
    url?: string;
}

export abstract class BaseConfigFlow {
    protected flowId: string;
    protected integrationDomain: string;
    protected context: Record<string, any>;

    constructor(flowId: string, integrationDomain: string, context: Record<string, any> = {}) {
        this.flowId = flowId;
        this.integrationDomain = integrationDomain;
        this.context = context;
    }

    /**
     * The initial step for a user-initiated flow.
     * Equivalent to async_step_user in HA.
     * 
     * @param user_input - The data provided by the user (or undefined if first load)
     */
    abstract step_user(user_input?: Record<string, any>): Promise<FlowResult>;

    /**
     * Helper to return a form definition
     */
    protected showForm({
        step_id,
        data_schema,
        errors,
        description_placeholders,
        last_step,
    }: {
        step_id: string;
        data_schema: IntegrationConfigSchema;
        errors?: Record<string, string>;
        description_placeholders?: Record<string, string>;
        last_step?: boolean;
    }): FlowResult {
        return {
            type: "form",
            step_id,
            data_schema,
            errors,
            description_placeholders,
        };
    }

    /**
     * Helper to return a successful entry creation
     */
    protected createEntry({
        title,
        data,
    }: {
        title: string;
        data: Record<string, any>;
    }): FlowResult {
        return {
            type: "create_entry",
            title,
            data,
        };
    }

    /**
     * Helper to abort the flow
     */
    protected abort({
        reason,
        description_placeholders,
    }: {
        reason: string;
        description_placeholders?: Record<string, string>;
    }): FlowResult {
        return {
            type: "abort",
            reason,
            description_placeholders,
        };
    }
    protected async waitForDiscovery(domain: string, timeoutMs: number = 5000): Promise<DiscoveredDevice[]> {
        console.log(`[BaseConfigFlow] Waiting for discovery for ${domain}...`);
        // Trigger discovery refresh
        await discoveryService.discoverDevices(domain);

        // Get results
        const results = discoveryService.getDiscoveredDevices(domain);
        console.log(`[BaseConfigFlow] Discovery found ${results.length} devices for ${domain}`);
        return results;
    }
}
