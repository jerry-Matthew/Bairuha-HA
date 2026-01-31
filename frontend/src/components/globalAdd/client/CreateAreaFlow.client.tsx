"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
} from "@mui/material";
import { AreaForm } from "./flows/AreaForm.client";

interface CreateAreaFlowProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAreaFlow({ open, onClose }: CreateAreaFlowProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (!loading) {
      setName("");
      setIcon("");
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const areaData = {
        name: name.trim(),
        icon: icon.trim() || undefined,
      };

      const response = await fetch("/api/registries/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(areaData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create area");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create area");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Area</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Area created successfully!
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <AreaForm
            name={name}
            icon={icon}
            onNameChange={setName}
            onIconChange={setIcon}
            disabled={loading || success}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success || !name.trim()}
        >
          {loading ? <CircularProgress size={20} /> : "Create Area"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

