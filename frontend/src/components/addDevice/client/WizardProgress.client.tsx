"use client";

import React from "react";
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepButton,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

interface WizardProgressProps {
  steps: Array<{
    stepId: string;
    title: string;
    completed: boolean;
    visible: boolean;
  }>;
  currentStepIndex: number;
  onStepClick?: (stepIndex: number) => void;
}

/**
 * Wizard Progress Component
 * 
 * Displays progress indicator for multi-step wizard flows.
 * Shows step titles, completion status, and allows navigation to completed steps.
 */
export function WizardProgress({
  steps,
  currentStepIndex,
  onStepClick,
}: WizardProgressProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  
  // Filter to only visible steps for display
  const visibleSteps = steps.filter(step => step.visible);
  
  return (
    <Box sx={{ width: "100%", mb: 4 }}>
      <Stepper
        activeStep={currentStepIndex}
        orientation={isMobile ? "vertical" : "horizontal"}
        sx={{
          "& .MuiStepLabel-root": {
            cursor: onStepClick ? "pointer" : "default",
          },
        }}
      >
        {visibleSteps.map((step, index) => (
          <Step
            key={step.stepId}
            completed={step.completed}
            active={index === currentStepIndex}
          >
            {onStepClick && step.completed ? (
              <StepButton onClick={() => onStepClick(index)}>
                <StepLabel
                  optional={
                    index < visibleSteps.length - 1 ? (
                      <Typography variant="caption">
                        Step {index + 1} of {visibleSteps.length}
                      </Typography>
                    ) : null
                  }
                >
                  {step.title}
                </StepLabel>
              </StepButton>
            ) : (
              <StepLabel
                optional={
                  index < visibleSteps.length - 1 ? (
                    <Typography variant="caption">
                      Step {index + 1} of {visibleSteps.length}
                    </Typography>
                  ) : null
                }
                StepIconComponent={({ active, completed }) => {
                  if (completed) {
                    return (
                      <CheckCircleIcon
                        sx={{ color: theme.palette.success.main }}
                      />
                    );
                  }
                  if (active) {
                    return (
                      <RadioButtonUncheckedIcon
                        sx={{ color: theme.palette.primary.main }}
                      />
                    );
                  }
                  return (
                    <RadioButtonUncheckedIcon
                      sx={{ color: theme.palette.action.disabled }}
                    />
                  );
                }}
              >
                {step.title}
              </StepLabel>
            )}
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
