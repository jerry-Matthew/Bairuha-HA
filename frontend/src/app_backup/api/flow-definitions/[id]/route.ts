/**
 * Flow Definition by ID API
 * 
 * Get, update, and delete specific flow definitions by ID
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getFlowDefinitionById,
  updateFlowDefinition,
  deleteFlowDefinition,
} from "@/lib/config-flow/flow-definition.registry";
import type { UpdateFlowDefinitionInput } from "@/lib/config-flow/flow-definition.types";

export const dynamic = "force-dynamic";

/**
 * GET /api/flow-definitions/[id]
 * Get specific flow definition by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const definition = await getFlowDefinitionById(params.id);
    
    if (!definition) {
      return NextResponse.json(
        { error: "Flow definition not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ definition });
  } catch (error: any) {
    console.error("Flow definitions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch flow definition" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/flow-definitions/[id]
 * Update specific flow definition
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const updates: UpdateFlowDefinitionInput = {
      definition: body.definition,
      handler_class: body.handler_class,
      handler_config: body.handler_config,
      description: body.description,
      is_active: body.is_active,
      is_default: body.is_default,
    };

    const definition = await updateFlowDefinition(params.id, updates);
    return NextResponse.json({ definition });
  } catch (error: any) {
    console.error("Flow definitions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update flow definition" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/flow-definitions/[id]
 * Delete flow definition
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteFlowDefinition(params.id);
    return NextResponse.json({ success: true, message: "Flow definition deleted" });
  } catch (error: any) {
    console.error("Flow definitions API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete flow definition" },
      { status: 500 }
    );
  }
}
