/**
 * Mark All Read API
 * 
 * POST /api/notifications/mark-all-read - Mark all notifications as read for authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { markAllAsRead } from "@/components/globalAdd/server/notification.service";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = authenticate(request);
    if ("error" in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.user.userId;

    const updatedCount = await markAllAsRead(userId);

    return NextResponse.json({
      success: true,
      updatedCount
    });
  } catch (error: any) {
    console.error("Mark all read API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark all notifications as read" },
      { status: 500 }
    );
  }
}
