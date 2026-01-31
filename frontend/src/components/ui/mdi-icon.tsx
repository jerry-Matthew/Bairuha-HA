"use client";

import React from "react";
import { Box } from "@mui/material";

/**
 * Renders a Material Design Icon from an MDI string (e.g., "mdi:security")
 * Uses the Material Design Icons web font from CDN
 */
interface MDIIconProps {
  icon: string;
  size?: number;
  color?: string;
  className?: string;
}

export function MDIIcon({ icon, size = 24, color, className }: MDIIconProps) {
  // Extract icon name from "mdi:icon-name" format
  const iconName = icon.startsWith("mdi:") ? icon.slice(4) : icon;
  
  // Use Material Design Icons web font
  // Format: <i class="mdi mdi-icon-name"></i>
  return (
    <Box
      component="i"
      className={`mdi mdi-${iconName} ${className || ""}`}
      sx={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: color || "inherit",
        fontStyle: "normal",
        lineHeight: 1,
      }}
    />
  );
}
