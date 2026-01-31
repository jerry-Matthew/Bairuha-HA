"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Alert,
  CircularProgress,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { IntegrationPicker } from "./IntegrationPicker.client";
import { DeviceConfirm, type DeviceType } from "./DeviceConfirm.client";
import { ConfigureStep } from "./ConfigureStep.client";
import { DeviceDiscovery } from "./DeviceDiscovery.client";
import { OAuthStep } from "./OAuthStep.client";
import { WizardStep } from "./WizardStep.client";
import { WizardSummary } from "./WizardSummary.client";
import { WizardProgress } from "./WizardProgress.client";
import { DynamicStepRenderer } from "./DynamicStepRenderer.client";
import type {
  FlowStep,
  Integration,
  FlowStartResponse,
  FlowStepResponse,
  FlowConfirmResponse,
  DiscoveredDevice,
} from "../server/device.types";
import type { IntegrationConfigSchema } from "../server/integration-config-schemas";

interface AddDeviceFlowProps {
  open: boolean;
  onClose: () => void;
}

export function AddDeviceFlow({ open, onClose }: AddDeviceFlowProps) {
  const [flowId, setFlowId] = useState<string | null>(null);
  const [step, setStep] = useState<FlowStep>("pick_integration");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [configSchema, setConfigSchema] = useState<IntegrationConfigSchema | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deviceData, setDeviceData] = useState<{
    name: string;
    deviceType: DeviceType;
    model?: string;
    manufacturer?: string;
  } | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<DiscoveredDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<string | null>(null);
  const [oauthScopes, setOauthScopes] = useState<string[]>([]);
  const [wizardSteps, setWizardSteps] = useState<Array<{
    stepId: string;
    title: string;
    schema: any;
    data?: Record<string, any>;
    completed?: boolean;
    visible?: boolean;
  }>>([]);
  const [currentWizardStepIndex, setCurrentWizardStepIndex] = useState(0);
  const [showWizardSummary, setShowWizardSummary] = useState(false);
  const [stepResponseData, setStepResponseData] = useState<FlowStepResponse | undefined>();

  const resetState = useCallback(() => {
    setFlowId(null);
    setStep("pick_integration");
    setIntegrations([]);
    setSelectedIntegration(null);
    setConfigSchema(null);
    setValidationErrors({});
    setError(null);
    setSuccess(false);
    setLoading(false);
    setDeviceData(null);
    setDiscoveredDevices([]);
    setDiscovering(false);
    setOauthProvider(null);
    setOauthScopes([]);
    setWizardSteps([]);
    setCurrentWizardStepIndex(0);
    setShowWizardSummary(false);
    setStepResponseData(undefined);
  }, []);

  const startFlow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/device/flows/start", {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = `Failed to start flow (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: FlowStartResponse = await response.json();
      setFlowId(data.flowId);
      setStep(data.step);
      setIntegrations(data.integrations || []);

      // If discovery step, fetch discovered devices
      if (data.step === "discover") {
        await fetchDiscoveredDevices();
      }
    } catch (err: any) {
      console.error("Start flow error:", err);
      setError(err.message || "Failed to start flow. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch discovered devices
  const fetchDiscoveredDevices = useCallback(async () => {
    try {
      setDiscovering(true);
      const response = await fetch("/api/device/discover");
      if (response.ok) {
        const data = await response.json();
        setDiscoveredDevices(data.devices || []);
      }
    } catch (err) {
      console.error("Failed to fetch discovered devices:", err);
      setDiscoveredDevices([]);
    } finally {
      setDiscovering(false);
    }
  }, []);

  // Start flow when dialog opens
  useEffect(() => {
    if (open && !flowId) {
      startFlow();
    } else if (!open) {
      // Reset state when dialog closes
      resetState();
    }
  }, [open, flowId, startFlow, resetState]);

  // Handle OAuth callback completion
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const oauthSuccess = searchParams.get("oauth_success");
    const flowIdParam = searchParams.get("flowId");

    if (oauthSuccess === "true" && flowIdParam && flowId === flowIdParam) {
      // OAuth callback completed, advance flow
      if (flowId) {
        (async () => {
          try {
            setLoading(true);
            const response = await fetch(`/api/device/flows/${flowId}/step`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            });
            if (response.ok) {
              const data: FlowStepResponse = await response.json();
              setStep(data.step);
              if (data.step === "configure" && data.schema) {
                setConfigSchema(data.schema);
              }
              // Clear URL params
              window.history.replaceState({}, "", window.location.pathname);
            }
          } catch (err: any) {
            setError(err.message || "Failed to continue after OAuth");
          } finally {
            setLoading(false);
          }
        })();
      }
    }
  }, [flowId]);

  const handleDiscoveredDeviceSelect = async (device: DiscoveredDevice) => {
    if (!flowId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/device/flows/${flowId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedDeviceId: device.id }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to select device (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: FlowStepResponse = await response.json();
      setStep(data.step);

      // If moving to confirm step, initialize device data from discovered device
      if (data.step === "confirm" && data.data?.selectedDevice) {
        setDeviceData({
          name: data.data.selectedDevice.name || `${device.name} Device`,
          deviceType: "default",
          model: data.data.selectedDevice.model || device.model,
          manufacturer: data.data.selectedDevice.manufacturer || device.manufacturer,
        });
      }
    } catch (err: any) {
      console.error("Discovered device select error:", err);
      setError(err.message || "Failed to select device. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationSelect = async (integration: Integration) => {
    if (!flowId) return;

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/device/flows/${flowId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId: integration.id }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to advance flow (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: FlowStepResponse = await response.json();
      setStepResponseData(data);
      setStep(data.step);
      setSelectedIntegration(integration);

      // Handle wizard step response
      if (typeof data.step === 'string' && data.step.startsWith("wizard_step_")) {
        const stepId = data.step.replace("wizard_step_", "");
        // Initialize wizard steps if not already set
        if (wizardSteps.length === 0 && data.totalSteps) {
          // We'll build the steps list from subsequent responses
          setWizardSteps([{
            stepId,
            title: data.stepTitle || "Configuration Step",
            schema: data.schema || {},
            completed: false,
            visible: true,
          }]);
          setCurrentWizardStepIndex(0);
        }
        // Update current step
        setCurrentWizardStepIndex((data.stepNumber || 1) - 1);
      }

      // If backend returns OAuth step, extract provider and scopes
      if (data.step === "oauth_authorize" && data.oauthProvider) {
        setOauthProvider(data.oauthProvider);
        setOauthScopes(data.oauthScopes || []);
      }

      // If backend returns configure step, store the schema
      if (data.step === "configure" && data.schema) {
        setConfigSchema(data.schema);
        setValidationErrors({});
      }

      // If moving to confirm step, show wizard summary if coming from wizard
      if (data.step === "confirm" && wizardSteps.length > 0) {
        setShowWizardSummary(true);
      } else if (data.step === "confirm") {
        setShowWizardSummary(false);
        setDeviceData({
          name: `${integration.name} Device`,
          deviceType: "default",
        });
      }
    } catch (err: any) {
      console.error("Integration select error:", err);
      setError(err.message || "Failed to advance flow. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = useCallback((data: {
    name: string;
    deviceType: DeviceType;
    model?: string;
    manufacturer?: string;
  }) => {
    setDeviceData(data);
  }, []);

  const handleConfirm = async () => {
    if (!flowId) return;
    if (!deviceData || !deviceData.name.trim()) {
      setError("Please enter a device name");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/device/flows/${flowId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: deviceData.name,
          deviceType: deviceData.deviceType,
          model: deviceData.model,
          manufacturer: deviceData.manufacturer,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to register device (${response.status})`;
        let isDuplicate = false;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          isDuplicate = errorData.isDuplicate || false;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }

        // Special handling for duplicate errors
        if (response.status === 409 || isDuplicate) {
          errorMessage = errorMessage || "This device has already been added to your system.";
        }

        throw new Error(errorMessage);
      }

      const data: FlowConfirmResponse = await response.json();
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Confirm flow error:", err);
      setError(err.message || "Failed to register device. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSubmit = async (configData: Record<string, any>) => {
    if (!flowId) return;

    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});

      const response = await fetch(`/api/device/flows/${flowId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configData }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          // If response is not JSON, create a basic error object
          errorData = { error: response.statusText || `Failed to submit configuration (${response.status})` };
        }

        // Check for validation errors (400 status with validationErrors)
        if (response.status === 400 && errorData.validationErrors) {
          setValidationErrors(errorData.validationErrors);
          setError(errorData.error || "Configuration validation failed");
          return; // Stay on configure step
        }

        throw new Error(errorData.error || "Failed to submit configuration");
      }

      const data: FlowStepResponse = await response.json();
      setStep(data.step);
      setValidationErrors({});

      // Handle wizard step progression
      if (typeof data.step === 'string' && data.step.startsWith("wizard_step_")) {
        const stepId = data.step.replace("wizard_step_", "");

        // Update wizard steps with completed step data
        setWizardSteps(prev => {
          const updated = [...prev];
          const stepIndex = updated.findIndex(s => s.stepId === stepId);
          if (stepIndex >= 0) {
            updated[stepIndex] = {
              ...updated[stepIndex],
              data: configData,
              completed: true,
            };
          } else {
            // New step, add it
            updated.push({
              stepId,
              title: data.stepTitle || "Configuration Step",
              schema: data.schema || {},
              data: configData,
              completed: true,
              visible: true,
            });
          }
          return updated;
        });

        // Update current step index
        if (data.stepNumber) {
          setCurrentWizardStepIndex(data.stepNumber - 1);
        }

        // If this is the last step, show summary
        if (data.isLastStep) {
          // Next response will be confirm, show summary
          setShowWizardSummary(true);
        }
      }

      // If we're moving to confirm, clear schema and initialize device data
      if (data.step === "confirm") {
        setConfigSchema(null);
        if (wizardSteps.length === 0 && selectedIntegration && !deviceData) {
          setDeviceData({
            name: `${selectedIntegration.name} Device`,
            deviceType: "default",
          });
        }
      }
    } catch (err: any) {
      console.error("Config submit error:", err);
      setError(err.message || "Failed to submit configuration. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleWizardStepSubmit = async (stepData: Record<string, any>) => {
    if (!flowId) return;

    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});

      const response = await fetch(`/api/device/flows/${flowId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepData }),
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: response.statusText || `Failed to submit step (${response.status})` };
        }

        if (response.status === 400 && errorData.validationErrors) {
          setValidationErrors(errorData.validationErrors);
          setError(errorData.error || "Step validation failed");
          return;
        }

        throw new Error(errorData.error || "Failed to submit step");
      }

      const data: FlowStepResponse = await response.json();
      setStepResponseData(data);

      // Handle wizard step progression
      if (typeof data.step === 'string' && data.step.startsWith("wizard_step_")) {
        const stepId = data.step.replace("wizard_step_", "");
        const currentStepId = (typeof step === 'string' && step.startsWith("wizard_step_"))
          ? step.replace("wizard_step_", "")
          : null;

        // Update current step as completed
        if (currentStepId) {
          setWizardSteps(prev => {
            const updated = [...prev];
            const stepIndex = updated.findIndex(s => s.stepId === currentStepId);
            if (stepIndex >= 0) {
              updated[stepIndex] = {
                ...updated[stepIndex],
                data: stepData,
                completed: true,
              };
            }
            return updated;
          });
        }

        // Update step with new step data
        setStep(data.step);

        // Update or add next step
        setWizardSteps(prev => {
          const updated = [...prev];
          const stepIndex = updated.findIndex(s => s.stepId === stepId);
          if (stepIndex >= 0) {
            updated[stepIndex] = {
              ...updated[stepIndex],
              title: data.stepTitle || updated[stepIndex].title,
              schema: data.schema || updated[stepIndex].schema,
              visible: true,
            };
          } else {
            updated.push({
              stepId,
              title: data.stepTitle || "Configuration Step",
              schema: data.schema || {},
              visible: true,
            });
          }
          return updated;
        });

        if (data.stepNumber) {
          setCurrentWizardStepIndex(data.stepNumber - 1);
        }

        setValidationErrors({});

        // If last step, prepare for summary
        if (data.isLastStep) {
          // Store the step data before moving to summary
          setWizardSteps(prev => {
            const updated = [...prev];
            const stepIndex = updated.findIndex(s => s.stepId === stepId);
            if (stepIndex >= 0) {
              updated[stepIndex] = {
                ...updated[stepIndex],
                data: stepData,
                completed: true,
              };
            }
            return updated;
          });
        }
      } else if (data.step === "confirm") {
        // Moving to confirm, show summary
        setShowWizardSummary(true);
        setStep("confirm");
      }
    } catch (err: any) {
      console.error("Wizard step submit error:", err);
      setError(err.message || "Failed to submit step. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleWizardStepBack = async () => {
    if (currentWizardStepIndex > 0) {
      // Navigate to previous step
      const prevStep = wizardSteps[currentWizardStepIndex - 1];
      if (prevStep) {
        setCurrentWizardStepIndex(currentWizardStepIndex - 1);
        setStep(`wizard_step_${prevStep.stepId}` as FlowStep);
        // The backend should handle the step navigation when we submit
      }
    } else {
      // Go back to pick_integration
      setStep("pick_integration");
      setSelectedIntegration(null);
      setWizardSteps([]);
      setCurrentWizardStepIndex(0);
      setShowWizardSummary(false);
    }
    setError(null);
  };

  const handleWizardSummaryEditStep = (stepId: string) => {
    const stepIndex = wizardSteps.findIndex(s => s.stepId === stepId);
    if (stepIndex >= 0) {
      setCurrentWizardStepIndex(stepIndex);
      setStep(`wizard_step_${stepId}` as FlowStep);
      setShowWizardSummary(false);
    }
  };

  const handleWizardSummaryBack = () => {
    if (wizardSteps.length > 0) {
      // Go back to last wizard step
      const lastStep = wizardSteps[wizardSteps.length - 1];
      if (lastStep) {
        setCurrentWizardStepIndex(wizardSteps.length - 1);
        setStep(`wizard_step_${lastStep.stepId}` as FlowStep);
        setShowWizardSummary(false);
      }
    }
  };

  const handleStandardStepComplete = async (stepData: Record<string, any>) => {
    if (!flowId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/device/flows/${flowId}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepData }),
      });

      if (!response.ok) {
        let errorMessage = `Failed to advance flow (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data: FlowStepResponse = await response.json();
      setStep(data.step);
      setStepResponseData(data);

      // Handle wizard step response
      if (typeof data.step === 'string' && data.step.startsWith("wizard_step_")) {
        const stepId = data.step.replace("wizard_step_", "");
        if (wizardSteps.length === 0 && data.totalSteps) {
          setWizardSteps([{
            stepId,
            title: data.stepTitle || "Configuration Step",
            schema: data.schema || {},
            completed: false,
            visible: true,
          }]);
          setCurrentWizardStepIndex(0);
        }
        setCurrentWizardStepIndex((data.stepNumber || 1) - 1);
      }

      // If backend returns OAuth step, extract provider and scopes
      if (data.step === "oauth_authorize" && data.oauthProvider) {
        setOauthProvider(data.oauthProvider);
        setOauthScopes(data.oauthScopes || []);
      }

      // If backend returns configure step, store the schema
      if (data.step === "configure" && data.schema) {
        setConfigSchema(data.schema);
        setValidationErrors({});
      }

      // If moving to confirm step, show wizard summary if coming from wizard
      if (data.step === "confirm" && wizardSteps.length > 0) {
        setShowWizardSummary(true);
      } else if (data.step === "confirm") {
        setShowWizardSummary(false);
        if (selectedIntegration) {
          setDeviceData({
            name: `${selectedIntegration.name} Device`,
            deviceType: "default",
          });
        }
      }
    } catch (err: any) {
      console.error("Step complete error:", err);
      setError(err.message || "Failed to complete step. Please check the console for details.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === "configure") {
      setStep("pick_integration");
      setSelectedIntegration(null);
      setConfigSchema(null);
      setValidationErrors({});
    } else if (step === "confirm") {
      // If we came from configure, go back to configure
      // If we came from discover, go back to discover
      // Otherwise go back to pick_integration
      if (configSchema) {
        setStep("configure");
      } else if (discoveredDevices.length > 0) {
        setStep("discover");
      } else {
        setStep("pick_integration");
        setSelectedIntegration(null);
      }
    } else if (step === "discover") {
      // From discover, can go to pick_integration
      setStep("pick_integration");
    }
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <IconButton
          edge="start"
          color="inherit"
          onClick={onClose}
          aria-label="close"
          sx={{ mr: 1 }}
        >
          <CloseIcon />
        </IconButton>
        {step === "pick_integration" ? "Select brand" : "Add Device"}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Device registered successfully!
          </Alert>
        )}

        {step === "pick_integration" && (
          <IntegrationPicker
            integrations={integrations}
            onSelect={handleIntegrationSelect}
            loading={loading}
          />
        )}

        {/* Wizard summary - special case, keep existing implementation */}
        {step === "confirm" && showWizardSummary && wizardSteps.length > 0 && (
          <>
            <WizardProgress
              steps={wizardSteps.map(s => ({
                stepId: s.stepId,
                title: s.title,
                completed: true,
                visible: s.visible !== false,
              }))}
              currentStepIndex={wizardSteps.length}
            />
            <WizardSummary
              steps={wizardSteps.map(s => ({
                stepId: s.stepId,
                title: s.title,
                data: s.data || {},
              }))}
              onConfirm={handleConfirm}
              onEditStep={handleWizardSummaryEditStep}
              onBack={handleWizardSummaryBack}
              onCancel={onClose}
              loading={loading}
            />
          </>
        )}

        {/* Dynamic step rendering - for all other steps */}
        {flowId &&
          step !== "pick_integration" &&
          !(step === "confirm" && showWizardSummary) && (
            <DynamicStepRenderer
              flowId={flowId}
              stepId={typeof step === 'string' ? step : String(step)}
              onStepComplete={async (stepData: Record<string, any>) => {
                // Handle different step types
                if (step === "configure") {
                  await handleConfigSubmit(stepData);
                } else if (typeof step === 'string' && step.startsWith("wizard_step_")) {
                  await handleWizardStepSubmit(stepData);
                } else if (step === "confirm") {
                  // Confirm step completion is handled by handleConfirm
                  // This is just for consistency
                } else {
                  // For other steps (discover, oauth), use standard step advancement
                  await handleStandardStepComplete(stepData);
                }
              }}
              onStepBack={handleBack}
              onFlowCancel={onClose}
              flowData={{
                ...deviceData,
                ...(stepResponseData?.data || {}),
                stepTitle: stepResponseData?.stepTitle,
                stepDescription: stepResponseData?.stepDescription,
                integrationName: selectedIntegration?.name,
                integrationDomain: selectedIntegration?.domain,
                flowId,
              }}
            />
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {step !== "pick_integration" &&
          step !== "discover" &&
          step !== "oauth_authorize" &&
          !(typeof step === 'string' && step.startsWith("wizard_step_")) &&
          !(step === "confirm" && showWizardSummary) && (
            <Button onClick={handleBack} disabled={loading || success}>
              Back
            </Button>
          )}
        {step === "discover" && (
          <Button
            variant="outlined"
            onClick={() => {
              setStep("pick_integration");
              startFlow(); // Refresh integrations
            }}
            disabled={loading}
          >
            Add Manually
          </Button>
        )}
        {step === "confirm" && !showWizardSummary && (
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading || success}
          >
            {loading ? "Registering..." : "Register Device"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

