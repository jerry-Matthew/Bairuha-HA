/**
 * Assist Examples API
 * GET /api/dev-tools/assist/examples
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getAssistService } from "@/lib/dev-tools/assist-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const assistService = getAssistService();
    const examples = assistService.getExamples();

    return NextResponse.json(examples);
  } catch (error: any) {
    console.error("Assist examples API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Assist examples" },
      { status: 500 }
    );
  }
});
