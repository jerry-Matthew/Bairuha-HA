"use client";

import React, { useState, useEffect } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { RestartingDialog } from "../../RestartingDialog.client";

// ... imports

export function HacsDetailsDrawer({
  open,
  onClose,
  extensionId,
  onUpdate,
}: HacsDetailsDrawerProps) {
  const [details, setDetails] = useState<HacsExtensionDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);

  useEffect(() => {
    if (open && extensionId) {
      fetchDetails();
    } else {
      setDetails(null);
      setError(null);
    }
  }, [open, extensionId]);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/hacs/${extensionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch extension details");
      }

      const data = await response.json();
      setDetails(data.extension);
    } catch (err: any) {
      console.error("Error fetching details:", err);
      setError(err.message || "Failed to load extension details");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 600, md: 800 },
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            Extension Details
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {details && !loading && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Typography variant="h6" gutterBottom>
                  {details.name}
                </Typography>
                <Button
                  variant="contained"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const response = await fetch(`/api/hacs/${details.id}/install`, {
                        method: "POST",
                      });

                      if (!response.ok) {
                        throw new Error("Failed to install");
                      }

                      const data = await response.json();
                      if (data.success && data.extension) {
                        onUpdate(data.extension);
                        setDetails(curr => curr ? ({ ...curr, ...data.extension }) : null);
                      }
                    } catch (err) {
                      console.error("Install error:", err);
                      setError("Failed to install extension");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={details.status === "installing"}
                >
                  {details.status === "installed" ? "Redownload" : "Download"}
                </Button>
              </Box>

              {details.restartRequired && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2 }}
                  action={
                    <Button color="inherit" size="small" onClick={() => setRestartOpen(true)}>
                      Restart Now
                    </Button>
                  }
                >
                  Restart required to load this integration.
                </Alert>
              )}

              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                <Chip label={details.type} size="small" />
                <Chip
                  label={details.status}
                  size="small"
                  color={details.status === "installed" ? "success" : "default"}
                />
                {details.restartRequired && (
                  <Chip label="Restart Required" size="small" color="warning" />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                {details.description}
              </Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Statistics
              </Typography>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Stars
                  </Typography>
                  <Typography variant="body2">{details.stars.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Downloads
                  </Typography>
                  <Typography variant="body2">{details.downloads.toLocaleString()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Activity
                  </Typography>
                  <Typography variant="body2">{details.lastActivity}</Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                Version Information
              </Typography>
              <Typography variant="body2">
                Latest: {details.version}
              </Typography>
              {details.installedVersion && (
                <Typography variant="body2">
                  Installed: {details.installedVersion}
                </Typography>
              )}
            </Box>

            {details.readme && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    README
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: "action.hover",
                      borderRadius: 1,
                      maxHeight: 400,
                      overflow: "auto",
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        whiteSpace: "pre-wrap",
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                      }}
                    >
                      {details.readme}
                    </Typography>
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>

      <RestartingDialog
        open={restartOpen}
        onClose={() => setRestartOpen(false)}
        onRestartConfirmed={() => { }}
      />
    </Drawer>
  );
}
