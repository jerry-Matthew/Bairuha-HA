/**
 * OAuth Callback API
 * 
 * Handles OAuth callback redirects and exchanges authorization code for tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthorizationCode, validateState } from "@/lib/oauth/oauth-service";
import { storeTokens } from "@/lib/oauth/oauth-token-storage";
import { getFlowById, updateFlow } from "@/components/addDevice/server/config-flow.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { createConfigEntry } from "@/components/globalAdd/server/config-entry.registry";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors
    if (error) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || "")}`
      );
    }

    if (!code || !state) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=missing_parameters`
      );
    }

    // Validate state
    const oauthState = validateState(state);
    if (!oauthState) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=invalid_state`
      );
    }

    // Get flow
    const flow = await getFlowById(oauthState.flowId);
    if (!flow) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=flow_not_found`
      );
    }

    if (!flow.integrationDomain) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=integration_not_set`
      );
    }

    // Get flow config
    const flowConfig = await getFlowConfig(flow.integrationDomain);
    if (!flowConfig?.oauth_provider) {
      const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      return NextResponse.redirect(
        `${frontendUrl}/overview?oauth_error=oauth_not_configured`
      );
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeAuthorizationCode(
      flowConfig.oauth_provider,
      code,
      oauthState.redirectUri,
      state,
      flowConfig
    );

    // Create config entry with tokens
    const configEntry = await createConfigEntry({
      integrationDomain: flow.integrationDomain,
      title: `${flow.integrationDomain} OAuth`,
      data: {
        oauth_provider: flowConfig.oauth_provider,
      },
      status: "loaded",
    });

    // Store tokens in config entry
    await storeTokens(configEntry.id, tokens);

    // Update flow with config entry ID
    const flowData = flow.data || {};
    flowData.configEntryId = configEntry.id;
    flowData.oauth_completed = true;
    await updateFlow(oauthState.flowId, {
      data: flowData,
      integrationDomain: flow.integrationDomain,
    });

    // Redirect back to frontend with success
    const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${frontendUrl}/overview?flowId=${oauthState.flowId}&oauth_success=true`
    );
  } catch (error: any) {
    console.error("[OAuth API] Callback error:", error);
    const frontendUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    return NextResponse.redirect(
      `${frontendUrl}/overview?oauth_error=${encodeURIComponent(error.message || "oauth_failed")}`
    );
  }
}
