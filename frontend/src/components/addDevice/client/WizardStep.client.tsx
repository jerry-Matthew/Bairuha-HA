"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import type { IntegrationConfigSchema } from "../server/integration-config-schemas";
import { getVisibleFields } from "@/lib/config-flow/conditional-field-engine";
import { FieldWrapper } from "./fields/FieldWrapper";
import { renderField } from "./fieldRenderer";

interface WizardStepProps {
  stepId: string;
  stepTitle: string;
  stepDescription?: string;
  stepNumber: number;
  totalSteps: number;
  schema: IntegrationConfigSchema;
  initialData?: Record<string, any>;
  onSubmit: (stepData: Record<string, any>) => Promise<void>;
  onBack?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  validationErrors?: Record<string, string>;
  canGoBack?: boolean;
  isLastStep?: boolean;
  integrationId?: string;
  configEntryId?: string;
}

/**
 * Wizard Step Component
 * 
 * Renders a single wizard step with form fields based on schema.
 * Supports navigation (back/next), validation, and conditional field rendering.
 */
export function WizardStep({
  stepId,
  stepTitle,
  stepDescription,
  stepNumber,
  totalSteps,
  schema,
  initialData = {},
  onSubmit,
  onBack,
  onCancel,
  loading = false,
  validationErrors = {},
  canGoBack = true,
  isLastStep = false,
  integrationId = "",
  configEntryId,
}: WizardStepProps) {
  // Initialize form state with initial data or defaults from schema
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = { ...initialData };
    Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
      if (initial[fieldName] === undefined) {
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
      }
    });
    return initial;
  });

  // Update form data when schema or initialData changes
  useEffect(() => {
    setFormData((prev) => {
      const updated = { ...prev, ...initialData };
      Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
        if (updated[fieldName] === undefined) {
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
  }, [schema, initialData]);

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

  // Sort fields by order if defined
  const sortedFields = visibleFields.sort((a, b) => {
    const orderA = schema[a].order ?? 999;
    const orderB = schema[b].order ?? 999;
    return orderA - orderB;
  });

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {stepTitle}
          </Typography>
          {stepDescription && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {stepDescription}
            </Typography>
          )}
          {/* Hiding step counter to match HA aesthetics
          <Typography variant="caption" color="text.secondary">
            Step {stepNumber} of {totalSteps}
          </Typography>
          */}
        </Box>

        {Object.keys(validationErrors).length > 0 && validationErrors._general && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {validationErrors._general}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {sortedFields.map((fieldName) => {
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

          <Box sx={{ mt: 4, display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Box>
              {canGoBack && onBack && (
                <Button
                  onClick={onBack}
                  disabled={loading}
                  startIcon={<ArrowBackIcon />}
                >
                  Back
                </Button>
              )}
              {onCancel && (
                <Button
                  onClick={onCancel}
                  disabled={loading}
                  sx={{ ml: 1 }}
                >
                  Cancel
                </Button>
              )}
            </Box>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading
                ? "Saving..."
                : "Submit"}
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
}
