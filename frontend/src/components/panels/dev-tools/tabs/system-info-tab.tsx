"use client";

import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
} from "@mui/material";
import { useSystemInfo } from "../hooks/useSystemInfo";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningIcon from "@mui/icons-material/Warning";
import ErrorIcon from "@mui/icons-material/Error";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function getHealthIcon(status: string) {
  switch (status) {
    case "healthy":
      return <CheckCircleIcon color="success" />;
    case "degraded":
      return <WarningIcon color="warning" />;
    case "unhealthy":
      return <ErrorIcon color="error" />;
    default:
      return <WarningIcon color="disabled" />;
  }
}

function getHealthColor(status: string): "success" | "warning" | "error" | "default" {
  switch (status) {
    case "healthy":
      return "success";
    case "degraded":
      return "warning";
    case "unhealthy":
      return "error";
    default:
      return "default";
  }
}

export function SystemInfoTab() {
  const { health, info, config, loading, error, autoRefresh, setAutoRefresh, refresh } = useSystemInfo();

  const handleCopy = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            System Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View system health, version, and configuration information
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <FormControlLabel
            control={
              <Switch checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            }
            label="Auto-refresh (10s)"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && !health && !info && !config ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Health Status */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">Health Status</Typography>
                  {health && getHealthIcon(health.status)}
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loading ? (
                  <CircularProgress size={24} />
                ) : health ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={health.status.toUpperCase()}
                        color={getHealthColor(health.status)}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                    {health.uptime !== undefined && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Uptime
                        </Typography>
                        <Typography variant="body1">{formatUptime(health.uptime)}</Typography>
                      </Box>
                    )}
                    {health.connections !== undefined && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Active Connections
                        </Typography>
                        <Typography variant="body1">{health.connections}</Typography>
                      </Box>
                    )}
                    {health.lastChecked && (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Last Checked
                        </Typography>
                        <Typography variant="caption">
                          {new Date(health.lastChecked).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No health data available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* System Info */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6">System Info</Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                {loading ? (
                  <CircularProgress size={24} />
                ) : info ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {Object.entries(info).map(([key, value]) => (
                      <Box key={key}>
                        <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                          {key.replace(/_/g, " ")}
                        </Typography>
                        <Typography variant="body1">{String(value)}</Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No system info available
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {health && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopy(health)}
                    >
                      Copy Health Data
                    </Button>
                  )}
                  {info && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopy(info)}
                    >
                      Copy System Info
                    </Button>
                  )}
                  {config && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopy(config)}
                    >
                      Copy Configuration
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Configuration */}
          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">System Configuration</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {loading ? (
                  <CircularProgress />
                ) : config ? (
                  <Box>
                    <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => handleCopy(config)}
                      >
                        Copy JSON
                      </Button>
                    </Box>
                    <TextField
                      fullWidth
                      multiline
                      value={JSON.stringify(config, null, 2)}
                      InputProps={{
                        readOnly: true,
                        sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                      }}
                      variant="outlined"
                      minRows={10}
                    />
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No configuration data available
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
