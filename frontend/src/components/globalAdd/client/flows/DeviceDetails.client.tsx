"use client";

import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import type { DiscoveredDevice, DeviceProvider } from "../../server/registries.types";

interface DeviceDetailsProps {
  device: DiscoveredDevice;
  provider: DeviceProvider;
}

export function DeviceDetails({ device, provider }: DeviceDetailsProps) {
  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        {device.name}
      </Typography>
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <strong>Provider:</strong> {provider.name}
        </Typography>
        {device.manufacturer && (
          <Typography variant="body2" color="text.secondary">
            <strong>Manufacturer:</strong> {device.manufacturer}
          </Typography>
        )}
        {device.model && (
          <Typography variant="body2" color="text.secondary">
            <strong>Model:</strong> {device.model}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}

