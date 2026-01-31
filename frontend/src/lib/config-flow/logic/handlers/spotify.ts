import { BaseConfigFlow, type FlowResult } from "../base-config-flow";
import { registerFlowHandler } from "../registry";

export class SpotifyConfigFlow extends BaseConfigFlow {
    async step_user(user_input?: Record<string, any>): Promise<FlowResult> {
        return {
            type: "external_step",
            step_id: "auth",
            url: "/api/oauth/authorize?domain=spotify"
        };
    }
}

registerFlowHandler("spotify", SpotifyConfigFlow);
