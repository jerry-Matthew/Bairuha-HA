/**
 * System Information API
 * GET /api/dev-tools/system/info
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getSystemInfoService } from "@/lib/dev-tools/system-info";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const systemInfo = getSystemInfoService();
    const info = await systemInfo.getSystemInfo();

    return NextResponse.json(info);
  } catch (error: any) {
    console.error("System info API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get system information" },
      { status: 500 }
    );
  }
});
