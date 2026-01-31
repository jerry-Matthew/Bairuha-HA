/**
 * Field Renderer
 * 
 * Central field rendering function that routes to appropriate field components
 */

import React from "react";
import { TextField, FormControlLabel, Switch, Box } from "@mui/material";
import { SelectField } from "./fields/SelectField";
import { FileUploadField } from "./fields/FileUploadField";
import { ObjectField } from "./fields/ObjectField";
import { ArrayField } from "./fields/ArrayField";
import type { ConfigFieldSchema } from "../server/integration-config-schemas";

interface RenderFieldProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  value: any;
  onChange: (value: any) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  formValues: Record<string, any>;
  validationErrors?: Record<string, string>;
  integrationId: string;
  configEntryId?: string;
}

/**
 * Render a field based on its schema type
 */
export function renderField(
  fieldName: string,
  fieldSchema: ConfigFieldSchema,
  value: any,
  onChange: (value: any) => void,
  error?: boolean,
  helperText?: string,
  disabled?: boolean,
  formValues: Record<string, any> = {},
  validationErrors: Record<string, string> = {},
  integrationId: string = "",
  configEntryId?: string
): React.ReactNode {
  const label = fieldSchema.label || fieldSchema.description || fieldName;
  const isRequired = fieldSchema.required === true;
  
  switch (fieldSchema.type) {
    case "string":
    case "password":
      return (
        <TextField
          key={fieldName}
          fullWidth
          label={label}
          name={fieldName}
          type={fieldSchema.type === "password" ? "password" : "text"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          required={isRequired}
          error={error}
          helperText={helperText}
          placeholder={fieldSchema.placeholder}
          disabled={disabled}
          margin="normal"
          InputLabelProps={{ shrink: true }}
        />
      );
      
    case "number":
      return (
        <TextField
          key={fieldName}
          fullWidth
          label={label}
          name={fieldName}
          type="number"
          value={value ?? ""}
          onChange={(e) => {
            const numValue = e.target.value === "" ? "" : Number(e.target.value);
            onChange(numValue);
          }}
          required={isRequired}
          error={error}
          helperText={helperText}
          placeholder={fieldSchema.placeholder}
          disabled={disabled}
          margin="normal"
          inputProps={{
            min: fieldSchema.min,
            max: fieldSchema.max,
          }}
          InputLabelProps={{ shrink: true }}
        />
      );
      
    case "boolean":
      return (
        <Box key={fieldName} sx={{ mt: 2, mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={value || false}
                onChange={(e) => onChange(e.target.checked)}
                disabled={disabled}
              />
            }
            label={label}
          />
        </Box>
      );
      
    case "select":
    case "multiselect":
      return (
        <SelectField
          key={fieldName}
          fieldName={fieldName}
          fieldSchema={fieldSchema}
          value={value}
          onChange={onChange}
          error={error}
          helperText={helperText}
          disabled={disabled}
          integrationId={integrationId}
          formValues={formValues}
        />
      );
      
    case "file":
      return (
        <FileUploadField
          key={fieldName}
          fieldName={fieldName}
          fieldSchema={fieldSchema}
          value={value}
          onChange={onChange}
          error={error}
          helperText={helperText}
          disabled={disabled}
          integrationId={integrationId}
          configEntryId={configEntryId}
        />
      );
      
    case "object":
      return (
        <ObjectField
          key={fieldName}
          fieldName={fieldName}
          fieldSchema={fieldSchema}
          value={value || {}}
          onChange={onChange}
          error={error}
          helperText={helperText}
          disabled={disabled}
          formValues={formValues}
          validationErrors={validationErrors}
          integrationId={integrationId}
          configEntryId={configEntryId}
        />
      );
      
    case "array":
      return (
        <ArrayField
          key={fieldName}
          fieldName={fieldName}
          fieldSchema={fieldSchema}
          value={value || []}
          onChange={onChange}
          error={error}
          helperText={helperText}
          disabled={disabled}
          formValues={formValues}
          validationErrors={validationErrors}
          integrationId={integrationId}
          configEntryId={configEntryId}
        />
      );
      
    default:
      return (
        <Box key={fieldName}>
          <Typography variant="body2" color="error">
            Unknown field type: {fieldSchema.type}
          </Typography>
        </Box>
      );
  }
}
