"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PanelHeader } from "@/components/ui/panel-header";
import { MOCK_ENERGY_DATA } from "@/lib/mock-data";

const STEPS = ["Configuration", "Data Sources", "Analytics Setup"] as const;

export function EnergyPanel() {
  const [activeStep, setActiveStep] = useState(0);

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Box>
      <PanelHeader
        title="Energy"
        description="Energy usage configuration and analytics"
      />

      <Paper sx={{ p: 3, mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mb: 3 }}>
          {activeStep === 0 && (
            <Typography>
              Configure your energy monitoring setup. Select your energy sources
              and meters.
            </Typography>
          )}
          {activeStep === 1 && (
            <Typography>
              Add data sources for energy consumption and production tracking.
            </Typography>
          )}
          {activeStep === 2 && (
            <Box>
              <Typography 
                variant="h6" 
                gutterBottom
                sx={{ color: "primary.main" }}
              >
                Energy Analytics
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={MOCK_ENERGY_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="consumption"
                    stroke="#f44336"
                    name="Consumption (W)"
                  />
                  <Line
                    type="monotone"
                    dataKey="production"
                    stroke="#4caf50"
                    name="Production (W)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === STEPS.length - 1}
          >
            Next
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

