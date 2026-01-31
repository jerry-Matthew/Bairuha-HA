"use client";

import React, { useState } from "react";
import { TextField, Box, Typography, Autocomplete, Chip, Grid } from "@mui/material";

interface AreaFormProps {
  name: string;
  icon: string;
  onNameChange: (value: string) => void;
  onIconChange: (value: string) => void;
  disabled?: boolean;
}

// Common Material Design Icons for areas
const commonIcons = [
  { value: "mdi:home", label: "Home" },
  { value: "mdi:kitchen", label: "Kitchen" },
  { value: "mdi:bed", label: "Bedroom" },
  { value: "mdi:sofa", label: "Living Room" },
  { value: "mdi:car", label: "Garage" },
  { value: "mdi:office-building", label: "Office" },
  { value: "mdi:shower", label: "Bathroom" },
  { value: "mdi:stairs", label: "Stairs" },
  { value: "mdi:door", label: "Entrance" },
  { value: "mdi:garden", label: "Garden" },
  { value: "mdi:pool", label: "Pool" },
  { value: "mdi:warehouse", label: "Basement" },
];

export function AreaForm({ name, icon, onNameChange, onIconChange, disabled }: AreaFormProps) {
  const [iconInput, setIconInput] = useState(icon);

  const handleIconChange = (newValue: string | null) => {
    const iconValue = newValue || "";
    setIconInput(iconValue);
    onIconChange(iconValue);
  };

  return (
    <Box>
      <TextField
        fullWidth
        label="Name"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        required
        disabled={disabled}
        sx={{ mb: 2 }}
        placeholder="e.g., Living Room, Kitchen"
      />

      <Autocomplete
        freeSolo
        options={commonIcons}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.value)}
        value={iconInput}
        onChange={(_, newValue) => {
          if (typeof newValue === "string") {
            handleIconChange(newValue);
          } else if (newValue) {
            handleIconChange(newValue.value);
          } else {
            handleIconChange("");
          }
        }}
        onInputChange={(_, newInputValue) => {
          setIconInput(newInputValue);
          onIconChange(newInputValue);
        }}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Icon (optional)"
            placeholder="e.g., mdi:home"
            helperText="Material Design Icon identifier. Type to search or select from common icons."
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Chip label={typeof option === "string" ? option : option.value} size="small" sx={{ mr: 1 }} />
            {typeof option === "object" && option.label}
          </Box>
        )}
      />

      {icon && (
        <Box sx={{ mt: 2, p: 2, bgcolor: "rgba(0, 0, 0, 0.02)", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Selected icon: <code>{icon}</code>
          </Typography>
        </Box>
      )}
    </Box>
  );
}

