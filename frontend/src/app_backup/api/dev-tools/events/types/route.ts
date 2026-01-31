/**
 * Event Types API
 * GET /api/dev-tools/events/types
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getEventTrigger } from "@/lib/dev-tools/event-trigger";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request: NextRequest) => {
  try {
    const trigger = getEventTrigger();
    const eventTypes = trigger.getAvailableEventTypes();

    return NextResponse.json({ eventTypes });
  } catch (error: any) {
    console.error("Event types API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch event types" },
      { status: 500 }
    );
  }
});
