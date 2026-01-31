/**
 * useNotifications Hook
 * 
 * React hook for managing notifications
 * Handles fetching, real-time updates via WebSocket, and CRUD operations
 */

import { useState, useEffect, useCallback } from "react";
import { useWebSocket } from "./useWebSocket";
import { io } from "socket.io-client";
import { useAuth } from "@/contexts/auth-context";

export interface Notification {
  id: string;
  userId: string | null;
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

export interface UseNotificationsOptions {
  userId: string;
  autoFetch?: boolean;
  filter?: {
    read?: boolean;
    type?: string;
  };
  limit?: number;
  offset?: number;
}

/**
 * Get Socket.IO instance
 */
function getSocketInstance() {
  if (typeof window === "undefined") {
    return null;
  }
  
  // Create or reuse Socket.IO connection
  // This should be a singleton, but for simplicity we create it here
  // In production, this would be managed at a higher level
  return io(window.location.origin, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });
}

/**
 * useNotifications hook
 */
export function useNotifications(options: UseNotificationsOptions) {
  const { userId, autoFetch = true, filter, limit = 50, offset = 0 } = options;
  const { accessToken } = useAuth();
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (filter?.read !== undefined) {
        params.append("read", filter.read.toString());
      }

      if (filter?.type) {
        params.append("type", filter.type);
      }

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/notifications?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err: any) {
      console.error("Failed to fetch notifications:", err);
      setError(err.message || "Failed to fetch notifications");
    } finally {
      setLoading(false);
    }
  }, [userId, filter, limit, offset, accessToken]);

  /**
   * Fetch unread count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/notifications/unread/count", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch unread count: ${response.statusText}`);
      }

      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch (err: any) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [userId, accessToken]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ read: true }),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.statusText}`);
      }

      const data = await response.json();
      const updatedNotification = data.notification;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
      );

      // Update unread count
      await fetchUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark notification as read:", err);
      throw err;
    }
  }, [fetchUnreadCount, accessToken]);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
      }

      // Refetch notifications to update state
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err: any) {
      console.error("Failed to mark all notifications as read:", err);
      throw err;
    }
  }, [fetchNotifications, fetchUnreadCount, accessToken]);

  /**
   * Delete notification
   */
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete notification: ${response.statusText}`);
      }

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

      // Update unread count
      await fetchUnreadCount();
    } catch (err: any) {
      console.error("Failed to delete notification:", err);
      throw err;
    }
  }, [fetchUnreadCount, accessToken]);

  /**
   * Refresh notifications
   */
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  // Fetch notifications on mount if autoFetch is enabled
  useEffect(() => {
    if (autoFetch && userId) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [autoFetch, userId, fetchNotifications, fetchUnreadCount]);

  // Subscribe to WebSocket events
  useEffect(() => {
    if (!userId) {
      return;
    }

    const socket = getSocketInstance();
    if (!socket) {
      return;
    }

    // Join user room for targeted notifications
    socket.emit("join_user_room", userId);

    // Listen for new notifications
    const handleNotificationCreated = (notification: Notification) => {
      console.log("[useNotifications] Received notification_created:", notification);
      setNotifications((prev) => [notification, ...prev]);
      
      // Update unread count if notification is unread
      if (!notification.read) {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // Listen for notification updates
    const handleNotificationUpdated = (notification: Notification) => {
      console.log("[useNotifications] Received notification_updated:", notification);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? notification : n))
      );

      // Update unread count if notification was marked as read
      if (notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    // Listen for unread count changes
    const handleUnreadCountChanged = ({ count }: { count: number }) => {
      console.log("[useNotifications] Received unread_count_changed:", count);
      setUnreadCount(count);
    };

    socket.on("notification_created", handleNotificationCreated);
    socket.on("notification_updated", handleNotificationUpdated);
    socket.on("unread_count_changed", handleUnreadCountChanged);

    // Cleanup
    return () => {
      socket.off("notification_created", handleNotificationCreated);
      socket.off("notification_updated", handleNotificationUpdated);
      socket.off("unread_count_changed", handleUnreadCountChanged);
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
}
