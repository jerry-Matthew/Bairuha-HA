"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import type { IntegrationConfigSchema } from "../server/integration-config-schemas";
import { getVisibleFields } from "@/lib/config-flow/conditional-field-engine";
import { FieldWrapper } from "./fields/FieldWrapper";
import { renderField } from "./fieldRenderer";

interface ConfigureStepProps {
  schema: IntegrationConfigSchema;
  onSubmit: (configData: Record<string, any>) => Promise<void>;
  loading?: boolean;
  validationErrors?: Record<string, string>;
  integrationId?: string;
  configEntryId?: string;
  title?: string;
  description?: string;
}

/**
 * Configure Step Component
 * 
 * Dynamically renders a configuration form from a backend-provided schema.
 * Supports all field types: string, password, number, boolean, select, multiselect, file, object, array.
 * Supports conditional fields, dynamic options, and nested structures.
 */
export function ConfigureStep({
  schema,
  onSubmit,
  loading = false,
  validationErrors = {},
  integrationId = "",
  configEntryId,
  title,
  description,
}: ConfigureStepProps) {
  // Initialize form state with default values from schema
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.default !== undefined) {
        initial[fieldName] = fieldSchema.default;
      } else if (fieldSchema.type === "boolean") {
        initial[fieldName] = false;
      } else if (fieldSchema.type === "object") {
        initial[fieldName] = {};
      } else if (fieldSchema.type === "array") {
        initial[fieldName] = [];
      } else {
        initial[fieldName] = "";
      }
    });
    return initial;
  });

  // Update form data when schema changes (preserve user input)
  useEffect(() => {
    setFormData((prev) => {
      const updated = { ...prev };
      Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
        // Only set default if field is not already set (preserve user input)
        if (updated[fieldName] === undefined || updated[fieldName] === "") {
          if (fieldSchema.default !== undefined) {
            updated[fieldName] = fieldSchema.default;
          } else if (fieldSchema.type === "boolean") {
            updated[fieldName] = false;
          } else if (fieldSchema.type === "object") {
            updated[fieldName] = {};
          } else if (fieldSchema.type === "array") {
            updated[fieldName] = [];
          } else {
            updated[fieldName] = "";
          }
        }
      });
      return updated;
    });
  }, [schema]);

  const handleChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  // Get visible fields based on conditional logic
  const visibleFields = getVisibleFields(schema, formData);

  // Group fields by group/section if defined
  const fieldsByGroup = new Map<string, string[]>();
  const fieldsBySection = new Map<string, string[]>();
  const ungroupedFields: string[] = [];

  visibleFields.forEach(fieldName => {
    const fieldSchema = schema[fieldName];
    if (fieldSchema.group) {
      if (!fieldsByGroup.has(fieldSchema.group)) {
        fieldsByGroup.set(fieldSchema.group, []);
      }
      fieldsByGroup.get(fieldSchema.group)!.push(fieldName);
    } else if (fieldSchema.section) {
      if (!fieldsBySection.has(fieldSchema.section)) {
        fieldsBySection.set(fieldSchema.section, []);
      }
      fieldsBySection.get(fieldSchema.section)!.push(fieldName);
    } else {
      ungroupedFields.push(fieldName);
    }
  });

  // Sort fields by order if defined
  const sortFields = (fields: string[]) => {
    return fields.sort((a, b) => {
      const orderA = schema[a].order ?? 999;
      const orderB = schema[b].order ?? 999;
      return orderA - orderB;
    });
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title || "Configure Integration"}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please provide the required configuration information for this integration.
        </Typography>
      )}

      {Object.keys(validationErrors).length > 0 && validationErrors._general && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationErrors._general}
        </Alert>
      )}

      {/* --- MENU MODE DETECTION (Task: Improve Adax UX) --- */}
      {/* If the schema consists of exactly one field, and that field is a 'select' type (and not dynamic),
          render it as a list of large clickable buttons (Menu Style) instead of a form. */}
      {(() => {
        const visibleFieldNames = sortFields(ungroupedFields); // Assuming menus don't use groups/sections usually
        if (
          visibleFieldNames.length === 1 &&
          fieldsByGroup.size === 0 &&
          fieldsBySection.size === 0
        ) {
          const fieldName = visibleFieldNames[0];
          const fieldSchema = schema[fieldName];

          // Check if it is a static select field
          if (fieldSchema.type === "select" && fieldSchema.options && fieldSchema.options.length > 0 && !fieldSchema.dynamicOptions) {
            return (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {fieldSchema.options.map((opt: any) => {
                  const label = typeof opt === 'string' ? opt : (opt.label || opt.value);
                  const value = typeof opt === 'string' ? opt : opt.value;
                  const isSelected = formData[fieldName] === value;

                  return (
                    <Button
                      key={String(value)}
                      variant={isSelected ? "contained" : "outlined"}
                      size="large"
                      onClick={() => {
                        // Set data and submit immediately
                        const newData = { ...formData, [fieldName]: value };
                        // Update state for visual feedback (optional)
                        handleChange(fieldName, value);
                        // Submit
                        onSubmit(newData);
                      }}
                      sx={{
                        justifyContent: "flex-start",
                        textAlign: "left",
                        py: 2,
                        px: 3,
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: 'primary.main',
                          bgcolor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {label}
                        </Typography>
                        {/* We could add description here if options had them */}
                      </Box>
                    </Button>
                  );
                })}
              </Box>
            );
          }
        }
        return null;
      })()
        ||
        /* Fallback to Standard Form if not Menu Mode */
        <form onSubmit={handleSubmit}>
          {/* Render fields grouped by group */}
          {Array.from(fieldsByGroup.entries()).map(([groupName, fields]) => (
            <Box key={groupName} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "medium" }}>
                {groupName}
              </Typography>
              {sortFields(fields).map((fieldName) => {
                const fieldSchema = schema[fieldName];
                const error = validationErrors[fieldName];

                return (
                  <FieldWrapper
                    key={fieldName}
                    fieldName={fieldName}
                    fieldSchema={fieldSchema}
                    formValues={formData}
                    errorMessage={error}
                  >
                    {renderField(
                      fieldName,
                      fieldSchema,
                      formData[fieldName],
                      (value) => handleChange(fieldName, value),
                      !!error,
                      undefined,
                      loading,
                      formData,
                      validationErrors,
                      integrationId,
                      configEntryId
                    )}
                  </FieldWrapper>
                );
              })}
            </Box>
          ))}

          {/* Render fields grouped by section */}
          {Array.from(fieldsBySection.entries()).map(([sectionName, fields]) => (
            <Box key={sectionName} sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2, color: "text.secondary" }}>
                {sectionName}
              </Typography>
              {sortFields(fields).map((fieldName) => {
                const fieldSchema = schema[fieldName];
                const error = validationErrors[fieldName];

                return (
                  <FieldWrapper
                    key={fieldName}
                    fieldName={fieldName}
                    fieldSchema={fieldSchema}
                    formValues={formData}
                    errorMessage={error}
                  >
                    {renderField(
                      fieldName,
                      fieldSchema,
                      formData[fieldName],
                      (value) => handleChange(fieldName, value),
                      !!error,
                      undefined,
                      loading,
                      formData,
                      validationErrors,
                      integrationId,
                      configEntryId
                    )}
                  </FieldWrapper>
                );
              })}
            </Box>
          ))}

          {/* Render ungrouped fields */}
          {sortFields(ungroupedFields).map((fieldName) => {
            const fieldSchema = schema[fieldName];
            const error = validationErrors[fieldName];

            return (
              <FieldWrapper
                key={fieldName}
                fieldName={fieldName}
                fieldSchema={fieldSchema}
                formValues={formData}
                errorMessage={error}
              >
                {renderField(
                  fieldName,
                  fieldSchema,
                  formData[fieldName],
                  (value) => handleChange(fieldName, value),
                  !!error,
                  undefined,
                  loading,
                  formData,
                  validationErrors,
                  integrationId,
                  configEntryId
                )}
              </FieldWrapper>
            );
          })}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </Box>
        </form>}
    </Box>
  );
}
