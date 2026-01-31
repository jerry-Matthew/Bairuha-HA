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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from "@mui/material";
import { useYAMLValidator } from "../hooks/useYAMLValidator";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";

const EXAMPLE_YAML_FILES = [
  {
    name: "Basic Configuration",
    yaml: `homeassistant:
  name: Home
  latitude: 40.7128
  longitude: -74.0060
  elevation: 10
  unit_system: imperial
  time_zone: America/New_York`,
    fileType: "configuration" as const,
  },
  {
    name: "Simple Automation",
    yaml: `- id: 'example_automation'
  alias: Example Automation
  trigger:
    - platform: state
      entity_id: binary_sensor.motion
      to: 'on'
  action:
    - service: light.turn_on
      target:
        entity_id: light.example`,
    fileType: "automation" as const,
  },
  {
    name: "Script",
    yaml: `example_script:
  alias: Example Script
  sequence:
    - service: light.turn_on
      target:
        entity_id: light.example`,
    fileType: "script" as const,
  },
];

export function YAMLTab() {
  const [yamlContent, setYamlContent] = useState("");
  const [fileType, setFileType] = useState<"configuration" | "automation" | "script" | "scene" | "group" | "custom">("custom");
  const [reloadDomain, setReloadDomain] = useState("");

  const {
    validating,
    checking,
    reloading,
    validationResult,
    checkResult,
    reloadResult,
    error,
    validateYAML,
    checkConfiguration,
    reloadConfiguration,
    clearResults,
  } = useYAMLValidator();

  const handleValidate = () => {
    validateYAML({ yaml: yamlContent, fileType });
  };

  const handleCheckConfig = () => {
    checkConfiguration({ yaml: yamlContent, fileType });
  };

  const handleReload = () => {
    if (reloadDomain) {
      reloadConfiguration(reloadDomain);
    }
  };

  const handleExampleClick = (example: typeof EXAMPLE_YAML_FILES[0]) => {
    setYamlContent(example.yaml);
    setFileType(example.fileType);
    clearResults();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        YAML Configuration
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Edit, validate, and test YAML configuration files.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              YAML Editor
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>File Type</InputLabel>
                <Select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as any)}
                  label="File Type"
                >
                  <MenuItem value="configuration">Configuration</MenuItem>
                  <MenuItem value="automation">Automation</MenuItem>
                  <MenuItem value="script">Script</MenuItem>
                  <MenuItem value="scene">Scene</MenuItem>
                  <MenuItem value="group">Group</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="YAML Content"
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                placeholder="Enter YAML configuration..."
                multiline
                rows={15}
                fullWidth
                InputProps={{
                  sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                }}
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleValidate}
                  disabled={!yamlContent || validating}
                  startIcon={validating ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                  Validate YAML
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleCheckConfig}
                  disabled={!yamlContent || checking}
                  startIcon={checking ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                >
                  Check Config
                </Button>
                <Button variant="text" onClick={clearResults}>
                  Clear
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" gutterBottom>
              Configuration Reload
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Domain</InputLabel>
                <Select
                  value={reloadDomain}
                  onChange={(e) => setReloadDomain(e.target.value)}
                  label="Domain"
                >
                  <MenuItem value="automation">Automation</MenuItem>
                  <MenuItem value="script">Script</MenuItem>
                  <MenuItem value="scene">Scene</MenuItem>
                  <MenuItem value="group">Group</MenuItem>
                  <MenuItem value="all">All</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="warning"
                onClick={handleReload}
                disabled={!reloadDomain || reloading}
                startIcon={reloading ? <CircularProgress size={20} /> : <RefreshIcon />}
              >
                Reload
              </Button>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Example YAML Files
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
              {EXAMPLE_YAML_FILES.map((example, idx) => (
                <Card
                  key={idx}
                  variant="outlined"
                  sx={{ cursor: "pointer" }}
                  onClick={() => handleExampleClick(example)}
                >
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {example.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {example.fileType}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 400 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Results
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {validationResult && (
              <Box sx={{ mb: 3 }}>
                <Alert
                  severity={validationResult.valid ? "success" : "error"}
                  sx={{ mb: 2 }}
                  action={
                    <Button
                      size="small"
                      startIcon={<ContentCopyIcon />}
                      onClick={() => handleCopy(JSON.stringify(validationResult, null, 2))}
                    >
                      Copy
                    </Button>
                  }
                >
                  {validationResult.valid ? "YAML is valid" : "YAML validation failed"}
                </Alert>

                {validationResult.errors.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Errors:
                    </Typography>
                    {validationResult.errors.map((err, idx) => (
                      <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                        Line {err.line || "?"}, Column {err.column || "?"}: {err.message}
                        {err.detail && ` (${err.detail})`}
                      </Alert>
                    ))}
                  </Box>
                )}

                {validationResult.warnings.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Warnings:
                    </Typography>
                    {validationResult.warnings.map((warn, idx) => (
                      <Alert key={idx} severity="warning" sx={{ mb: 1 }}>
                        {warn.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {checkResult && (
              <Box sx={{ mb: 3 }}>
                <Alert
                  severity={checkResult.valid ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {checkResult.valid ? "Configuration is valid" : "Configuration check failed"}
                </Alert>

                {checkResult.errors.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Configuration Errors:
                    </Typography>
                    {checkResult.errors.map((err, idx) => (
                      <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                        {err.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {reloadResult && (
              <Box>
                <Alert
                  severity={reloadResult.success ? "success" : "error"}
                  sx={{ mb: 2 }}
                >
                  {reloadResult.success
                    ? `Configuration reloaded: ${reloadResult.reloaded.join(", ")}`
                    : "Failed to reload configuration"}
                </Alert>

                {reloadResult.errors.length > 0 && (
                  <Box>
                    {reloadResult.errors.map((err, idx) => (
                      <Alert key={idx} severity="error" sx={{ mb: 1 }}>
                        {err.message}
                      </Alert>
                    ))}
                  </Box>
                )}
              </Box>
            )}

            {!validationResult && !checkResult && !reloadResult && !error && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: 200,
                  color: "text.secondary",
                }}
              >
                <Typography>Results will appear here</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
