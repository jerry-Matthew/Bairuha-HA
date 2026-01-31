/**
 * OAuth Flow Handler
 * 
 * OAuth-based configuration flow
 * Flow: pick_integration → oauth_authorize → oauth_callback → configure (optional) → confirm
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";
import { generateAuthorizationUrl } from "@/lib/oauth/oauth-service";
import { getTokens } from "@/lib/oauth/oauth-token-storage";

export class OAuthFlowHandler extends BaseFlowHandler {
  async getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep> {
    return "pick_integration";
  }

  async getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep> {
    switch (currentStep) {
      case "pick_integration":
        // After picking integration, start OAuth flow
        return "oauth_authorize";

      case "oauth_authorize":
        // After authorization, handle callback
        // This step is handled by OAuth callback API
        return "oauth_callback";

      case "oauth_callback":
        // After OAuth callback, verify tokens are stored
        if (!flowData.configEntryId) {
          throw new Error("OAuth tokens not stored");
        }

        // Verify tokens exist
        const tokens = await getTokens(flowData.configEntryId);
        if (!tokens) {
          throw new Error("OAuth tokens not found");
        }

        // Check if additional config needed
        const { getConfigSchema } = await import("@/components/addDevice/server/integration-config-schemas");
        const configSchema = getConfigSchema(integrationDomain);
        const schemaHasFields = Object.keys(configSchema).length > 0;
        
        return schemaHasFields ? "configure" : "confirm";

      case "configure":
        return "confirm";

      case "confirm":
        throw new Error("Flow already completed");

      default:
        throw new Error(`Invalid step for OAuth flow: ${currentStep}`);
    }
  }

  /**
   * Generate OAuth authorization URL for flow
   */
  async generateAuthorizationUrl(
    flowId: string,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<string> {
    if (!flowConfig?.oauth_provider) {
      throw new Error("OAuth provider not configured");
    }

    const scopes = flowConfig.scopes || [];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/oauth/callback`;

    const { url } = await generateAuthorizationUrl(
      flowConfig.oauth_provider,
      flowId,
      scopes,
      redirectUri,
      flowConfig
    );

    return url;
  }
}
