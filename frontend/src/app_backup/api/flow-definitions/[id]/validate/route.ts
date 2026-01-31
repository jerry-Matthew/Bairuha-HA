/**
 * Flow Definition Validation API
 * 
 * Validate a flow definition structure
 */

import { NextRequest, NextResponse } from "next/server";
import { validateFlowDefinition } from "@/lib/config-flow/flow-definition.validator";
import type { FlowDefinition } from "@/lib/config-flow/flow-definition.types";

export const dynamic = "force-dynamic";

/**
 * POST /api/flow-definitions/[id]/validate
 * Validate a flow definition
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // If definition is provided in body, validate it
    // Otherwise, get definition by ID and validate
    let definition: FlowDefinition;
    
    if (body.definition) {
      definition = body.definition;
    } else {
      // Get definition by ID
      const { getFlowDefinitionById } = await import("@/lib/config-flow/flow-definition.registry");
      const definitionRecord = await getFlowDefinitionById(params.id);
      
      if (!definitionRecord) {
        return NextResponse.json(
          { error: "Flow definition not found" },
          { status: 404 }
        );
      }
      
      definition = definitionRecord.definition;
    }

    const validation = validateFlowDefinition(definition);
    
    return NextResponse.json({
      valid: validation.valid,
      errors: validation.errors,
    });
  } catch (error: any) {
    console.error("Flow definitions validate API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to validate flow definition" },
      { status: 500 }
    );
  }
}
