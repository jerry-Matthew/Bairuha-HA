/**
 * Home Assistant Config Flow - Enter Connection Step
 * 
 * POST /api/integrations/homeassistant/flows/:flowId/enter-connection
 * Collects base_url and access_token
 */

import { NextRequest, NextResponse } from "next/server";
import { handleEnterConnection } from "@/components/homeassistant/server/ha-config-flow.service";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { flowId: string } }
) {
  try {
    const { flowId } = params;
    const body = await request.json();

    const { baseUrl, accessToken } = body;

    if (!baseUrl || !accessToken) {
      return NextResponse.json(
        { error: "baseUrl and accessToken are required" },
        { status: 400 }
      );
    }

    const response = await handleEnterConnection(flowId, baseUrl, accessToken);

    if (response.error) {
      return NextResponse.json(
        { error: response.error },
        { status: 400 }
      );
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Enter connection error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process connection data" },
      { status: 500 }
    );
  }
}
