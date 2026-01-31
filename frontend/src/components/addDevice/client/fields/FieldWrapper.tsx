/**
 * Field Wrapper Component
 * 
 * Wraps fields with conditional logic, help text, and error handling
 */

import React from "react";
import { Box, FormHelperText } from "@mui/material";
import { shouldShowField } from "@/lib/config-flow/conditional-field-engine";
import { FieldHelp } from "./FieldHelp";
import type { ConfigFieldSchema } from "../../server/integration-config-schemas";

interface FieldWrapperProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  formValues: Record<string, any>;
  errorMessage?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({
  fieldName,
  fieldSchema,
  formValues,
  errorMessage,
  required,
  children,
}: FieldWrapperProps) {
  // Check if field should be visible
  const isVisible = shouldShowField(fieldName, fieldSchema, formValues);
  
  if (!isVisible) {
    return null;
  }
  
  const hasError = !!errorMessage;
  const isRequired = required ?? fieldSchema.required ?? false;
  
  return (
    <Box sx={{ mb: 2 }}>
      {children}
      
      {/* Error message */}
      {hasError && (
        <FormHelperText error sx={{ mt: 0.5, ml: 0 }}>
          {errorMessage}
        </FormHelperText>
      )}
      
      {/* Required indicator */}
      {isRequired && !hasError && (
        <FormHelperText sx={{ mt: 0.5, ml: 0 }}>
          Required
        </FormHelperText>
      )}
      
      {/* Help text, tooltip, documentation */}
      <FieldHelp fieldSchema={fieldSchema} fieldName={fieldName} />
    </Box>
  );
}
