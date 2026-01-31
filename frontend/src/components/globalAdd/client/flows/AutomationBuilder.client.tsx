"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

interface AutomationBuilderProps {
  disabled?: boolean;
  onTriggerChange?: (trigger: any) => void;
  onConditionChange?: (condition: any) => void;
  onActionChange?: (action: any) => void;
  initialTrigger?: any;
  initialCondition?: any;
  initialAction?: any;
}

export function AutomationBuilder({
  disabled,
  onTriggerChange,
  onConditionChange,
  onActionChange,
  initialTrigger,
  initialCondition,
  initialAction,
}: AutomationBuilderProps) {
  const [trigger, setTrigger] = useState<any>(initialTrigger || { platform: "state" });
  const [condition, setCondition] = useState<any>(initialCondition || null);
  const [action, setAction] = useState<any>(initialAction || { service: "" });

  const triggerPlatforms = [
    { value: "state", label: "State" },
    { value: "time", label: "Time" },
    { value: "event", label: "Event" },
    { value: "numeric_state", label: "Numeric State" },
    { value: "sun", label: "Sun" },
  ];

  const handleTriggerChange = (field: string, value: any) => {
    const newTrigger = { ...trigger, [field]: value };
    setTrigger(newTrigger);
    onTriggerChange?.(newTrigger);
  };

  const handleConditionChange = (field: string, value: any) => {
    const newCondition = { ...condition, [field]: value };
    setCondition(newCondition);
    onConditionChange?.(newCondition);
  };

  const handleActionChange = (field: string, value: any) => {
    const newAction = { ...action, [field]: value };
    setAction(newAction);
    onActionChange?.(newAction);
  };

  return (
    <Box sx={{ mt: 2 }}>
      {/* Trigger Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={600}>
            Trigger
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Trigger Type</InputLabel>
            <Select
              value={trigger.platform || "state"}
              onChange={(e) => handleTriggerChange("platform", e.target.value)}
              disabled={disabled}
              label="Trigger Type"
            >
              {triggerPlatforms.map((platform) => (
                <MenuItem key={platform.value} value={platform.value}>
                  {platform.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {trigger.platform === "state" && (
            <>
              <TextField
                fullWidth
                label="Entity ID"
                value={trigger.entity_id || ""}
                onChange={(e) => handleTriggerChange("entity_id", e.target.value)}
                disabled={disabled}
                placeholder="light.living_room"
                sx={{ mb: 2 }}
                helperText="Entity to monitor (e.g., light.living_room)"
              />
              <TextField
                fullWidth
                label="To State (optional)"
                value={trigger.to || ""}
                onChange={(e) => handleTriggerChange("to", e.target.value)}
                disabled={disabled}
                placeholder="on"
                sx={{ mb: 2 }}
                helperText="State to trigger on (e.g., on, off)"
              />
            </>
          )}

          {trigger.platform === "time" && (
            <>
              <TextField
                fullWidth
                label="Time"
                value={trigger.at || ""}
                onChange={(e) => handleTriggerChange("at", e.target.value)}
                disabled={disabled}
                placeholder="08:00:00"
                sx={{ mb: 2 }}
                helperText="Time in HH:MM:SS format"
              />
            </>
          )}

          {trigger.platform === "event" && (
            <>
              <TextField
                fullWidth
                label="Event Type"
                value={trigger.event_type || ""}
                onChange={(e) => handleTriggerChange("event_type", e.target.value)}
                disabled={disabled}
                placeholder="homeassistant.start"
                sx={{ mb: 2 }}
              />
            </>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Condition Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={600}>
            Condition {condition && <Chip label="Set" size="small" sx={{ ml: 1 }} />}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Condition Type</InputLabel>
            <Select
              value={condition?.condition || "state"}
              onChange={(e) => handleConditionChange("condition", e.target.value)}
              disabled={disabled}
              label="Condition Type"
            >
              <MenuItem value="state">State</MenuItem>
              <MenuItem value="numeric_state">Numeric State</MenuItem>
              <MenuItem value="time">Time</MenuItem>
            </Select>
          </FormControl>

          {condition?.condition === "state" && (
            <>
              <TextField
                fullWidth
                label="Entity ID"
                value={condition.entity_id || ""}
                onChange={(e) => handleConditionChange("entity_id", e.target.value)}
                disabled={disabled}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="State"
                value={condition.state || ""}
                onChange={(e) => handleConditionChange("state", e.target.value)}
                disabled={disabled}
                sx={{ mb: 2 }}
              />
            </>
          )}

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            {!condition && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => {
                  const newCondition = { condition: "state" };
                  setCondition(newCondition);
                  onConditionChange?.(newCondition);
                }}
                disabled={disabled}
                size="small"
              >
                Add Condition
              </Button>
            )}
            {condition && (
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => {
                  setCondition(null);
                  onConditionChange?.(null);
                }}
                disabled={disabled}
                size="small"
                color="error"
              >
                Remove Condition
              </Button>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Action Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" fontWeight={600}>
            Action
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            label="Service"
            value={action.service || ""}
            onChange={(e) => handleActionChange("service", e.target.value)}
            disabled={disabled}
            placeholder="light.turn_on"
            sx={{ mb: 2 }}
            helperText="Service to call (e.g., light.turn_on, switch.toggle)"
          />

          <TextField
            fullWidth
            label="Entity ID"
            value={action.entity_id || ""}
            onChange={(e) => handleActionChange("entity_id", e.target.value)}
            disabled={disabled}
            placeholder="light.living_room"
            sx={{ mb: 2 }}
            helperText="Entity to control"
          />

          <TextField
            fullWidth
            label="Service Data (JSON, optional)"
            value={action.data ? JSON.stringify(action.data, null, 2) : ""}
            onChange={(e) => {
              try {
                const data = e.target.value ? JSON.parse(e.target.value) : undefined;
                handleActionChange("data", data);
              } catch {
                // Invalid JSON, ignore
              }
            }}
            disabled={disabled}
            multiline
            rows={3}
            placeholder='{"brightness": 255}'
            helperText="Additional service data in JSON format"
          />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

