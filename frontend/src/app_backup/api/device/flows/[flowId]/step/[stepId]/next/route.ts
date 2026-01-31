/**
 * Get Next Step API
 * 
 * POST /api/device/flows/[flowId]/step/[stepId]/next
 * Determines next step based on conditional logic
 */

import { NextRequest, NextResponse } from "next/server";
import { getFlowById } from "@/components/addDevice/server/config-flow.registry";
import { loadFlowDefinition } from "@/lib/config-flow/flow-definition.loader";
import { determineNextStep } from "@/lib/config-flow/conditional-step-engine";
import { resolveStepComponent } from "@/lib/config-flow/step-resolver";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string; stepId: string } }
) {
  try {
    const { flowId, stepId } = params;
    const body = await request.json();
    const { stepData } = body;

    // Get flow
    const flow = await getFlowById(flowId);
    if (!flow) {
      return NextResponse.json(
        { error: "Flow not found" },
        { status: 404 }
      );
    }

    // Merge step data into flow data
    const flowData = {
      ...(flow.data || {}),
      ...(stepData || {}),
    };

    // Load flow definition
    if (!flow.integrationDomain) {
      return NextResponse.json(
        { error: "Flow has no integration domain" },
        { status: 400 }
      );
    }

    const definition = await loadFlowDefinition(flow.integrationDomain);
    if (!definition) {
      return NextResponse.json(
        { error: "Flow definition not found" },
        { status: 404 }
      );
    }

    // Determine next step
    const nextStepId = determineNextStep(definition, stepId, flowData);

    if (!nextStepId) {
      // Flow is complete
      return NextResponse.json({
        nextStepId: null,
        flowComplete: true,
      });
    }

    // Get next step info
    let stepInfo = null;
    try {
      // Update flow data temporarily to resolve next step
      const tempFlow = { ...flow, data: flowData };
      // We need to use a workaround here since we can't modify the flow
      // For now, just try to resolve with current flow data
      stepInfo = await resolveStepComponent(flowId, nextStepId);
    } catch (error) {
      console.warn("Failed to resolve next step info:", error);
      // Continue without step info
    }

    return NextResponse.json({
      nextStepId,
      stepInfo,
      flowComplete: false,
    });
  } catch (error: any) {
    console.error("Get next step error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to determine next step" },
      { status: 500 }
    );
  }
}
