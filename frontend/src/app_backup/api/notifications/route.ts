/**
 * Notifications API
 * 
 * GET /api/notifications - Get notifications for authenticated user
 * POST /api/notifications - Create a new notification (requires admin/system permissions)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getNotificationsForUser,
  createNotification,
  getUnreadCount,
  type CreateNotificationData
} from "@/components/globalAdd/server/notification.service";
import { authenticate } from "@/lib/auth/middleware";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Get notifications for authenticated user
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

    const searchParams = request.nextUrl.searchParams;
    const read = searchParams.get("read") === "true" ? true : searchParams.get("read") === "false" ? false : undefined;
    const type = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const orderBy = (searchParams.get("orderBy") || "created_at") as 'created_at' | 'read_at';
    const order = (searchParams.get("order") || "DESC").toUpperCase() as 'ASC' | 'DESC';

    // Validate orderBy
    if (orderBy !== 'created_at' && orderBy !== 'read_at') {
      return NextResponse.json(
        { error: "Invalid orderBy. Must be 'created_at' or 'read_at'" },
        { status: 400 }
      );
    }

    // Validate order
    if (order !== 'ASC' && order !== 'DESC') {
      return NextResponse.json(
        { error: "Invalid order. Must be 'ASC' or 'DESC'" },
        { status: 400 }
      );
    }

    // Get notifications
    const { notifications, total } = await getNotificationsForUser(userId, {
      read,
      type,
      limit,
      offset,
      orderBy,
      order
    });

    // Get unread count
    const unreadCount = await getUnreadCount(userId);

    return NextResponse.json({
      notifications,
      total,
      unreadCount
    });
  } catch (error: any) {
    console.error("Notifications API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Create a new notification (requires admin/system permissions)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, title, message, actionUrl, actionLabel, metadata } = body;

    // Validate required fields
    if (!type || typeof type !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'type' field (must be a string)" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: "Missing or invalid 'title' field (must be a string)" },
        { status: 400 }
      );
    }

    // Validate notification type
    const validTypes = ['info', 'success', 'warning', 'error'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid 'type' field. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (userId !== undefined && userId !== null && typeof userId !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'userId' field (must be a string or null)" },
        { status: 400 }
      );
    }

    if (message !== undefined && typeof message !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'message' field (must be a string)" },
        { status: 400 }
      );
    }

    if (actionUrl !== undefined && typeof actionUrl !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'actionUrl' field (must be a string)" },
        { status: 400 }
      );
    }

    if (actionLabel !== undefined && typeof actionLabel !== 'string') {
      return NextResponse.json(
        { error: "Invalid 'actionLabel' field (must be a string)" },
        { status: 400 }
      );
    }

    // Create notification
    const notificationData: CreateNotificationData = {
      userId: userId || null,
      type: type as 'info' | 'success' | 'warning' | 'error',
      title,
      message,
      actionUrl,
      actionLabel,
      metadata
    };

    const notification = await createNotification(notificationData);

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error: any) {
    console.error("Create notification API error:", error);
    
    // Handle validation errors
    if (error.message?.includes("Invalid notification type")) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 }
    );
  }
}
