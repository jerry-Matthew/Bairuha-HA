"use client";

import { Box, Typography, useTheme } from "@mui/material";
import { memo } from "react";
import type { ReactNode } from "react";

interface PanelHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export const PanelHeader = memo(({ title, description, action }: PanelHeaderProps) => {
  const theme = useTheme();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box flex={1}>
          <Typography
            variant="h4"
            gutterBottom
            fontWeight="bold"
            sx={{
              color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
              fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#666666',
              fontSize: { xs: "0.875rem", sm: "1rem" },
            }}
            paragraph
          >
            {description}
          </Typography>
        </Box>
        {action && (
          <Box ml={2} sx={{ flexShrink: 0 }}>
            {action}
          </Box>
        )}
      </Box>
    </Box>
  );
});

PanelHeader.displayName = "PanelHeader";


