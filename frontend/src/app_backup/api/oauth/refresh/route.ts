/**
 * OAuth Token Refresh API
 * 
 * Refreshes OAuth access tokens using refresh token
 */

import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/oauth/oauth-service";
import { getTokens, updateTokens, areTokensExpired } from "@/lib/oauth/oauth-token-storage";
import { getConfigEntryById } from "@/components/globalAdd/server/config-entry.registry";
import { getFlowConfig } from "@/lib/config-flow/flow-type-resolver";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configEntryId } = body;

    if (!configEntryId) {
      return NextResponse.json(
        { error: "configEntryId required" },
        { status: 400 }
      );
    }

    // Get config entry
    const configEntry = await getConfigEntryById(configEntryId);
    if (!configEntry) {
      return NextResponse.json(
        { error: "Config entry not found" },
        { status: 404 }
      );
    }

    // Get tokens
    const tokens = await getTokens(configEntryId);
    if (!tokens) {
      return NextResponse.json(
        { error: "No tokens found" },
        { status: 404 }
      );
    }

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "No refresh token available" },
        { status: 400 }
      );
    }

    // Check if tokens are expired
    if (!areTokensExpired(tokens)) {
      return NextResponse.json({
        tokens,
        message: "Tokens are still valid",
      });
    }

    // Get provider from config entry
    const providerId = configEntry.data?.oauth_provider;
    if (!providerId) {
      return NextResponse.json(
        { error: "OAuth provider not found" },
        { status: 400 }
      );
    }

    // Get flow config for provider
    const flowConfig = await getFlowConfig(configEntry.integrationDomain);

    // Refresh tokens
    const newTokens = await refreshAccessToken(providerId, tokens.refresh_token, flowConfig || undefined);

    // Update stored tokens
    await updateTokens(configEntryId, newTokens);

    return NextResponse.json({
      tokens: newTokens,
      message: "Tokens refreshed successfully",
    });
  } catch (error: any) {
    console.error("[OAuth API] Refresh error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to refresh tokens" },
      { status: 500 }
    );
  }
}
