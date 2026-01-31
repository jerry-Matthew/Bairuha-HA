/**
 * Config Entry Registry API
 * 
 * CRUD operations for config entries registry
 * Config entries store integration configuration separately from integration metadata
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getConfigEntries,
  createConfigEntry,
} from "@/components/globalAdd/server/config-entry.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/config-entries
 * GET /api/registries/config-entries?integrationDomain=string
 * 
 * Fetch config entries
 * - If integrationDomain is provided, returns config entries for that integration only
 * - Otherwise, returns all config entries
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const integrationDomain = searchParams.get("integrationDomain");

    const entries = await getConfigEntries(integrationDomain || undefined);
    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error("Config entry registry API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch config entries" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/registries/config-entries
 * 
 * Create a new config entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.integrationDomain || !body.title || !body.data) {
      return NextResponse.json(
        { error: "integrationDomain, title, and data are required" },
        { status: 400 }
      );
    }

    const entry = await createConfigEntry({
      integrationDomain: body.integrationDomain,
      title: body.title,
      data: body.data,
      options: body.options,
      status: body.status,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error: any) {
    console.error("Config entry creation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create config entry" },
      { status: 500 }
    );
  }
}
