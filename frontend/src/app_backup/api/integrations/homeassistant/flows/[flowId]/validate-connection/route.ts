/**
 * Home Assistant Config Flow - Validate Connection Step
 * 
 * POST /api/integrations/homeassistant/flows/:flowId/validate-connection
 * Validates connection to Home Assistant by calling /api/config
 */

import { NextRequest, NextResponse } from "next/server";
import { handleValidateConnection } from "@/components/homeassistant/server/ha-config-flow.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;

    const response = await handleValidateConnection(flowId);

    if (response.validationError) {
      return NextResponse.json(
        { 
          error: "Connection validation failed",
          validationError: response.validationError 
        },
        { status: 400 }
      );
    }

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 400 }
      );
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Validate connection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate connection" },
      { status: 500 }
    );
  }
}
