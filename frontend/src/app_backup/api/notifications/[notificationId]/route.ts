/**
 * Notification API
 * 
 * GET /api/notifications/[notificationId] - Get notification by ID
 * PATCH /api/notifications/[notificationId] - Update notification (mark as read)
 * DELETE /api/notifications/[notificationId] - Delete notification
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationById,
  markAsRead,
  deleteNotification
} from "@/components/globalAdd/server/notification.service";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications/[notificationId]
 * Get notification by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
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

    const notification = await getNotificationById(params.notificationId, userId);

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ notification });
  } catch (error: any) {
    console.error("Get notification API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notification" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/[notificationId]
 * Update notification (mark as read)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
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

    const body = await request.json();
    const { read } = body;

    // Validate read field
    if (read !== undefined && typeof read !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid 'read' field (must be a boolean)" },
        { status: 400 }
      );
    }

    // For now, only support marking as read
    // TODO: Support marking as unread if needed
    if (read === true) {
      const notification = await markAsRead(params.notificationId, userId);
      return NextResponse.json({ notification });
    } else {
      return NextResponse.json(
        { error: "Only marking as read is currently supported" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Update notification API error:", error);
    
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[notificationId]
 * Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { notificationId: string } }
) {
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

    await deleteNotification(params.notificationId, userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete notification API error:", error);
    
    if (error.message?.includes("not found") || error.message?.includes("access denied")) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
}
