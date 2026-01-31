"use client";

import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Button,
} from "@mui/material";
import {
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (notificationId: string) => void;
  onDelete?: (notificationId: string) => void;
  onClick?: (notification: Notification) => void;
}

/**
 * Get notification type color
 */
function getNotificationTypeColor(type: Notification["type"]): string {
  switch (type) {
    case "info":
      return "#2196F3"; // Blue
    case "success":
      return "#4CAF50"; // Green
    case "warning":
      return "#FF9800"; // Orange
    case "error":
      return "#F44336"; // Red
    default:
      return "#757575"; // Gray
  }
}

/**
 * Get notification type icon
 */
function getNotificationTypeIcon(type: Notification["type"]) {
  switch (type) {
    case "info":
      return <InfoIcon />;
    case "success":
      return <CheckCircleIcon />;
    case "warning":
      return <WarningIcon />;
    case "error":
      return <ErrorIcon />;
    default:
      return <InfoIcon />;
  }
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp: string): string {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Unknown date";
  }

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    return "Just now";
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else if (days < 7) {
    return `${days}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Notification Item Component
 */
export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClick,
}: NotificationItemProps) {
  const [expanded, setExpanded] = useState(false);

  const typeColor = getNotificationTypeColor(notification.type);
  const typeIcon = getNotificationTypeIcon(notification.type);
  const timestamp = formatTimestamp(notification.createdAt);

  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    } else if (!notification.read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  return (
    <Paper
      elevation={notification.read ? 0 : 1}
      sx={{
        p: 2,
        mb: 1,
        cursor: onClick || (!notification.read && onMarkAsRead) ? "pointer" : "default",
        backgroundColor: notification.read ? "transparent" : "background.paper",
        borderLeft: `4px solid ${typeColor}`,
        opacity: notification.read ? 0.7 : 1,
        "&:hover": {
          backgroundColor: "action.hover",
        },
      }}
      onClick={handleClick}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        {/* Type Icon */}
        <Box
          sx={{
            color: typeColor,
            mt: 0.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          {typeIcon}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: notification.read ? "normal" : "bold",
                flex: 1,
              }}
            >
              {notification.title}
            </Typography>
            {!notification.read && (
              <Chip
                label="New"
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: "0.7rem" }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              {timestamp}
            </Typography>
          </Box>

          {notification.message && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: notification.actionLabel ? 1 : 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: expanded ? undefined : 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {notification.message}
            </Typography>
          )}

          {notification.actionLabel && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleAction}
              sx={{ mt: 1 }}
            >
              {notification.actionLabel}
            </Button>
          )}

          {/* Expand/Collapse for long messages */}
          {notification.message && notification.message.length > 100 && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              sx={{ mt: 0.5 }}
            >
              <ExpandMoreIcon
                sx={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }}
              />
            </IconButton>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
          {onDelete && (
            <IconButton
              size="small"
              onClick={handleDelete}
              sx={{ color: "text.secondary" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
