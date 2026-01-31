/**
 * Activate Flow Definition API
 * 
 * Activate a specific flow definition version
 */

import { NextRequest, NextResponse } from "next/server";
import { activateFlowDefinition } from "@/lib/config-flow/flow-definition.registry";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/flow-definitions/[id]/activate
 * Activate a specific flow definition version
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const definition = await activateFlowDefinition(params.id);
    return NextResponse.json({ definition });
  } catch (error: any) {
    console.error("Flow definitions activate API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to activate flow definition" },
      { status: 500 }
    );
  }
}
