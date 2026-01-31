/**
 * Event Triggering API
 * POST /api/dev-tools/events/trigger
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/middleware";
import { getEventTrigger } from "@/lib/dev-tools/event-trigger";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { eventType, eventData, metadata } = body;

    if (!eventType || !eventData) {
      return NextResponse.json(
        { error: "eventType and eventData are required" },
        { status: 400 }
      );
    }

    const trigger = getEventTrigger();
    const result = await trigger.triggerEvent({
      eventType,
      eventData,
      metadata: metadata || {},
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Event triggering API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to trigger event" },
      { status: 500 }
    );
  }
});
