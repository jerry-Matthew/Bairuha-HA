/**
 * Entity Statistics API
 * GET /api/dev-tools/statistics/entities
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getStatisticsService } from "@/lib/dev-tools/statistics-service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const domain = searchParams.get("domain") || undefined;
    const deviceId = searchParams.get("device_id") || undefined;
    const entityId = searchParams.get("entity_id") || undefined;
    const timeRange = searchParams.get("timeRange") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 100;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const statisticsService = getStatisticsService();
    const result = await statisticsService.getEntityStatistics({
      domain,
      deviceId,
      entityId,
      timeRange,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Entity statistics API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch entity statistics" },
      { status: 500 }
    );
  }
});
