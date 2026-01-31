"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from "@mui/material";

export type DeviceType = 
  | "smart_light"
  | "smart_switch"
  | "temperature_sensor"
  | "motion_sensor"
  | "thermostat"
  | "door_lock"
  | "garage_door"
  | "camera"
  | "fan"
  | "cover"
  | "climate"
  | "default";

interface DeviceConfirmProps {
  device: {
    id: string;
    name: string;
    model?: string;
    manufacturer?: string;
  };
  integrationName: string;
  onDeviceChange?: (device: { name: string; deviceType: DeviceType; model?: string; manufacturer?: string }) => void;
}

const DEVICE_TYPE_OPTIONS: Array<{ value: DeviceType; label: string; description: string }> = [
  { value: "smart_light", label: "Smart Light", description: "Smart lighting device" },
  { value: "smart_switch", label: "Smart Switch", description: "Smart switch/outlet" },
  { value: "temperature_sensor", label: "Temperature Sensor", description: "Temperature monitoring sensor" },
  { value: "motion_sensor", label: "Motion Sensor", description: "Motion detection sensor" },
  { value: "thermostat", label: "Thermostat", description: "Climate control thermostat" },
  { value: "door_lock", label: "Door Lock", description: "Smart door lock" },
  { value: "garage_door", label: "Garage Door", description: "Garage door opener" },
  { value: "camera", label: "Camera", description: "Security camera" },
  { value: "fan", label: "Fan", description: "Smart fan" },
  { value: "cover", label: "Cover/Blind", description: "Window coverings or blinds" },
  { value: "climate", label: "Climate Control", description: "HVAC system" },
  { value: "default", label: "Generic Device", description: "Generic smart device" },
];

export function DeviceConfirm({ device, integrationName, onDeviceChange }: DeviceConfirmProps) {
  const [deviceName, setDeviceName] = useState(device.name);
  const [deviceType, setDeviceType] = useState<DeviceType>("default");
  const [model, setModel] = useState(device.model || "");
  const [manufacturer, setManufacturer] = useState(device.manufacturer || "");
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Update local state when device prop changes (but not on initial mount)
  useEffect(() => {
    if (!isInitialMount) {
      setDeviceName(device.name);
      setModel(device.model || "");
      setManufacturer(device.manufacturer || "");
    }
  }, [device.name, device.model, device.manufacturer, isInitialMount]);

  // Mark initial mount as complete
  useEffect(() => {
    setIsInitialMount(false);
  }, []);

  // Notify parent of changes (but skip initial mount to prevent infinite loop)
  useEffect(() => {
    if (!isInitialMount && onDeviceChange) {
      onDeviceChange({
        name: deviceName,
        deviceType,
        model: model || undefined,
        manufacturer: manufacturer || undefined,
      });
    }
  }, [deviceName, deviceType, model, manufacturer, onDeviceChange, isInitialMount]);

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Confirm Device
      </Typography>
      
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Device Name */}
        <TextField
          fullWidth
          label="Device Name"
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          required
          helperText="Enter a name for this device"
        />

        {/* Device Type */}
        <FormControl fullWidth required>
          <InputLabel>Device Type</InputLabel>
          <Select
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as DeviceType)}
            label="Device Type"
          >
            {DEVICE_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Box>
                  <Typography variant="body1">{option.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.description}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Integration (read-only) */}
        <TextField
          fullWidth
          label="Integration"
          value={integrationName}
          disabled
          helperText="The integration this device belongs to"
        />

        {/* Optional: Model */}
        <TextField
          fullWidth
          label="Model (Optional)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          helperText="Device model number"
        />

        {/* Optional: Manufacturer */}
        <TextField
          fullWidth
          label="Manufacturer (Optional)"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          helperText="Device manufacturer"
        />
      </Box>

      <Alert severity="info" sx={{ mt: 2 }}>
        Click "Register Device" to add this device to your system. The device type determines which entities will be created.
      </Alert>
    </Box>
  );
}

