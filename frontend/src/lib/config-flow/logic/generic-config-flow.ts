
import { HAProxyConfigFlow } from "./ha-proxy-config-flow";
import { type FlowResult } from "./base-config-flow";
import { query } from "@/lib/db";

/**
 * Generic Config Flow
 * 
 * Uses the locally imported schemas from integration_catalog to render config forms.
 * Falls back to HA Proxy behavior if no local schema is available.
 */
export class GenericConfigFlow extends HAProxyConfigFlow {

    /**
     * Override step_user to check for local schema first
     */
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        // 1. If we have user input, we might be submitting a local form OR proxy form
        // We need to know which mode we are in. 
        // We can infer mode by checking context or asking DB again? 
        // Simpler: Just try to find local schema.

        try {
            const schema = await this.getLocalSchema();

            if (schema) {
                console.log(`[GenericConfigFlow] Using local schema for ${this.integrationDomain}`);

                if (user_input) {
                    // Form submitted - create the entry
                    // Note: In a real integration this would validate input and connect to device.
                    // Here we just save the config.
                    return this.createEntry({
                        title: schema.title || this.integrationDomain,
                        data: user_input
                    });
                }

                // Render the form using local schema
                return this.showForm({
                    step_id: "user",
                    data_schema: schema.schema,
                    errors: undefined
                });
            }
        } catch (error) {
            console.error(`[GenericConfigFlow] Error fetching local schema:`, error);
            // Continue to fallback on error
        }

        // 2. Fallback to HA Proxy
        console.log(`[GenericConfigFlow] No local schema found, falling back to Proxy for ${this.integrationDomain}`);
        return super.step_user(user_input);
    }

    /**
     * Fetch local flow config from database
     */
    private async getLocalSchema(): Promise<{ title: string, schema: any } | null> {
        try {
            const res = await query(
                `SELECT flow_config FROM integration_catalog WHERE domain = $1`,
                [this.integrationDomain]
            );

            if (res.length > 0 && res[0].flow_config) {
                const config = res[0].flow_config;
                // Look for 'user' step or 'configure' step or take the first one
                let step = config.steps?.find((s: any) => s.step_id === "user");
                if (!step) step = config.steps?.find((s: any) => s.step_id === "configure");
                if (!step && config.steps?.length > 0) step = config.steps[0];

                if (step && step.schema) {
                    return {
                        title: step.title,
                        schema: step.schema
                    };
                }
            }
            return null;
        } catch (err) {
            console.error("DB Query failed in GenericConfigFlow", err);
            return null;
        }
    }
}
