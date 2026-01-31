/**
 * Automation Registry API
 * 
 * CRUD operations for automation registry
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllAutomations, createAutomation } from "@/components/globalAdd/server/automation.registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const automations = await getAllAutomations();
    return NextResponse.json({ automations });
  } catch (error: any) {
    console.error("Automation registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch automations" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const automation = await createAutomation(body);
    return NextResponse.json({ automation }, { status: 201 });
  } catch (error: any) {
    console.error("Automation registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create automation" }, { status: 500 });
  }
}

