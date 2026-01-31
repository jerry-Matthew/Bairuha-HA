/**
 * Unread Count API
 * 
 * GET /api/notifications/unread/count - Get unread notification count for authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/components/globalAdd/server/notification.service";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/unread/count
 * Get unread notification count for authenticated user
 */
export async function GET(request: NextRequest) {
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

    const count = await getUnreadCount(userId);

    return NextResponse.json({ count });
  } catch (error: any) {
    console.error("Unread count API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get unread count" },
      { status: 500 }
    );
  }
}
