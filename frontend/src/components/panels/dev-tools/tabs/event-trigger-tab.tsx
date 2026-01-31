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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { useEventTrigger } from "../hooks/useEventTrigger";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export function EventTriggerTab() {
  const [eventType, setEventType] = useState("");
  const [eventData, setEventData] = useState("{}");
  const [metadata, setMetadata] = useState("{}");
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const { eventTypes, loading, loadingEventTypes, result, error, triggerEvent, clearResult } = useEventTrigger();

  const handleTrigger = () => {
    setJsonError(null);
    let parsedEventData: Record<string, any> = {};
    let parsedMetadata: Record<string, any> = {};

    // Validate event data JSON
    try {
      parsedEventData = JSON.parse(eventData);
    } catch (e) {
      setJsonError("Invalid event data JSON format");
      return;
    }

    // Validate metadata JSON (optional)
    if (metadata.trim()) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        setJsonError("Invalid metadata JSON format");
        return;
      }
    }

    if (!eventType) {
      setJsonError("Event type is required");
      return;
    }

    triggerEvent({
      eventType,
      eventData: parsedEventData,
      metadata: Object.keys(parsedMetadata).length > 0 ? parsedMetadata : undefined,
    });
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Event Triggering
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Trigger system events manually. Events can trigger automations and other system behaviors.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" gutterBottom fontWeight="bold">
              Event Parameters
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
              {loadingEventTypes ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    Loading event types...
                  </Typography>
                </Box>
              ) : (
                <FormControl fullWidth>
                  <InputLabel>Event Type</InputLabel>
                  <Select
                    value={eventType}
                    label="Event Type"
                    onChange={(e) => setEventType(e.target.value)}
                    disabled={loadingEventTypes}
                  >
                    {eventTypes.length === 0 ? (
                      <MenuItem value="" disabled>
                        No event types available
                      </MenuItem>
                    ) : (
                      eventTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              )}

              <TextField
                label="Event Type (manual entry)"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. entity_state_changed, automation_triggered"
                fullWidth
                helperText="Enter event type manually or select from dropdown above"
              />

              <TextField
                label="Event Data (JSON)"
                value={eventData}
                onChange={(e) => {
                  setEventData(e.target.value);
                  setJsonError(null);
                }}
                placeholder='{"entity_id": "light.example", "state": "on"}'
                multiline
                rows={8}
                fullWidth
                required
                error={!!jsonError && jsonError.includes("event data")}
                helperText={jsonError && jsonError.includes("event data") ? jsonError : "Enter JSON object for event data"}
                InputProps={{
                  sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                }}
              />

              <Accordion expanded={metadataExpanded} onChange={() => setMetadataExpanded(!metadataExpanded)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Metadata (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label="Metadata (JSON)"
                    value={metadata}
                    onChange={(e) => {
                      setMetadata(e.target.value);
                      setJsonError(null);
                    }}
                    placeholder='{"source": "manual", "user_id": "123"}'
                    multiline
                    rows={4}
                    fullWidth
                    error={!!jsonError && jsonError.includes("metadata")}
                    helperText={jsonError && jsonError.includes("metadata") ? jsonError : "Optional metadata for the event"}
                    InputProps={{
                      sx: { fontFamily: "monospace", fontSize: "0.875rem" },
                    }}
                  />
                </AccordionDetails>
              </Accordion>

              {jsonError && !jsonError.includes("event data") && !jsonError.includes("metadata") && (
                <Alert severity="error">{jsonError}</Alert>
              )}

              <Button
                variant="contained"
                color="primary"
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleTrigger}
                disabled={loading || !eventType || loadingEventTypes}
                fullWidth
                size="large"
              >
                {loading ? "Triggering..." : "Trigger Event"}
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
                  {result.success ? (
                    <Box>
                      Event triggered successfully
                      {result.eventId && (
                        <Chip
                          label={`Event ID: ${result.eventId}`}
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                  ) : (
                    "Failed to trigger event"
                  )}
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
                <Typography variant="body2">Trigger an event to see results here</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
