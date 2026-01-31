/**
 * Home Assistant Config Flow Service
 * 
 * Manages the Home Assistant integration setup flow
 * Flow steps: enter_connection -> validate_connection -> confirm
 * 
 * This service handles:
 * - Connection data collection (base_url, access_token)
 * - Connection validation (calls HA /api/config)
 * - Config entry creation and integration registration
 */

import { createFlow, getFlowById, updateFlow, deleteFlow } from "@/components/addDevice/server/config-flow.registry";
import { createConfigEntry } from "@/components/globalAdd/server/config-entry.registry";
import { saveIntegration } from "@/components/globalAdd/server/integration.registry";
import { validateHAConnection } from "@/lib/home-assistant/connection-validator";
import type { FlowStep } from "@/components/addDevice/server/device.types";

export type HAFlowStep = "enter_connection" | "validate_connection" | "confirm";

export interface HAConfigFlow {
  flowId: string;
  step: HAFlowStep;
  data: {
    baseUrl?: string;
    accessToken?: string;
    validationError?: string;
    haConfig?: any;
  };
}

export interface StartHAFlowResponse {
  flowId: string;
  step: HAFlowStep;
}

export interface HAFlowStepResponse {
  step: HAFlowStep;
  error?: string;
  validationError?: string;
  haConfig?: any;
}

export interface HAFlowConfirmResponse {
  success: boolean;
  configEntryId: string;
  integrationStatus: "connected" | "error";
}

/**
 * Start a new Home Assistant config flow
 */
export async function startHAFlow(userId?: string): Promise<StartHAFlowResponse> {
  const flow = await createFlow({
    userId: userId || null,
    integrationDomain: "homeassistant",
    step: "enter_connection",
    data: {},
  });

  return {
    flowId: flow.id,
    step: "enter_connection",
  };
}

/**
 * Handle enter_connection step
 * Collects base_url and access_token, validates format
 */
export async function handleEnterConnection(
  flowId: string,
  baseUrl: string,
  accessToken: string
): Promise<HAFlowStepResponse> {
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    throw new Error("Flow not found");
  }

  // Validate required fields
  if (!baseUrl || !accessToken) {
    return {
      step: "enter_connection",
      error: "Base URL and access token are required",
    };
  }

  // Basic URL validation
  try {
    const url = new URL(baseUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      return {
        step: "enter_connection",
        error: "URL must use http or https protocol",
      };
    }
  } catch {
    return {
      step: "enter_connection",
      error: "Invalid URL format",
    };
  }

  // Validate access token format (HA tokens are typically long strings)
  if (accessToken.length < 10) {
    return {
      step: "enter_connection",
      error: "Access token appears to be invalid",
    };
  }

  // Store connection data in flow
  await updateFlow(flowId, {
    step: "validate_connection",
    data: {
      baseUrl,
      accessToken,
    },
  });

  return {
    step: "validate_connection",
  };
}

/**
 * Handle validate_connection step
 * Tests connection to Home Assistant by calling /api/config
 */
export async function handleValidateConnection(
  flowId: string
): Promise<HAFlowStepResponse> {
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    throw new Error("Flow not found");
  }

  const { baseUrl, accessToken } = configFlow.data as any;

  if (!baseUrl || !accessToken) {
    return {
      step: "validate_connection",
      error: "Connection data missing. Please start over.",
    };
  }

  // Validate connection
  const validation = await validateHAConnection(baseUrl, accessToken);

  if (!validation.success) {
    // Store error in flow data for retry
    await updateFlow(flowId, {
      data: {
        ...configFlow.data,
        validationError: validation.error,
      },
    });

    return {
      step: "validate_connection",
      validationError: validation.error,
    };
  }

  // Store successful validation result
  await updateFlow(flowId, {
    step: "confirm",
    data: {
      ...configFlow.data,
      haConfig: validation.config,
      validationError: undefined, // Clear any previous errors
    },
  });

  return {
    step: "confirm",
    haConfig: validation.config,
  };
}

/**
 * Handle confirm step
 * Creates config entry and registers integration
 */
export async function handleConfirm(flowId: string): Promise<HAFlowConfirmResponse> {
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    throw new Error("Flow not found");
  }

  if (configFlow.step !== "confirm") {
    throw new Error("Flow must be in confirm step");
  }

  const { baseUrl, accessToken, haConfig } = configFlow.data as any;

  if (!baseUrl || !accessToken) {
    throw new Error("Connection data missing");
  }

  // Create config entry with secure storage
  const configEntry = await createConfigEntry({
    integrationDomain: "homeassistant",
    title: `Home Assistant (${haConfig?.location_name || baseUrl})`,
    data: {
      base_url: baseUrl,
      access_token: accessToken, // Stored securely in config_entries table
    },
    status: "loaded",
  });

  // Register integration in registry with "loaded" status (connected and validated)
  await saveIntegration({
    domain: "homeassistant",
    name: "Home Assistant",
    description: `Connected to ${haConfig?.location_name || baseUrl}`,
    icon: "mdi:home-assistant",
    status: "loaded", // "loaded" means connected and validated
    configData: undefined, // Config is in config_entries, not here
    supportsDevices: false,
  });

  // Clean up flow
  await deleteFlow(flowId);

  return {
    success: true,
    configEntryId: configEntry.id,
    integrationStatus: "connected", // Return "connected" for API response clarity
  };
}

/**
 * Get flow by ID
 */
export async function getHAFlow(flowId: string): Promise<HAConfigFlow | null> {
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    return null;
  }

  return {
    flowId: configFlow.id,
    step: configFlow.step as FlowStep,
    data: configFlow.data as any,
  };
}
