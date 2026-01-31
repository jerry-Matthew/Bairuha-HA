/**
 * Home Assistant Config Flow - Confirm Step
 * 
 * POST /api/integrations/homeassistant/flows/:flowId/confirm
 * Finalizes Home Assistant integration setup
 * Creates config entry and registers integration
 */

import { NextRequest, NextResponse } from "next/server";
import { handleConfirm } from "@/components/homeassistant/server/ha-config-flow.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;

    const response = await handleConfirm(flowId);

    if (!response.success) {
      return NextResponse.json(
        { error: "Failed to confirm Home Assistant integration" },
        { status: 500 }
      );
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Confirm HA flow error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to confirm Home Assistant integration" },
      { status: 500 }
    );
  }
}
