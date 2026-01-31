"use client";

import { COMMON_ICONS } from "./icon-picker";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";

interface IconAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helperText?: string;
}

export function IconAutocomplete({
  value,
  onChange,
  label = "Icon",
  helperText,
}: IconAutocompleteProps) {
  const selectedIcon = COMMON_ICONS.find((icon) => icon.name === value);

  return (
    <Autocomplete
      options={COMMON_ICONS}
      value={selectedIcon || null}
      onChange={(_, newValue) => {
        if (typeof newValue === 'string') {
          onChange(newValue);
        } else {
          onChange(newValue?.name || "");
        }
      }}
      getOptionLabel={(option) => {
        if (typeof option === 'string') {
          return option;
        }
        return option.label || option.name;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          helperText={helperText || "Search and select an icon"}
          placeholder="Type to search icons..."
        />
      )}
      renderOption={(props, option) => {
        // Handle both icon objects and string values (from freeSolo)
        const isString = typeof option === 'string';
        const iconOption = isString 
          ? COMMON_ICONS.find(icon => icon.name === option)
          : option;
        
        const IconComponent = iconOption?.icon;
        const displayLabel = isString 
          ? (iconOption?.label || option)
          : (iconOption?.label || iconOption?.name || '');
        const displayName = isString 
          ? option 
          : (iconOption?.name || '');

        return (
          <Box
            component="li"
            {...props}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              py: 1.5,
            }}
          >
            {IconComponent ? (
              <IconComponent sx={{ fontSize: 24, color: "primary.main" }} />
            ) : (
              <Box sx={{ width: 24, height: 24 }} />
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1">{displayLabel}</Typography>
              {displayName && (
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
                  {displayName}
                </Typography>
              )}
            </Box>
          </Box>
        );
      }}
      filterOptions={(options, { inputValue }) => {
        const query = inputValue.toLowerCase();
        return options.filter(
          (option) =>
            option.name.toLowerCase().includes(query) ||
            option.label.toLowerCase().includes(query)
        );
      }}
      isOptionEqualToValue={(option, value) => {
        if (!value) return false;
        if (typeof option === 'string') {
          return option === (typeof value === 'string' ? value : value.name);
        }
        if (typeof value === 'string') {
          return option.name === value;
        }
        return option.name === value.name;
      }}
      freeSolo
      onInputChange={(_, newInputValue) => {
        // Allow manual input of icon names
        if (newInputValue && !COMMON_ICONS.some((icon) => icon.name === newInputValue)) {
          onChange(newInputValue);
        }
      }}
      sx={{
        "& .MuiAutocomplete-inputRoot": {
          paddingRight: "14px !important",
        },
      }}
    />
  );
}
