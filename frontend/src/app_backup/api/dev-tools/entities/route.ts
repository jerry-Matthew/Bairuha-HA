/**
 * State Inspection API
 * GET /api/dev-tools/entities
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStateInspector } from "@/lib/dev-tools/state-inspector";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse filters
    const domain = searchParams.get("domain") || undefined;
    const deviceId = searchParams.get("device_id") || undefined;
    const state = searchParams.get("state") || undefined;
    const source = searchParams.get("source") as 'ha' | 'internal' | 'hybrid' | undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const inspector = getStateInspector();
    const result = await inspector.getEntities({
      domain,
      deviceId,
      state,
      source,
      limit,
      offset,
    });

    return NextResponse.json({
      entities: result.entities,
      total: result.total,
      filters: {
        ...(domain && { domain }),
        ...(deviceId && { device_id: deviceId }),
        ...(state && { state }),
        ...(source && { source }),
      },
    });
  } catch (error: any) {
    console.error("State inspection API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch entities" },
      { status: 500 }
    );
  }
});
