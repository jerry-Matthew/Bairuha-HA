"use client";

import React from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Divider,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface WizardSummaryProps {
  steps: Array<{
    stepId: string;
    title: string;
    data: Record<string, any>;
  }>;
  onConfirm: () => Promise<void>;
  onEditStep: (stepId: string) => void;
  onBack?: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * Wizard Summary Component
 * 
 * Displays a summary of all collected wizard step data before final confirmation.
 * Allows editing individual steps and confirms the setup.
 */
export function WizardSummary({
  steps,
  onConfirm,
  onEditStep,
  onBack,
  onCancel,
  loading = false,
}: WizardSummaryProps) {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) {
      return "—";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatFieldName = (fieldName: string): string => {
    // Convert snake_case or camelCase to Title Case
    return fieldName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3, display: "flex", alignItems: "center", gap: 2 }}>
          <CheckCircleIcon color="primary" sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" component="h2">
              Review Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please review your configuration before completing the setup
            </Typography>
          </Box>
        </Box>

        {steps.map((step, index) => (
          <Box key={step.stepId} sx={{ mb: 3 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Typography variant="h6" color="primary">
                {step.title}
              </Typography>
              <Tooltip title="Edit this step">
                <IconButton
                  size="small"
                  onClick={() => onEditStep(step.stepId)}
                  disabled={loading}
                  color="primary"
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Card variant="outlined">
              <CardContent>
                {Object.keys(step.data).length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    No data collected in this step
                  </Typography>
                ) : (
                  <Grid container spacing={2}>
                    {Object.entries(step.data).map(([fieldName, value]) => (
                      <Grid item xs={12} sm={6} key={fieldName}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 0.5 }}
                        >
                          {formatFieldName(fieldName)}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            wordBreak: "break-word",
                            fontFamily: typeof value === "object" ? "monospace" : "inherit",
                            fontSize: typeof value === "object" ? "0.75rem" : "inherit",
                          }}
                        >
                          {formatValue(value)}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>

            {index < steps.length - 1 && <Divider sx={{ mt: 3 }} />}
          </Box>
        ))}

        <Box sx={{ mt: 4, p: 2, bgcolor: "info.light", borderRadius: 1 }}>
          <Typography variant="body2" color="info.contrastText">
            Once you confirm, the integration will be set up with these settings.
            You can modify them later in the settings.
          </Typography>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Box>
          {onBack && (
            <Button
              onClick={onBack}
              disabled={loading}
              startIcon={<ArrowBackIcon />}
            >
              Back
            </Button>
          )}
          {onCancel && (
            <Button onClick={onCancel} disabled={loading} sx={{ ml: 1 }}>
              Cancel
            </Button>
          )}
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
        >
          {loading ? "Completing Setup..." : "Confirm & Complete"}
        </Button>
      </CardActions>
    </Card>
  );
}
