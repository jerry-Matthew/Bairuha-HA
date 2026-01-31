"use client";

import { IconButton, Badge } from "@mui/material";
import { Notifications as NotificationsIcon } from "@mui/icons-material";
import { useNotifications } from "@/hooks/useNotifications";

interface NotificationBadgeProps {
  userId: string;
  onClick?: () => void;
}

/**
 * Notification Badge Component
 * Displays unread notification count and opens notification panel on click
 */
export function NotificationBadge({ userId, onClick }: NotificationBadgeProps) {
  const { unreadCount } = useNotifications({
    userId,
    autoFetch: true,
  });

  return (
    <IconButton
      color="inherit"
      onClick={onClick}
      aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ""}`}
    >
      <Badge badgeContent={unreadCount > 0 ? unreadCount : 0} color="error">
        <NotificationsIcon />
      </Badge>
    </IconButton>
  );
}
