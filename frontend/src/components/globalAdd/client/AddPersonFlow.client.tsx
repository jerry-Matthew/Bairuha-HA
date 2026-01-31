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
import { PersonForm } from "./flows/PersonForm.client";

interface AddPersonFlowProps {
  open: boolean;
  onClose: () => void;
}

export function AddPersonFlow({ open, onClose }: AddPersonFlowProps) {
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (!loading) {
      setName("");
      setPhotoUrl("");
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

      const personData = {
        name: name.trim(),
        photoUrl: photoUrl.trim() || undefined,
      };

      const response = await fetch("/api/registries/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add person");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to add person");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Person</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Person added successfully!
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <PersonForm
            name={name}
            photoUrl={photoUrl}
            onNameChange={setName}
            onPhotoUrlChange={setPhotoUrl}
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
          {loading ? <CircularProgress size={20} /> : "Add Person"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

