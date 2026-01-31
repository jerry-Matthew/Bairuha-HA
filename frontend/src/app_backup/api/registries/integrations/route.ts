/**
 * Integration Registry API
 * 
 * CRUD operations for integration registry
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllIntegrations,
  getIntegrationByDomain,
  saveIntegration,
} from "@/components/globalAdd/server/integration.registry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const domain = searchParams.get("domain");

    if (domain) {
      const integration = await getIntegrationByDomain(domain);
      if (!integration) {
        return NextResponse.json({ error: "Integration not found" }, { status: 404 });
      }
      return NextResponse.json({ integration });
    }

    // Default: get all integrations
    const integrations = await getAllIntegrations();
    return NextResponse.json({ integrations });
  } catch (error: any) {
    console.error("Integration registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const integration = await saveIntegration(body);
    return NextResponse.json({ integration }, { status: 201 });
  } catch (error: any) {
    console.error("Integration registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to save integration" }, { status: 500 });
  }
}

