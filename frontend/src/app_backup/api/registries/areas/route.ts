/**
 * Area Registry API
 * 
 * CRUD operations for area registry
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllAreas, createArea } from "@/components/globalAdd/server/area.registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const areas = await getAllAreas();
    return NextResponse.json({ areas });
  } catch (error: any) {
    console.error("Area registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch areas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const area = await createArea(body);
    return NextResponse.json({ area }, { status: 201 });
  } catch (error: any) {
    console.error("Area registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create area" }, { status: 500 });
  }
}

