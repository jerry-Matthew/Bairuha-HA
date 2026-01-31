"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  CircularProgress,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { DiscoveredDevice } from "../server/device.types";

interface DeviceDiscoveryProps {
  devices: DiscoveredDevice[];
  onSelect: (device: DiscoveredDevice) => void;
  onRefresh: () => void;
  onManualEntry?: () => void;
  loading?: boolean;
  refreshing?: boolean;
  autoRefreshInterval?: number; // Auto-refresh interval in milliseconds
}

export function DeviceDiscovery({
  devices,
  onSelect,
  onRefresh,
  onManualEntry,
  loading = false,
  refreshing = false,
  autoRefreshInterval = 30000, // Default: 30 seconds
}: DeviceDiscoveryProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<string>("all");
  const [groupedDevices, setGroupedDevices] = useState<Map<string, DiscoveredDevice[]>>(new Map());

  // Group devices by protocol
  useEffect(() => {
    const grouped = new Map<string, DiscoveredDevice[]>();
    for (const device of devices) {
      const protocol = device.protocol || "unknown";
      if (!grouped.has(protocol)) {
        grouped.set(protocol, []);
      }
      grouped.get(protocol)!.push(device);
    }
    setGroupedDevices(grouped);
  }, [devices]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        onRefresh();
      }, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefreshInterval, onRefresh]);

  // Get unique protocols
  const protocols = Array.from(groupedDevices.keys()).sort();

  // Filter devices by selected protocol
  const filteredDevices = selectedProtocol === "all"
    ? devices
    : devices.filter(d => d.protocol === selectedProtocol);

  if (loading) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Discovering devices...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Discovered Devices</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            onClick={onRefresh}
            disabled={refreshing}
            size="small"
            aria-label="Refresh devices"
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Protocol Filter */}
      {protocols.length > 1 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filter by Protocol</InputLabel>
          <Select
            value={selectedProtocol}
            onChange={(e) => setSelectedProtocol(e.target.value)}
            label="Filter by Protocol"
          >
            <MenuItem value="all">All Protocols ({devices.length})</MenuItem>
            {protocols.map((protocol) => (
              <MenuItem key={protocol} value={protocol}>
                {protocol} ({groupedDevices.get(protocol)?.length || 0})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Manual Entry Fallback */}
      {onManualEntry && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            onClick={onManualEntry}
            fullWidth
          >
            Enter Device Manually
          </Button>
        </Box>
      )}

      {filteredDevices.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 4,
            textAlign: "center",
          }}
        >
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {devices.length === 0
              ? "No devices found"
              : `No devices found for protocol: ${selectedProtocol}`}
          </Typography>
          <Button
            variant="outlined"
            onClick={onRefresh}
            disabled={refreshing}
            startIcon={<RefreshIcon />}
            sx={{ mt: 2 }}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          {onManualEntry && (
            <Button
              variant="text"
              onClick={onManualEntry}
              sx={{ mt: 1 }}
            >
              Or enter device manually
            </Button>
          )}
        </Box>
      ) : (
        <>
          {/* Grouped by Protocol */}
          {protocols.length > 1 ? (
            protocols.map((protocol) => {
              const protocolDevices = groupedDevices.get(protocol) || [];
              if (selectedProtocol !== "all" && selectedProtocol !== protocol) {
                return null;
              }

              return (
                <Accordion key={protocol} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1">
                      {protocol} ({protocolDevices.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List>
                      {protocolDevices.map((device) => (
                        <ListItem key={device.id} disablePadding>
                          <ListItemButton onClick={() => onSelect(device)}>
                            <ListItemText
                              primary={device.name}
                              secondary={
                                <>
                                  {device.manufacturer || device.model
                                    ? `${device.manufacturer || ""} ${device.model || ""}`.trim()
                                    : undefined}
                                  {device.integrationDomain && (
                                    <Chip
                                      label={device.integrationDomain}
                                      size="small"
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              );
            })
          ) : (
            /* Simple List */
            <List>
              {filteredDevices.map((device) => (
                <ListItem key={device.id} disablePadding>
                  <ListItemButton onClick={() => onSelect(device)}>
                    <ListItemText
                      primary={device.name}
                      secondary={
                        <>
                          {device.manufacturer || device.model
                            ? `${device.manufacturer || ""} ${device.model || ""}`.trim()
                            : undefined}
                          {device.protocol && (
                            <Chip
                              label={device.protocol}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {device.integrationDomain && (
                            <Chip
                              label={device.integrationDomain}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}
    </Box>
  );
}

