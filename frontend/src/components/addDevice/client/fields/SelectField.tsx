/**
 * Select Field Component
 * 
 * Renders select/multiselect fields with static or dynamic options
 */

import React, { useState, useEffect } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Chip,
  Box,
} from "@mui/material";
import { resolveOptions } from "@/lib/config-flow/dynamic-options-resolver";
import type { ConfigFieldSchema, DynamicOptionsContext } from "../../server/integration-config-schemas";

interface SelectFieldProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  integrationId: string;
  formValues?: Record<string, any>;
}

export function SelectField({
  fieldName,
  fieldSchema,
  value,
  onChange,
  error,
  helperText,
  disabled,
  integrationId,
  formValues = {},
}: SelectFieldProps) {
  const [options, setOptions] = useState<Array<{ label: string; value: any }>>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const isMultiple = fieldSchema.type === "multiselect";
  const label = fieldSchema.label || fieldSchema.description || fieldName;
  const isRequired = fieldSchema.required === true;
  
  // Load options
  useEffect(() => {
    async function loadOptions() {
      if (fieldSchema.dynamicOptions) {
        setLoading(true);
        setErrorMessage(null);
        
        try {
          const context: DynamicOptionsContext = {
            integrationId,
            fieldName,
            formValues,
          };
          
          const resolvedOptions = await resolveOptions(fieldSchema, context);
          setOptions(resolvedOptions);
        } catch (err: any) {
          console.error("Error loading dynamic options:", err);
          setErrorMessage(err.message || "Failed to load options");
          
          // Fallback to static options if available
          if (fieldSchema.options && fieldSchema.options.length > 0) {
            setOptions(fieldSchema.options);
          }
        } finally {
          setLoading(false);
        }
      } else if (fieldSchema.options) {
        // Static options
        setOptions(fieldSchema.options);
      }
    }
    
    loadOptions();
  }, [
    fieldSchema.dynamicOptions,
    fieldSchema.options,
    integrationId,
    fieldName,
    JSON.stringify(formValues), // Re-fetch when form values change
  ]);
  
  const handleChange = (event: any) => {
    const newValue = event.target.value;
    onChange(newValue);
  };
  
  if (isMultiple) {
    return (
      <FormControl fullWidth error={error || !!errorMessage} required={isRequired} disabled={disabled || loading}>
        <InputLabel id={`${fieldName}-label`}>{label}</InputLabel>
        <Select
          labelId={`${fieldName}-label`}
          id={fieldName}
          multiple
          value={Array.isArray(value) ? value : []}
          onChange={handleChange}
          label={label}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.map((val: any) => {
                const option = options.find(opt => opt.value === val);
                return (
                  <Chip key={val} label={option?.label || val} size="small" />
                );
              })}
            </Box>
          )}
        >
          {loading ? (
            <MenuItem disabled>
              <CircularProgress size={20} />
            </MenuItem>
          ) : (
            options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))
          )}
        </Select>
        {(helperText || errorMessage) && (
          <FormHelperText>{errorMessage || helperText}</FormHelperText>
        )}
      </FormControl>
    );
  }
  
  return (
    <FormControl fullWidth error={error || !!errorMessage} required={isRequired} disabled={disabled || loading}>
      <InputLabel id={`${fieldName}-label`}>{label}</InputLabel>
      <Select
        labelId={`${fieldName}-label`}
        id={fieldName}
        value={value ?? ""}
        onChange={handleChange}
        label={label}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={20} />
          </MenuItem>
        ) : (
          options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))
        )}
      </Select>
      {(helperText || errorMessage) && (
        <FormHelperText>{errorMessage || helperText}</FormHelperText>
      )}
    </FormControl>
  );
}
