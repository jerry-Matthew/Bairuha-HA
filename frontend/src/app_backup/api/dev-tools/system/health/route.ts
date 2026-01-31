/**
 * System Health API
 * GET /api/dev-tools/system/health
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getSystemInfoService } from "@/lib/dev-tools/system-info";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const systemInfo = getSystemInfoService();
    const health = await systemInfo.getHealth();

    return NextResponse.json(health);
  } catch (error: any) {
    console.error("System health API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get system health" },
      { status: 500 }
    );
  }
});
