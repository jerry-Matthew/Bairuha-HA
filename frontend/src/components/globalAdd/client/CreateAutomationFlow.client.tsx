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
import { AutomationBuilder } from "./flows/AutomationBuilder.client";

interface CreateAutomationFlowProps {
  open: boolean;
  onClose: () => void;
}

export function CreateAutomationFlow({ open, onClose }: CreateAutomationFlowProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<any>(null);
  const [condition, setCondition] = useState<any>(null);
  const [action, setAction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (!loading) {
      setName("");
      setDescription("");
      setTrigger(null);
      setCondition(null);
      setAction(null);
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

    if (!trigger || !trigger.platform) {
      setError("Please configure at least a trigger");
      return;
    }

    if (!action || !action.service) {
      setError("Please configure an action");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const automationData = {
        name: name.trim(),
        description: description.trim() || undefined,
        enabled: true,
        trigger: trigger,
        condition: condition || undefined,
        action: action,
      };

      const response = await fetch("/api/registries/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(automationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create automation");
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to create automation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Create Automation</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Automation created successfully!
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading || success}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            disabled={loading || success}
          />

          <Box sx={{ mt: 3 }}>
            <AutomationBuilder
              disabled={loading || success}
              onTriggerChange={setTrigger}
              onConditionChange={setCondition}
              onActionChange={setAction}
              initialTrigger={trigger}
              initialCondition={condition}
              initialAction={action}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || success || !name.trim() || !trigger || !action}
        >
          {loading ? <CircularProgress size={20} /> : "Create Automation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

