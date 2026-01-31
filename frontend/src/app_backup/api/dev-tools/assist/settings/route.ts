/**
 * Assist Settings API
 * GET /api/dev-tools/assist/settings
 * POST /api/dev-tools/assist/settings
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAssistService } from "@/lib/dev-tools/assist-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const assistService = getAssistService();
    const settings = await assistService.getSettings();

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("Assist settings GET API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Assist settings" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const assistService = getAssistService();
    const settings = await assistService.updateSettings(body);

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("Assist settings POST API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update Assist settings" },
      { status: 500 }
    );
  }
});
