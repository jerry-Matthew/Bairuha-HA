/**
 * GET /api/hacs/catalog
 * 
 * Returns enriched HACS catalog with GitHub metadata
 * 
 * @route GET /api/hacs/catalog
 * @returns { extensions: HacsExtension[], total: number, page: number, perPage: number, totalPages: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnrichedCatalog } from "@/components/hacs/server/hacs.catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "10", 10);

    const result = await getEnrichedCatalog(query, page, perPage);

    return NextResponse.json({
      extensions: result.extensions,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    console.error("HACS catalog API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog", message: error.message },
      { status: 500 }
    );
  }
}


