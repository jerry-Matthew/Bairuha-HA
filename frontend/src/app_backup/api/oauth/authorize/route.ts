/**
 * OAuth Authorization API
 * 
 * Generates OAuth authorization URL for a flow
 */

import { NextRequest, NextResponse } from "next/server";
import { generateAuthorizationUrl } from "@/lib/oauth/oauth-service";
import { getFlowById, updateFlow } from "@/components/addDevice/server/config-flow.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { flowId } = body;

    if (!flowId) {
      return NextResponse.json(
        { error: "flowId required" },
        { status: 400 }
      );
    }

    // Get flow
    const flow = await getFlowById(flowId);
    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }

    if (!flow.integrationDomain) {
      return NextResponse.json(
        { error: "Integration domain not set" },
        { status: 400 }
      );
    }

    // Get flow config
    const flowConfig = await getFlowConfig(flow.integrationDomain);
    if (!flowConfig?.oauth_provider) {
      return NextResponse.json(
        { error: "OAuth provider not configured for this integration" },
        { status: 400 }
      );
    }

    // Get scopes from flow config
    const scopes = flowConfig.scopes || [];

    // Generate redirect URI
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/oauth/callback`;

    // Generate authorization URL
    const { url, state } = await generateAuthorizationUrl(
      flowConfig.oauth_provider,
      flowId,
      scopes,
      redirectUri,
      flowConfig
    );

    // Store state in flow data
    const flowData = flow.data || {};
    flowData.oauth_state = state;
    await updateFlow(flowId, { data: flowData });

    return NextResponse.json({
      authorizationUrl: url,
      state,
    });
  } catch (error: any) {
    console.error("[OAuth API] Authorization error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate authorization URL" },
      { status: 500 }
    );
  }
}
