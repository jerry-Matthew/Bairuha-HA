"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import type { DeviceProvider, Device } from "../server/registries.types";

type Step = "provider" | "confirm";

interface AddDeviceFlowProps {
  open: boolean;
  onClose: () => void;
}

export function AddDeviceFlow({ open, onClose }: AddDeviceFlowProps) {
  const [step, setStep] = useState<Step>("provider");
  const [providers, setProviders] = useState<DeviceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<DeviceProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadProviders();
    } else {
      // Reset state when dialog closes
      setStep("provider");
      setSelectedProvider(null);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/registries/devices?action=providers");
      if (!response.ok) throw new Error("Failed to load providers");
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (err: any) {
      setError(err.message || "Failed to load device providers");
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = (provider: DeviceProvider) => {
    setSelectedProvider(provider);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!selectedProvider) return;

    try {
      setLoading(true);
      setError(null);

      const deviceData: Omit<Device, "id" | "created_at" | "updated_at"> = {
        name: `${selectedProvider.name} Device`,
        integrationId: selectedProvider.id,
        integrationName: selectedProvider.name,
        model: undefined,
        manufacturer: undefined,
      };

      const response = await fetch("/api/registries/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to register device");
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to register device");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "confirm") {
      setStep("provider");
      setSelectedProvider(null);
    }
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Device</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Device registered successfully!
          </Alert>
        )}

        {loading && step === "provider" && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {step === "provider" && !loading && (
          <Box>
            {providers.length === 0 ? (
              <Typography color="text.secondary">No device providers available</Typography>
            ) : (
              <List>
                {providers.map((provider) => (
                  <ListItem key={provider.id} disablePadding>
                    <ListItemButton onClick={() => handleProviderSelect(provider)}>
                      <ListItemIcon>
                        <DevicesIcon />
                      </ListItemIcon>
                      <ListItemText primary={provider.name} secondary={provider.description} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {step === "confirm" && selectedProvider && (
          <Box>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Confirm Device Registration
            </Typography>
            <Typography variant="body1">
              Register a device for <strong>{selectedProvider.name}</strong>?
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {step !== "provider" && <Button onClick={handleBack}>Back</Button>}
        {step === "confirm" && (
          <Button onClick={handleConfirm} variant="contained" disabled={loading || success}>
            {loading ? "Registering..." : "Register Device"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

