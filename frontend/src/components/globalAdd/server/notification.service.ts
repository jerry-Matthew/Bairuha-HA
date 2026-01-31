/**
 * Notification Service
 * 
 * Backend service for managing notifications
 * Notifications are alerts, warnings, and informational messages for users
 */

import { query } from "@/lib/db";
import { broadcastNotificationCreated, broadcastNotificationUpdated, broadcastUnreadCountChanged } from "@/components/realtime/websocket.server";

export interface Notification {
  id: string;
  userId: string | null; // null = broadcast
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
  metadata?: Record<string, any>;
}

export interface CreateNotificationData {
  userId?: string | null; // null = broadcast
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a new notification
 * Broadcasts via WebSocket after creation
 */
export async function createNotification(data: CreateNotificationData): Promise<Notification> {
  // Validate notification type
  const validTypes = ['info', 'success', 'warning', 'error'];
  if (!validTypes.includes(data.type)) {
    throw new Error(`Invalid notification type: ${data.type}. Must be one of: ${validTypes.join(', ')}`);
  }

  const now = new Date().toISOString();

  const result = await query<Notification>(
    `INSERT INTO notifications (
      user_id, type, title, message, action_url, action_label, 
      read, created_at, metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING 
      id, user_id as "userId", type, title, message, 
      action_url as "actionUrl", action_label as "actionLabel", 
      read, created_at as "createdAt", read_at as "readAt",
      metadata`,
    [
      data.userId || null,
      data.type,
      data.title,
      data.message || null,
      data.actionUrl || null,
      data.actionLabel || null,
      false, // read
      now,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]
  );

  if (result.length === 0) {
    throw new Error("Failed to create notification");
  }

  const notification = {
    ...result[0],
    metadata: result[0].metadata ? (typeof result[0].metadata === 'string' ? JSON.parse(result[0].metadata) : result[0].metadata) : undefined
  };

  // Broadcast notification via WebSocket
  broadcastNotificationCreated({
    notification,
    targetUserId: notification.userId || null
  });

  // If user-specific notification, update unread count
  if (notification.userId) {
    const unreadCount = await getUnreadCount(notification.userId);
    broadcastUnreadCountChanged({
      userId: notification.userId,
      count: unreadCount
    });
  } else {
    // For broadcast notifications, update count for all connected users
    // This is handled per-user when they fetch notifications
  }

  return notification;
}

/**
 * Get notifications for a user
 * Includes broadcast notifications (user_id IS NULL)
 */
export async function getNotificationsForUser(
  userId: string,
  options?: {
    read?: boolean; // Filter by read status
    type?: string; // Filter by type
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'read_at';
    order?: 'ASC' | 'DESC';
  }
): Promise<{ notifications: Notification[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const orderBy = options?.orderBy ?? 'created_at';
  const order = options?.order ?? 'DESC';

  // Build WHERE clause
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // User-specific: user_id = userId OR user_id IS NULL (broadcast)
  conditions.push(`(user_id = $${paramIndex} OR user_id IS NULL)`);
  params.push(userId);
  paramIndex++;

  if (options?.read !== undefined) {
    conditions.push(`read = $${paramIndex}`);
    params.push(options.read);
    paramIndex++;
  }

  if (options?.type) {
    conditions.push(`type = $${paramIndex}`);
    params.push(options.type);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM notifications ${whereClause}`,
    params
  );
  const total = parseInt(countResult[0]?.count || '0', 10);

  // Get notifications
  params.push(limit);
  params.push(offset);

  const notificationsResult = await query<Notification>(
    `SELECT 
      id, user_id as "userId", type, title, message, 
      action_url as "actionUrl", action_label as "actionLabel", 
      read, created_at as "createdAt", read_at as "readAt",
      metadata
    FROM notifications
    ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );

  const notifications = notificationsResult.map(n => ({
    ...n,
    metadata: n.metadata ? (typeof n.metadata === 'string' ? JSON.parse(n.metadata) : n.metadata) : undefined
  }));

  return { notifications, total };
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count 
    FROM notifications 
    WHERE (user_id = $1 OR user_id IS NULL) AND read = false`,
    [userId]
  );

  return parseInt(result[0]?.count || '0', 10);
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string, userId: string): Promise<Notification> {
  const now = new Date().toISOString();

  // Verify notification belongs to user or is broadcast
  const verifyResult = await query<{ id: string }>(
    `SELECT id FROM notifications 
    WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [notificationId, userId]
  );

  if (verifyResult.length === 0) {
    throw new Error("Notification not found or access denied");
  }

  const result = await query<Notification>(
    `UPDATE notifications 
    SET read = true, read_at = $1
    WHERE id = $2
    RETURNING 
      id, user_id as "userId", type, title, message, 
      action_url as "actionUrl", action_label as "actionLabel", 
      read, created_at as "createdAt", read_at as "readAt",
      metadata`,
    [now, notificationId]
  );

  if (result.length === 0) {
    throw new Error("Failed to update notification");
  }

  const notification = {
    ...result[0],
    metadata: result[0].metadata ? (typeof result[0].metadata === 'string' ? JSON.parse(result[0].metadata) : result[0].metadata) : undefined
  };

  // Broadcast update via WebSocket
  broadcastNotificationUpdated({
    notification,
    targetUserId: userId
  });

  // Update unread count
  const unreadCount = await getUnreadCount(userId);
  broadcastUnreadCountChanged({
    userId,
    count: unreadCount
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<number> {
  const now = new Date().toISOString();

  const result = await query<{ count: string }>(
    `UPDATE notifications 
    SET read = true, read_at = $1
    WHERE (user_id = $2 OR user_id IS NULL) AND read = false
    RETURNING id`,
    [now, userId]
  );

  const updatedCount = result.length;

  // Broadcast unread count change
  const unreadCount = await getUnreadCount(userId);
  broadcastUnreadCountChanged({
    userId,
    count: unreadCount
  });

  return updatedCount;
}

/**
 * Delete a notification
 */
export async function deleteNotification(notificationId: string, userId: string): Promise<void> {
  // Verify notification belongs to user or is broadcast
  const verifyResult = await query<{ id: string; userId: string | null }>(
    `SELECT id, user_id as "userId" FROM notifications 
    WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [notificationId, userId]
  );

  if (verifyResult.length === 0) {
    throw new Error("Notification not found or access denied");
  }

  await query(
    `DELETE FROM notifications WHERE id = $1`,
    [notificationId]
  );

  // Update unread count if notification was unread
  const unreadCount = await getUnreadCount(userId);
  broadcastUnreadCountChanged({
    userId,
    count: unreadCount
  });
}

/**
 * Get notification by ID
 */
export async function getNotificationById(notificationId: string, userId: string): Promise<Notification | null> {
  const result = await query<Notification>(
    `SELECT 
      id, user_id as "userId", type, title, message, 
      action_url as "actionUrl", action_label as "actionLabel", 
      read, created_at as "createdAt", read_at as "readAt",
      metadata
    FROM notifications 
    WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
    [notificationId, userId]
  );

  if (result.length === 0) {
    return null;
  }

  const notification = result[0];
  return {
    ...notification,
    metadata: notification.metadata ? (typeof notification.metadata === 'string' ? JSON.parse(notification.metadata) : notification.metadata) : undefined
  };
}

/**
 * Delete all notifications for a user (cleanup)
 */
export async function deleteAllForUser(userId: string, options?: { read?: boolean }): Promise<number> {
  const conditions: string[] = [`(user_id = $1 OR user_id IS NULL)`];
  const params: any[] = [userId];

  if (options?.read !== undefined) {
    conditions.push(`read = $2`);
    params.push(options.read);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await query<{ id: string }>(
    `DELETE FROM notifications ${whereClause} RETURNING id`,
    params
  );

  const deletedCount = result.length;

  // Update unread count if needed
  if (options?.read === false || options?.read === undefined) {
    const unreadCount = await getUnreadCount(userId);
    broadcastUnreadCountChanged({
      userId,
      count: unreadCount
    });
  }

  return deletedCount;
}
