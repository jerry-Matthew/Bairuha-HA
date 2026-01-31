"use client";

import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { routeToStepComponent } from "@/lib/config-flow/step-component-router";
import type { StepComponentInfo } from "@/lib/config-flow/step-resolver";
import type { ComponentType } from "react";

/**
 * Props for DynamicStepRenderer
 */
export interface DynamicStepRendererProps {
  flowId: string;
  stepId: string;
  onStepComplete: (stepData: Record<string, any>) => Promise<void>;
  onStepBack?: () => void;
  onFlowCancel?: () => void;
  flowData?: Record<string, any>;
  componentInfo?: StepComponentInfo; // Optional: pre-loaded component info
}

/**
 * Dynamic Step Renderer Component
 * 
 * Dynamically renders the appropriate step component based on flow definition.
 * Loads step component information from the API and dynamically imports the component.
 */
export function DynamicStepRenderer({
  flowId,
  stepId,
  onStepComplete,
  onStepBack,
  onFlowCancel,
  flowData,
  componentInfo: preloadedComponentInfo,
}: DynamicStepRendererProps) {
  const [componentInfo, setComponentInfo] = useState<StepComponentInfo | null>(
    preloadedComponentInfo || null
  );
  const [StepComponent, setStepComponent] = useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStepComponent() {
      try {
        setLoading(true);
        setError(null);

        // Load component info from API if not preloaded
        let info = preloadedComponentInfo;
        if (!info) {
          const response = await fetch(`/api/device/flows/${flowId}/step/${stepId}`);
          if (!response.ok) {
            throw new Error(`Failed to load step info: ${response.statusText}`);
          }
          info = await response.json();
          setComponentInfo(info);
        }

        // Load component dynamically
        const Component = await routeToStepComponent(info!);
        setStepComponent(() => Component);

        setLoading(false);
      } catch (err: any) {
        console.error("[DynamicStepRenderer] Error loading step component:", err);
        setError(err.message || "Failed to load step component");
        setLoading(false);
      }
    }

    loadStepComponent();
  }, [flowId, stepId, preloadedComponentInfo]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  if (!StepComponent || !componentInfo) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">Step component not found</Typography>
      </Alert>
    );
  }

  // Map step metadata and props to component props
  // Different component types need different props, so we need to adapt
  const componentProps = adaptPropsForComponent(
    componentInfo,
    {
      onStepComplete,
      onStepBack,
      onFlowCancel,
      flowData,
    }
  );

  return <StepComponent {...componentProps} />;
}

/**
 * Adapt props for different component types
 * Each component type has different prop requirements
 */
function adaptPropsForComponent(
  componentInfo: StepComponentInfo,
  handlers: {
    onStepComplete: (stepData: Record<string, any>) => Promise<void>;
    onStepBack?: () => void;
    onFlowCancel?: () => void;
    flowData?: Record<string, any>;
  }
): Record<string, any> {
  const { stepDefinition, stepMetadata, props: componentProps } = componentInfo;

  // Base props that all components might use
  const baseProps: Record<string, any> = {
    ...componentProps,
    ...handlers,
  };

  switch (componentInfo.componentType) {
    case 'manual':
    case 'wizard':
      // ConfigureStep and WizardStep use similar props
      return {
        ...baseProps,
        schema: stepDefinition.schema?.properties || {},
        initialData: handlers.flowData?.[stepMetadata.stepId] || {},
        loading: false, // Could be passed from parent
        validationErrors: {}, // Could be passed from parent
        onSubmit: handlers.onStepComplete,
        // Pass title and description if available
        title: handlers.flowData?.stepTitle || stepMetadata.title,
        description: handlers.flowData?.stepDescription || stepMetadata.description,
        // Wizard-specific props
        ...(componentInfo.componentType === 'wizard' ? {
          stepId: stepMetadata.stepId,
          stepTitle: handlers.flowData?.stepTitle || stepMetadata.title,
          stepDescription: handlers.flowData?.stepDescription || stepMetadata.description,
          stepNumber: stepMetadata.stepNumber || 1,
          totalSteps: stepMetadata.totalSteps || 1,
          canGoBack: stepMetadata.canGoBack,
          isLastStep: stepMetadata.isLastStep,
        } : {}),
      };

    case 'discovery':
      // DeviceDiscovery component props
      return {
        ...baseProps,
        // Discovery props would come from step definition or API
        devices: [], // Would be loaded separately
        onSelect: async (device: any) => {
          await handlers.onStepComplete({ selectedDevice: device });
        },
        onRefresh: async () => {
          // Refresh discovery would be handled by parent
        },
        loading: false,
        refreshing: false,
      };

    case 'oauth':
      // OAuthStep component props
      return {
        ...baseProps,
        flowId: handlers.flowData?.flowId, // Extract from flowData or pass separately
        integrationDomain: handlers.flowData?.integrationDomain,
        providerId: stepDefinition.schema?.properties?.provider?.default || '',
        scopes: stepDefinition.schema?.properties?.scopes?.default || [],
        onComplete: async () => {
          await handlers.onStepComplete({ oauthComplete: true });
        },
        onCancel: handlers.onFlowCancel,
      };

    case 'confirm':
      // DeviceConfirm component props
      return {
        ...baseProps,
        device: {
          id: '',
          name: handlers.flowData?.deviceName || '',
          model: handlers.flowData?.model,
          manufacturer: handlers.flowData?.manufacturer,
        },
        integrationName: handlers.flowData?.integrationName || '',
        onDeviceChange: (device: any) => {
          handlers.onStepComplete({ device });
        },
      };

    default:
      return baseProps;
  }
}
