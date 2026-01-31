"use client";

import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  List,
} from "@mui/material";
import {
  Close as CloseIcon,
  DoneAll as CheckAllIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import { PanelHeader } from "@/components/ui/panel-header";
import { EmptyState } from "@/components/ui/empty-state";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/notification-item";

interface NotificationsPanelProps {
  userId: string;
  onClose?: () => void;
}

type FilterType = "all" | "unread" | "info" | "success" | "warning" | "error";

/**
 * Notifications Panel Component
 * Displays system notifications in a feed layout
 */
export function NotificationsPanel({ userId, onClose }: NotificationsPanelProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // Memoize filter options to prevent infinite render loop
  const filterOptions = useMemo(() => {
    return filter === "unread" ? { read: false } : undefined;
  }, [filter]);

  // Use notifications hook with filter
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({
    userId,
    autoFetch: true,
    filter: filterOptions,
    limit: 100,
    offset: 0,
  });

  // Filter notifications by type if filter is set (only for type filters, not read/unread)
  // The API already handles read/unread filtering
  const filteredNotifications = notifications.filter((notification) => {
    // If filter is "all" or "unread", don't apply client-side filtering
    // (API already filtered unread, and "all" means no filter)
    if (filter === "all" || filter === "unread") {
      return true;
    }
    // For type filters (info, success, warning, error), apply client-side filtering
    return notification.type === filter;
  });

  // Sort notifications by created date (newest first)
  const sortedNotifications = [...filteredNotifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to mark notification as read",
      });
    }
  };

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setSnackbar({
        open: true,
        message: "All notifications marked as read",
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to mark all notifications as read",
      });
    }
  };

  /**
   * Handle delete notification
   */
  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      setSnackbar({
        open: true,
        message: "Notification deleted",
      });
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || "Failed to delete notification",
      });
    }
  };

  /**
   * Handle notification click
   */
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }

    // Navigate to action URL if present
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  /**
   * Close snackbar
   */
  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: "" });
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PanelHeader
        title="Notifications"
        description="Manage your system notifications"
        action={
          <>
            {unreadCount > 0 && (
              <Button
                startIcon={<CheckAllIcon />}
                onClick={handleMarkAllAsRead}
                size="small"
                variant="outlined"
                sx={{ mr: 1 }}
              >
                Mark All Read
              </Button>
            )}
            {onClose && (
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            )}
          </>
        }
      />

      {/* Filter Chips */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Chip
            label={`All (${notifications.length})`}
            onClick={() => setFilter("all")}
            color={filter === "all" ? "primary" : "default"}
            size="small"
            clickable
          />
          <Chip
            label={`Unread (${unreadCount})`}
            onClick={() => setFilter("unread")}
            color={filter === "unread" ? "primary" : "default"}
            size="small"
            clickable
          />
          <Chip
            label="Info"
            onClick={() => setFilter("info")}
            color={filter === "info" ? "primary" : "default"}
            size="small"
            clickable
          />
          <Chip
            label="Success"
            onClick={() => setFilter("success")}
            color={filter === "success" ? "primary" : "default"}
            size="small"
            clickable
          />
          <Chip
            label="Warning"
            onClick={() => setFilter("warning")}
            color={filter === "warning" ? "primary" : "default"}
            size="small"
            clickable
          />
          <Chip
            label="Error"
            onClick={() => setFilter("error")}
            color={filter === "error" ? "primary" : "default"}
            size="small"
            clickable
          />
        </Box>
      </Box>

      <Divider />

      {/* Content */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        {loading && sortedNotifications.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && sortedNotifications.length === 0 && (
          <EmptyState
            icon={<NotificationsIcon />}
            title="No notifications"
            description={
              filter === "all"
                ? "You don't have any notifications yet"
                : `No ${filter} notifications found`
            }
          />
        )}

        {sortedNotifications.length > 0 && !error && (
          <Box sx={{ opacity: loading ? 0.5 : 1, transition: "opacity 0.2s" }}>
            <List sx={{ p: 0 }}>
              {sortedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onClick={handleNotificationClick}
                />
              ))}
            </List>
          </Box>
        )}
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseSnackbar}
        message={snackbar.message}
      />
    </Box>
  );
}
