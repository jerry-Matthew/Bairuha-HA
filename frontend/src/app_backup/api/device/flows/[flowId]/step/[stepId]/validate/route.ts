/**
 * Validate Step Data API
 * 
 * POST /api/device/flows/[flowId]/step/[stepId]/validate
 * Validates step data against step definition
 */

import { NextRequest, NextResponse } from "next/server";
import { getStepDefinitionFromFlow } from "@/lib/config-flow/step-resolver";
import { validateStepData } from "@/lib/config-flow/step-validation-engine";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string; stepId: string } }
) {
  try {
    const { flowId, stepId } = params;
    const body = await request.json();
    const { stepData } = body;

    if (!stepData) {
      return NextResponse.json(
        { error: "stepData is required" },
        { status: 400 }
      );
    }

    // Get step definition
    const stepDefinition = await getStepDefinitionFromFlow(flowId, stepId);
    if (!stepDefinition) {
      return NextResponse.json(
        { error: "Step definition not found" },
        { status: 404 }
      );
    }

    // Validate step data
    const validationResult = await validateStepData(stepDefinition, stepData);

    return NextResponse.json(validationResult);
  } catch (error: any) {
    console.error("Validate step error:", error);
    
    return NextResponse.json(
      { error: error.message || "Failed to validate step data" },
      { status: 500 }
    );
  }
}
