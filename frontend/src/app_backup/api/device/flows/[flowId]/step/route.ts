/**
 * Advance Device Flow API
 * 
 * POST /api/device/flows/:flowId/step
 * Advances the flow to the next step
 */

import { NextRequest, NextResponse } from "next/server";
import { advanceFlow } from "@/components/addDevice/server/deviceFlow.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await request.json().catch(() => ({}));

    // Support both old format (configData) and new format (stepData for wizard steps)
    const configData = body.stepData || body.configData;

    const response = await advanceFlow(
      flowId,
      body.integrationId,
      body.selectedDeviceId,
      configData
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Advance flow error:", error);
    
    // Handle validation errors (400)
    if (error.validationErrors) {
      return NextResponse.json(
        { error: error.message || "Step validation failed", validationErrors: error.validationErrors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to advance flow" },
      { status: 500 }
    );
  }
}

