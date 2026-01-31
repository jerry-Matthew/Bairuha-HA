"use client";

import { Box, Typography } from "@mui/material";
import { ReactNode, memo } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState = memo(({ icon, title, description, action }: EmptyStateProps) => {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 8,
        color: "text.secondary",
      }}
    >
      <Box sx={{ fontSize: 64, mb: 2, opacity: 0.5, display: "flex", justifyContent: "center" }}>
        {icon}
      </Box>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ color: "primary.main" }}
      >
        {title}
      </Typography>
      <Typography variant="body2">{description}</Typography>
      {action && <Box mt={3}>{action}</Box>}
    </Box>
  );
});

EmptyState.displayName = "EmptyState";


