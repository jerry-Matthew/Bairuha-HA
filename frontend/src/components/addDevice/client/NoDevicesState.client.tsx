"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";

export function NoDevicesState() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 6,
        textAlign: "center",
      }}
    >
      <DevicesIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
      <Typography variant="h6" color="text.secondary" gutterBottom>
        No Devices Found
      </Typography>
      <Typography variant="body2" color="text.secondary">
        No devices available from this integration
      </Typography>
    </Box>
  );
}

