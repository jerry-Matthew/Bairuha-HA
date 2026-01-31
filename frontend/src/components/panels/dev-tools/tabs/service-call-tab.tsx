"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
} from "@mui/material";
import { useServiceCall } from "../hooks/useServiceCall";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

const EXAMPLE_SERVICE_CALLS = [
  {
    domain: "light",
    service: "turn_on",
    serviceData: { entity_id: "light.example" },
    description: "Turn on a light",
  },
  {
    domain: "light",
    service: "turn_off",
    serviceData: { entity_id: "light.example" },
    description: "Turn off a light",
  },
  {
    domain: "switch",
    service: "toggle",
    serviceData: { entity_id: "switch.example" },
    description: "Toggle a switch",
  },
  {
    domain: "climate",
    service: "set_temperature",
    serviceData: { entity_id: "climate.example", temperature: 72 },
    description: "Set climate temperature",
  },
];

export function ServiceCallTab() {
  const [domain, setDomain] = useState("");
  const [service, setService] = useState("");
  const [serviceData, setServiceData] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { loading, result, error, executeServiceCall, clearResult } = useServiceCall();

  const handleExecute = () => {
    setJsonError(null);
    let parsedData: Record<string, any> = {};

    // Validate JSON
    if (serviceData.trim()) {
      try {
        parsedData = JSON.parse(serviceData);
      } catch (e) {
        setJsonError("Invalid JSON format");
        return;
      }
    }

    if (!domain || !service) {
      setJsonError("Domain and service are required");
      return;
    }

    executeServiceCall({
      domain,
      service,
      serviceData: Object.keys(parsedData).length > 0 ? parsedData : undefined,
    });
  };

  const handleExampleClick = (example: typeof EXAMPLE_SERVICE_CALLS[0]) => {
    setDomain(example.domain);
    setService(example.service);
    setServiceData(JSON.stringify(example.serviceData, null, 2));
    clearResult();
    setJsonError(null);
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Service Call Testing
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Execute Home Assistant service calls. ⚠️ This can affect system state.
      </Typography>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <strong>Warning:</strong> Service calls directly affect your smart home system. Use with caution.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Service Call Parameters
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <TextField
                label="Domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. light, switch, climate"
                required
                fullWidth
              />

              <TextField
                label="Service"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. turn_on, turn_off, toggle"
                required
                fullWidth
              />

              <TextField
                label="Service Data (JSON)"
                value={serviceData}
                onChange={(e) => {
                  setServiceData(e.target.value);
                  setJsonError(null);
                }}
                placeholder='{"entity_id": "light.example"}'
                multiline
                rows={6}
                fullWidth
                error={!!jsonError}
                helperText={jsonError || "Enter JSON object for service data"}
                InputProps={{
                  sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                }}
              />

              <Button
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleExecute}
                disabled={loading || !domain || !service}
                fullWidth
                size="large"
              >
                {loading ? "Executing..." : "Execute Service Call"}
              </Button>

              {result && (
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={handleCopyResult}
                  fullWidth
                >
                  Copy Result
                </Button>
              )}
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Example Service Calls
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              {EXAMPLE_SERVICE_CALLS.map((example, idx) => (
                <Card key={idx} variant="outlined" sx={{ cursor: "pointer" }} onClick={() => handleExampleClick(example)}>
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Chip label={example.domain} size="small" />
                      <Chip label={example.service} size="small" color="primary" />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {example.description}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Result
              </Typography>
              {result && (
                <Button size="small" onClick={clearResult}>
                  Clear
                </Button>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
                <CircularProgress />
              </Box>
            )}

            {!loading && result && (
              <Box>
                <Alert
                  severity={result.success ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {result.success ? "Service call executed successfully" : "Service call failed"}
                </Alert>

                <TextField
                  fullWidth
                  multiline
                  value={JSON.stringify(result, null, 2)}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                  }}
                  variant="outlined"
                  minRows={15}
                />
              </Box>
            )}

            {!loading && !result && !error && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 200,
                  color: "text.secondary",
                }}
              >
                <Typography variant="body2">Execute a service call to see results here</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
