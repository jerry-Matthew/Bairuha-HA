"use client";

import React from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { DiscoveredDevice } from "../../server/registries.types";

interface DevicePickerProps {
  devices: DiscoveredDevice[];
  onSelect: (device: DiscoveredDevice) => void;
  loading: boolean;
}

export function DevicePicker({ devices, onSelect, loading }: DevicePickerProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (devices.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography color="text.secondary">No devices found</Typography>
      </Box>
    );
  }

  return (
    <List>
      {devices.map((device) => (
        <ListItem key={device.id} disablePadding>
          <ListItemButton
            onClick={() => onSelect(device)}
            disabled={device.status === "configured"}
          >
            <ListItemIcon>
              {device.status === "configured" ? (
                <CheckCircleIcon color="success" />
              ) : (
                <DevicesIcon />
              )}
            </ListItemIcon>
            <ListItemText
              primary={device.name}
              secondary={
                device.status === "configured"
                  ? "Already configured"
                  : `${device.manufacturer || ""} ${device.model || ""}`.trim() || "Available"
              }
            />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

