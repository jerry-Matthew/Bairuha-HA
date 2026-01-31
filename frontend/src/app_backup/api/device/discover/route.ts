/**
 * Device Discovery API
 * 
 * GET /api/device/discover
 * Discovers devices available for setup
 * 
 * NOTE: This endpoint is kept for backward compatibility.
 * New code should use /api/discovery/discover instead.
 */

import { NextRequest, NextResponse } from "next/server";
import { discoveryService } from "@/lib/discovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Use new discovery service, fallback to Home Assistant discovery
    const devices = await discoveryService.discoverDevices("homeassistant");
    return NextResponse.json({ devices });
  } catch (error: any) {
    console.error("Device discovery error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to discover devices", devices: [] },
      { status: 500 }
    );
  }
}
