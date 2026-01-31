import { BaseConfigFlow, type FlowResult } from "./base-config-flow";
import { haRestClient } from "@/lib/home-assistant/rest-client";
import { mapHASchemaToInternal } from "./ha-schema-mapper";

/**
 * Proxy Config Flow
 * 
 * Forwards all flow steps to the connected Home Assistant instance.
 * Allows supporting any integration that HA supports without writing custom logic.
 */
export class HAProxyConfigFlow extends BaseConfigFlow {
    private haFlowId: string | null = null;

    /**
     * Start the flow on Home Assistant
     */
    /**
     * Start the flow on Home Assistant
     */
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        // Restore state from context if available
        if (!this.haFlowId && this.context.ha_flow_id) {
            this.haFlowId = this.context.ha_flow_id;
        }

        try {
            // 1. Initial Start
            if (!this.haFlowId) {
                console.log(`[HAConfigFlow] Starting flow on HA for domain: ${this.integrationDomain}`);
                const response = await haRestClient.startConfigFlow(this.integrationDomain);
                return this.processHAResponse(response);
            }

            // 2. Subsequent Steps (Submitting Form Data)
            if (user_input) {
                console.log(`[HAConfigFlow] Submitting step to HA flow ${this.haFlowId}`, user_input);
                const response = await haRestClient.handleConfigFlowStep(this.haFlowId, user_input);
                return this.processHAResponse(response);
            }

            // Should not happen for step_user unless restarting
            return this.abort({ reason: "Flow restart not supported in proxy mode yet." });

        } catch (error: any) {
            console.error(`[HAConfigFlow] Error in proxy flow:`, error);
            // If flow ID is invalid (404), clear it so next retry restarts?
            // For now, abort.
            return this.abort({ reason: error.message || "Home Assistant communication failed" });
        }
    }

    /**
     * Translate HA flow response to our FlowResult format
     */
    private processHAResponse(haResponse: any): FlowResult {
        this.haFlowId = haResponse.flow_id;

        // 1. Success (Create Entry)
        if (haResponse.type === "create_entry") {
            return this.createEntry({
                title: haResponse.title,
                data: haResponse.result || {}, // HA returns 'result' sometimes
            });
        }

        // 2. Abort
        if (haResponse.type === "abort") {
            return this.abort({
                reason: haResponse.reason,
                description_placeholders: haResponse.description_placeholders
            });
        }

        // 3. Form / Menu / External Step
        // Map HA data_schema to our format if possible, or pass through generic fields
        let schema = mapHASchemaToInternal(haResponse.data_schema);

        // Task: Synthesize Menu into Schema
        if (haResponse.type === "menu" && (!schema || Object.keys(schema).length === 0)) {
            // If it's a menu with options but no schema, create a "choice" select field
            // to trigger our Menu UI
            const options = haResponse.menu_options || [];
            // Normalize options to { label, value } if not already or if strings
            // Note: mapHASchemaToInternal typically handles array of strings/objects if passed as options
            // But we are constructing schema manually here.

            // Format options: HA sends either ["opt1", "opt2"] or {"opt1": "Label 1"}
            let formattedOptions: any[] = [];
            if (Array.isArray(options)) {
                formattedOptions = options.map(opt => ({ label: opt, value: opt }));
            } else if (typeof options === 'object') {
                formattedOptions = Object.entries(options).map(([val, label]) => ({ label: label as string, value: val }));
            }

            schema = {
                next_step_id: {
                    type: "select",
                    label: haResponse.description || "Select an option",
                    options: formattedOptions,
                    required: true,
                    default: formattedOptions[0]?.value
                }
            };
        }

        return {
            type: haResponse.type === "menu" ? "menu" : (haResponse.type === "external" ? "external_step" : "form"),
            step_id: haResponse.step_id,
            title: haResponse.title, // Available in some HA responses
            description: haResponse.description, // Available in some HA responses
            description_placeholders: haResponse.description_placeholders,
            errors: haResponse.errors,
            data_schema: schema,
            // Persist the flow ID in 'data' so deviceFlow.service.ts saves it to DB
            data: {
                ha_flow_id: this.haFlowId
            },
            // Pass through extra metadata like 'url' for OAuth
            url: haResponse.url,
        };
    }


}
