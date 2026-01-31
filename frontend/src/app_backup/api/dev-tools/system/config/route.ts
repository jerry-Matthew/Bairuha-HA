/**
 * System Configuration API
 * GET /api/dev-tools/system/config
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getSystemInfoService } from "@/lib/dev-tools/system-info";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const systemInfo = getSystemInfoService();
    const config = systemInfo.getSystemConfig();

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("System config API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get system configuration" },
      { status: 500 }
    );
  }
});
