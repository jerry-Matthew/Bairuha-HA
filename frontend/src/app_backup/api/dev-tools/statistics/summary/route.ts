/**
 * Summary Statistics API
 * GET /api/dev-tools/statistics/summary
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStatisticsService } from "@/lib/dev-tools/statistics-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || undefined;

    const statisticsService = getStatisticsService();
    const result = await statisticsService.getSummaryStatistics(timeRange);

    return NextResponse.json({ summary: result });
  } catch (error: any) {
    console.error("Summary statistics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch summary statistics" },
      { status: 500 }
    );
  }
});
