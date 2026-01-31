/**
 * Object Field Component
 * 
 * Renders nested object fields recursively
 */

import React from "react";
import {
  Box,
  Typography,
  Paper,
  Collapse,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { FieldWrapper } from "./FieldWrapper";
import { renderField } from "../fieldRenderer";
import type { ConfigFieldSchema } from "../../server/integration-config-schemas";

interface ObjectFieldProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  formValues: Record<string, any>;
  validationErrors?: Record<string, string>;
  integrationId: string;
  configEntryId?: string;
}

export function ObjectField({
  fieldName,
  fieldSchema,
  value,
  onChange,
  error,
  helperText,
  disabled,
  formValues,
  validationErrors = {},
  integrationId,
  configEntryId,
}: ObjectFieldProps) {
  const [expanded, setExpanded] = React.useState(true);
  
  const label = fieldSchema.label || fieldSchema.description || fieldName;
  const properties = fieldSchema.properties || {};
  
  const handleFieldChange = (propName: string, propValue: any) => {
    onChange({
      ...value,
      [propName]: propValue,
    });
  };
  
  return (
    <Box sx={{ mb: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          backgroundColor: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: expanded ? 2 : 0,
            cursor: "pointer",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Typography variant="subtitle2" fontWeight="medium">
            {label}
          </Typography>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
        
        <Collapse in={expanded}>
          {Object.entries(properties).map(([propName, propSchema]) => {
            const fullFieldName = `${fieldName}.${propName}`;
            const propValue = value?.[propName];
            const propError = validationErrors[fullFieldName];
            
            return (
              <FieldWrapper
                key={propName}
                fieldName={fullFieldName}
                fieldSchema={propSchema}
                formValues={{ ...formValues, ...value }}
                errorMessage={propError}
              >
                {renderField(
                  fullFieldName,
                  propSchema,
                  propValue,
                  (newValue) => handleFieldChange(propName, newValue),
                  !!propError,
                  undefined,
                  disabled,
                  { ...formValues, ...value },
                  validationErrors,
                  integrationId,
                  configEntryId
                )}
              </FieldWrapper>
            );
          })}
        </Collapse>
      </Paper>
    </Box>
  );
}
