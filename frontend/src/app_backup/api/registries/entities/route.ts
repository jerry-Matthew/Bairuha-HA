/**
 * Entity Registry API
 * 
 * CRUD operations for entity registry
 * Entities are the only controllable & observable units
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEntities,
  getEntitiesByDevice,
} from "@/components/globalAdd/server/entity.registry";

export const dynamic = "force-dynamic";

/**
 * GET /api/registries/entities
 * GET /api/registries/entities?deviceId=UUID
 * 
 * Fetch entities
 * - If deviceId is provided, returns entities for that device only
 * - Otherwise, returns all entities
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get("deviceId");

    if (deviceId) {
      const entities = await getEntitiesByDevice(deviceId);
      return NextResponse.json({ entities });
    }

    // Default: get all entities
    const entities = await getEntities();
    return NextResponse.json({ entities });
  } catch (error: any) {
    console.error("Entity registry API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch entities" },
      { status: 500 }
    );
  }
}

