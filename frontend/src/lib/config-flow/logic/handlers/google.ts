import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class GoogleConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        // For OAuth flows, HA usually checks if we already have credentials or redirects immediately.
        // We mock this by returning 'external_step' which the frontend handles by redirecting.

        // In a real implementation, we might check if 'oauth_provider' is configured in flow config first.
        return {
            type: "external_step",
            step_id: "auth",
            url: "/api/oauth/authorize?domain=google" // Example URL
        };
    }
}

registerFlowHandler("google", GoogleConfigFlow);
