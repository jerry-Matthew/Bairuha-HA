/**
 * Get Step Component Information API
 * 
 * GET /api/device/flows/[flowId]/step/[stepId]
 * Returns step component information for rendering
 */

import { NextRequest, NextResponse } from "next/server";
import { resolveStepComponent } from "@/lib/config-flow/step-resolver";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { flowId: string; stepId: string } }
) {
  try {
    const { flowId, stepId } = params;

    // Resolve step component information
    const componentInfo = await resolveStepComponent(flowId, stepId);

    return NextResponse.json(componentInfo);
  } catch (error: any) {
    console.error("Get step info error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to get step information" },
      { status: 500 }
    );
  }
}
