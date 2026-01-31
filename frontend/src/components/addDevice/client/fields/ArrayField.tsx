/**
 * Array Field Component
 * 
 * Renders array fields with add/remove functionality
 */

import React from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { FieldWrapper } from "./FieldWrapper";
import { renderField } from "../fieldRenderer";
import type { ConfigFieldSchema } from "../../server/integration-config-schemas";

interface ArrayFieldProps {
  fieldName: string;
  fieldSchema: ConfigFieldSchema;
  value: any[];
  onChange: (value: any[]) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  formValues: Record<string, any>;
  validationErrors?: Record<string, string>;
  integrationId: string;
  configEntryId?: string;
}

export function ArrayField({
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
}: ArrayFieldProps) {
  const label = fieldSchema.label || fieldSchema.description || fieldName;
  const itemsSchema = fieldSchema.items;
  
  if (!itemsSchema) {
    return (
      <Box>
        <Typography variant="body2" color="error">
          Array field {fieldName} missing items schema
        </Typography>
      </Box>
    );
  }
  
  const arrayValue = Array.isArray(value) ? value : [];
  
  const handleItemChange = (index: number, itemValue: any) => {
    const newArray = [...arrayValue];
    newArray[index] = itemValue;
    onChange(newArray);
  };
  
  const handleAddItem = () => {
    // Create default value based on item schema
    let defaultValue: any;
    if (itemsSchema.default !== undefined) {
      defaultValue = itemsSchema.default;
    } else if (itemsSchema.type === "boolean") {
      defaultValue = false;
    } else if (itemsSchema.type === "object" && itemsSchema.properties) {
      defaultValue = {};
    } else if (itemsSchema.type === "array") {
      defaultValue = [];
    } else {
      defaultValue = "";
    }
    
    onChange([...arrayValue, defaultValue]);
  };
  
  const handleRemoveItem = (index: number) => {
    const newArray = arrayValue.filter((_, i) => i !== index);
    onChange(newArray);
  };
  
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="body2" fontWeight="medium">
          {label}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleAddItem}
          disabled={disabled}
          size="small"
          variant="outlined"
        >
          Add Item
        </Button>
      </Box>
      
      {arrayValue.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            textAlign: "center",
            backgroundColor: "background.default",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No items yet. Click "Add Item" to add one.
          </Typography>
        </Paper>
      ) : (
        arrayValue.map((item, index) => {
          const itemFieldName = `${fieldName}[${index}]`;
          const itemError = validationErrors[itemFieldName];
          
          return (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: "background.default",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Item {index + 1}
                </Typography>
                <IconButton
                  onClick={() => handleRemoveItem(index)}
                  disabled={disabled}
                  color="error"
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              
              <FieldWrapper
                fieldName={itemFieldName}
                fieldSchema={itemsSchema}
                formValues={formValues}
                errorMessage={itemError}
              >
                {renderField(
                  itemFieldName,
                  itemsSchema,
                  item,
                  (newValue) => handleItemChange(index, newValue),
                  !!itemError,
                  undefined,
                  disabled,
                  formValues,
                  validationErrors,
                  integrationId,
                  configEntryId
                )}
              </FieldWrapper>
            </Paper>
          );
        })
      )}
    </Box>
  );
}
