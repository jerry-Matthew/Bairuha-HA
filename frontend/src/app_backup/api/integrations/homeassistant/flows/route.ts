/**
 * Home Assistant Config Flow API
 * 
 * POST /api/integrations/homeassistant/flows
 * Start a new Home Assistant config flow
 */

import { NextRequest, NextResponse } from "next/server";
import { startHAFlow } from "@/components/homeassistant/server/ha-config-flow.service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Get user ID from session if available (optional for now)
    const userId = null; // TODO: Extract from auth session when available

    const response = await startHAFlow(userId);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Start HA flow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to start Home Assistant config flow" },
      { status: 500 }
    );
  }
}
