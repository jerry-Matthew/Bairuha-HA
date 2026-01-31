/**
 * Entity Detail API
 * GET /api/dev-tools/entities/[entityId]
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticate } from "@/lib/auth/middleware";
import { getStateInspector } from "@/lib/dev-tools/state-inspector";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { entityId } = params;
    
    const inspector = getStateInspector();
    const entity = await inspector.getEntity(entityId);

    if (!entity) {
      return NextResponse.json(
        { error: `Entity not found: ${entityId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ entity });
  } catch (error: any) {
    console.error("Entity detail API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch entity" },
      { status: 500 }
    );
  }
}
