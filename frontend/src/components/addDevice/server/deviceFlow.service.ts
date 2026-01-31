/**
 * Device Flow Service
 * 
 * Manages step-based device setup flows
 * Backend-driven flow state management
 */

import type {
  DeviceSetupFlow,
  FlowStep,
  FlowStartResponse,
  FlowStepResponse,
  FlowConfirmResponse,
  Integration,
} from "./device.types";
import { getDeviceCapableIntegrations, getIntegrationByDomain } from "./integration.registry";
import { registerDevice } from "./device.registry";
import { emitWebSocketEvent } from "./websocket/events";
import { query } from "@/lib/db";
import { getConfigSchema, validateConfig, applyConfigDefaults } from "./integration-config-schemas";
import { createConfigEntry, getConfigEntryByIntegration } from "@/components/globalAdd/server/config-entry.registry";
import { getIntegrationByDomain as getGlobalIntegrationByDomain, saveIntegration } from "@/components/globalAdd/server/integration.registry";
import { createFlow, getFlowById, updateFlow, deleteFlow } from "./config-flow.registry";
import { getFlowType, getFlowConfig } from "@/lib/config-flow/flow-type-resolver";
import { getHandler } from "@/lib/config-flow/flow-handler-registry";
import { discoveryService } from "@/lib/discovery";
import { WizardFlowHandler } from "@/lib/config-flow/handlers/wizard-flow-handler";
import { getFlowHandlerClass } from "@/lib/config-flow/logic/index";
import { HAProxyConfigFlow } from "@/lib/config-flow/logic/ha-proxy-config-flow";

/**
 * Ensure integration registry entry exists with correct status and flags
 * This is called after successful configuration or when skipping configure step
 */
async function ensureIntegrationRegistryEntry(integrationDomain: string): Promise<void> {
  // Check if integration exists in registry
  let integration = await getGlobalIntegrationByDomain(integrationDomain);

  // Get catalog info to populate integration details
  const catalogInfo = await query<any>(
    `SELECT name, description, icon, supports_devices FROM integration_catalog WHERE domain = $1`,
    [integrationDomain]
  );
  const catalogEntry = catalogInfo[0];

  if (!integration) {
    // Create new integration registry entry
    await saveIntegration({
      domain: integrationDomain,
      name: catalogEntry?.name || integrationDomain,
      description: catalogEntry?.description || undefined,
      icon: catalogEntry?.icon || undefined,
      status: "loaded",
      configData: undefined, // Config is stored in config_entries, not here
      supportsDevices: catalogEntry?.supports_devices || false,
    });
  } else {
    // Update existing integration to ensure correct status and flags
    await saveIntegration({
      domain: integration.domain,
      name: integration.name || catalogEntry?.name || integrationDomain,
      description: integration.description || catalogEntry?.description || undefined,
      icon: integration.icon || catalogEntry?.icon || undefined,
      status: "loaded", // Mark as loaded after successful config
      configData: integration.configData,
      supportsDevices: catalogEntry?.supports_devices !== undefined
        ? catalogEntry.supports_devices
        : undefined, // Only update if catalog has info
    });
  }
}

/**
 * Get all supported integrations from catalog (merged with registry status)
 * This implements the Home Assistant-style catalog + registry merge
 */
async function getSelectBrandIntegrations(): Promise<Integration[]> {
  try {
    // Query integration_catalog with LEFT JOIN to integrations registry and config_entries
    // This returns ALL supported integrations, with configuration status
    // An integration is considered "configured" if it has a config entry (for integrations requiring config)
    // or if it exists in the integrations registry (for integrations that don't require config)
    const rows = await query<any>(
      `SELECT
        c.domain,
        c.name,
        c.description,
        c.icon,
        c.brand_image_url,
        c.is_cloud AS "isCloud",
        c.supports_devices,
        COALESCE(ce.id IS NOT NULL, r.id IS NOT NULL, false) AS "isConfigured",
        r.status
      FROM integration_catalog c
      LEFT JOIN integrations r
        ON c.domain = r.domain
      LEFT JOIN config_entries ce
        ON c.domain = ce.integration_domain AND ce.status = 'loaded'
      WHERE c.supports_devices = true
      ORDER BY c.name ASC`
    );

    console.log(`[Select Brand] Found ${rows.length} integrations from catalog`);

    if (rows.length === 0) {
      console.warn("[Select Brand] Catalog query returned 0 results, falling back to registry");
      // Fallback to old method if catalog is empty
      try {
        const fallback = await getDeviceCapableIntegrations();
        console.log(`[Select Brand] Fallback returned ${fallback.length} integrations`);
        return fallback;
      } catch (fallbackError: any) {
        console.error("[Select Brand] Fallback also failed:", fallbackError.message);
        // Return empty array instead of crashing
        return [];
      }
    }

    // Map to Integration format
    const integrations = rows.map((row: any) => ({
      id: row.domain, // Use domain as ID for consistency
      domain: row.domain,
      name: row.name,
      description: row.description || undefined,
      icon: row.icon || undefined,
      brandImageUrl: row.brand_image_url || undefined,
      supportsDeviceCreation: true, // All catalog entries with supports_devices=true support device creation
      isCloud: row.isCloud || false,
      isConfigured: row.isConfigured || false,
    }));

    console.log(`[Select Brand] Returning ${integrations.length} integrations`);
    return integrations;
  } catch (error: any) {
    console.error("[Select Brand] Error fetching catalog integrations:", error.message);
    console.error("[Select Brand] Full error:", error);
    // Fallback to old method if catalog table doesn't exist yet
    console.log("[Select Brand] Falling back to registry-only method");
    try {
      return await getDeviceCapableIntegrations();
    } catch (fallbackError: any) {
      console.error("[Select Brand] Fallback also failed:", fallbackError.message);
      // Return empty array instead of crashing - this allows the UI to show a proper "no integrations" state
      return [];
    }
  }
}

/**
 * Start a new device setup flow
 * 
 * Flow starts with discovery step, then falls back to brand selection if no devices found
 */
export async function startFlow(userId?: string): Promise<FlowStartResponse> {
  // Try to discover devices first (for discovery-based flows)
  // For now, use basic discovery - flow type system will handle protocol-specific discovery
  const discoveredDevices = await discoveryService.discoverDevices("homeassistant");

  // Create persistent flow
  const flow = await createFlow({
    userId: userId || null,
    step: discoveredDevices.length > 0 ? "discover" : "pick_integration",
    data: {
      discoveredDevices,
    },
  });

  // If devices discovered, return discovery step
  if (discoveredDevices.length > 0) {
    return {
      flowId: flow.id,
      step: "discover",
      integrations: [], // No integrations needed for discovery step
    };
  }

  // Otherwise, start with brand selection
  // Integrations are now fetched client-side via API for performance
  return {
    flowId: flow.id,
    step: "pick_integration",
    integrations: [],
  };
}

/**
 * Advance flow to next step
 */
export async function advanceFlow(
  flowId: string,
  integrationId?: string,
  selectedDeviceId?: string,
  configData?: Record<string, any>
): Promise<FlowStepResponse> {
  // Load flow from database
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    throw new Error("Flow not found");
  }

  // Convert ConfigFlow to DeviceSetupFlow format for processing
  const flow: DeviceSetupFlow = {
    flowId: configFlow.id,
    integrationId: configFlow.integrationDomain || undefined,
    step: configFlow.step,
    data: configFlow.data,
  };

  // Update flow state
  if (integrationId) {
    // Check if integration changed - if so, reset flow to restart configuration
    // This handles the "Flow already completed" error when user cancels/retries different brand
    // Check if integration changed OR if we are restarting a completed/confirmed flow
    // This handles the "Flow already completed" error when user cancels/retries same brand
    if ((configFlow.integrationDomain && configFlow.integrationDomain !== integrationId) || configFlow.step === "confirm") {
      console.log(`[DeviceFlow] Integration switch/restart detected (${configFlow.integrationDomain} -> ${integrationId}). Resetting flow.`);
      flow.step = "pick_integration";

      // Clear previous config data but preserve discovery results if any
      const discovered = flow.data?.discoveredDevices;
      flow.data = discovered ? { discoveredDevices: discovered } : {};
    }

    flow.integrationId = integrationId;
  }
  if (configData) {
    flow.data = { ...flow.data, ...configData };
  }
  if (selectedDeviceId) {
    flow.data = { ...flow.data, selectedDeviceId };

    // If device selected in discover step, determine integration from device
    if (flow.step === "discover" && !flow.integrationId) {
      const discoveredDevices = flow.data?.discoveredDevices || [];
      const selectedDevice = discoveredDevices.find((d: any) => d.id === selectedDeviceId);

      if (selectedDevice?.integrationDomain) {
        flow.integrationId = selectedDevice.integrationDomain;

        // Store selected device info in flow data
        flow.data = {
          ...flow.data,
          selectedDevice: {
            name: selectedDevice.name,
            model: selectedDevice.model,
            manufacturer: selectedDevice.manufacturer,
          },
          deviceIdentifiers: selectedDevice.identifiers,
          deviceConnections: selectedDevice.connections,
          selectedDeviceId: selectedDevice.id,
        };
      }
    }
  }

  // NEW: Use flow type system to determine next step if integration is selected
  if (flow.integrationId) {
    try {
      console.log(`[DeviceFlow] Determining next step for ${flow.integrationId}...`);
      const flowType = await getFlowType(flow.integrationId);
      console.log(`[DeviceFlow] Flow type: ${flowType}`);
      const flowConfig = await getFlowConfig(flow.integrationId);
      console.log(`[DeviceFlow] Flow config found: ${!!flowConfig}`);
      const handler = getHandler(flowType);

      // Check if current step should be skipped
      const shouldSkip = await handler.shouldSkipStep(
        flow.step,
        flow.data || {},
        flow.integrationId,
        flowConfig || undefined
      );

      if (shouldSkip) {
        // Skip to next step
        const nextStep = await handler.getNextStep(
          flow.step,
          flow.data || {},
          flow.integrationId,
          flowConfig || undefined
        );

        // Build response based on next step
        let responseData: FlowStepResponse = { step: nextStep };

        if (nextStep === "configure") {
          const configSchema = await getConfigSchema(flow.integrationId);
          responseData.schema = configSchema;
        }

        if (nextStep === "confirm") {
          // Task 68: If schema is empty (leading to confirm) but specific proxy handler exists,
          // prefer proxy over immediate confirm.
          const HandlerClass = getFlowHandlerClass(flow.integrationId);

          if (HandlerClass === HAProxyConfigFlow || (HandlerClass && HandlerClass.name === "HAProxyConfigFlow")) {
            console.log(`[DeviceFlow] Empty schema for ${flow.integrationId}, but Proxy candidate. Skipping local confirm.`);
            throw new Error("SKIP_TO_SWITCH");
          }

          responseData.data = flow.data;
        }

        // Update flow and return
        await updateFlow(flowId, {
          step: nextStep,
          integrationDomain: flow.integrationId,
          data: flow.data,
        });

        return responseData;
      }

      // Get next step from handler
      const nextStep = await handler.getNextStep(
        flow.step,
        flow.data || {},
        flow.integrationId,
        flowConfig || undefined
      );

      // Build response based on next step
      let responseData: FlowStepResponse = { step: nextStep };

      // Handle step-specific logic
      switch (nextStep) {
        case "oauth_authorize":
          // Return OAuth provider and scopes for OAuth authorization step
          if (flowConfig?.oauth_provider) {
            responseData.oauthProvider = flowConfig.oauth_provider;
            responseData.oauthScopes = flowConfig.scopes || [];
          }
          break;

        case "configure":
          // Get config schema for configure step
          const configSchema = await getConfigSchema(flow.integrationId);
          responseData.schema = configSchema;
          break;

        case "confirm":
          responseData.data = flow.data;
          break;

        case "pick_integration":
          // Return integrations list if going back to pick_integration
          const integrations = await getSelectBrandIntegrations();
          (responseData as any).integrations = integrations;
          break;

        default:
          // Handle wizard steps
          if (typeof nextStep === 'string' && nextStep.startsWith("wizard_step_")) {
            const wizardHandler = new WizardFlowHandler();
            const stepMetadata = wizardHandler.getStepMetadata(
              nextStep.replace("wizard_step_", ""),
              flowConfig || undefined
            );

            if (stepMetadata) {
              responseData.stepTitle = stepMetadata.title;
              responseData.stepDescription = stepMetadata.description;
              responseData.stepNumber = stepMetadata.stepNumber;
              responseData.totalSteps = stepMetadata.totalSteps;
              responseData.schema = stepMetadata.schema;
              responseData.canGoBack = stepMetadata.stepNumber > 1;
              responseData.isLastStep = wizardHandler.isLastWizardStep(nextStep, flowConfig || undefined);

              // Include current step data if it exists
              const stepId = nextStep.replace("wizard_step_", "");
              if (flow.data?.[`wizard_step_${stepId}`]) {
                responseData.data = flow.data[`wizard_step_${stepId}`];
              }
            }
          }
          break;
      }

      // Handle wizard step submission and validation
      if (typeof flow.step === 'string' && flow.step.startsWith("wizard_step_") && configData !== undefined) {
        const stepId = flow.step.replace("wizard_step_", "");
        const wizardHandler = new WizardFlowHandler();

        // Validate step data
        const validation = await wizardHandler.validateStepData(
          flow.step,
          configData,
          flow.integrationId!,
          flowConfig || undefined
        );

        if (!validation.valid) {
          const error = new Error("Wizard step validation failed");
          (error as any).validationErrors = validation.errors || {};
          throw error;
        }

        // Store step data in flow.data with stepId as key
        flow.data = {
          ...(flow.data || {}),
          [`wizard_step_${stepId}`]: configData,
        };

        // Update flow data in database
        await updateFlow(flowId, {
          data: flow.data,
        });
      }

      // Handle configure step validation if configData provided
      if (flow.step === "configure" && configData !== undefined) {
        // Validate and save configuration
        const configDataToValidate = configData || {};

        // Apply defaults and validate
        // Apply defaults and validate
        const configWithDefaults = await applyConfigDefaults(flow.integrationId, { ...configDataToValidate });
        const validation = await validateConfig(flow.integrationId, configWithDefaults);

        if (!validation.valid) {
          // Return validation errors with 400 status (handled by API route)
          const error = new Error("Configuration validation failed");
          (error as any).validationErrors = validation.errors;
          throw error;
        }

        // Get integration info from catalog for title
        const catalogRow = await query<any>(
          `SELECT name FROM integration_catalog WHERE domain = $1`,
          [flow.integrationId]
        );
        const integrationName = catalogRow[0]?.name || flow.integrationId;

        // Create config entry
        await createConfigEntry({
          integrationDomain: flow.integrationId,
          title: `${integrationName} Configuration`,
          data: configWithDefaults,
          status: "loaded",
        });

        // Ensure integration registry entry exists and is marked as "loaded" (configured)
        await ensureIntegrationRegistryEntry(flow.integrationId);

        // Store config data in flow for reference
        flow.data = {
          ...(flow.data || {}),
          configData: configWithDefaults,
        };
      }

      // Update flow in database
      await updateFlow(flowId, {
        step: nextStep,
        integrationDomain: flow.integrationId,
        data: flow.data,
      });

      return responseData;
    } catch (error: any) {
      if (error.message === "SKIP_TO_SWITCH") {
        console.log(`[DeviceFlow] Skipping Type System for ${flow.integrationId} to try Proxy`);
      } else {
        // If flow type system fails, fall back to existing logic
        console.warn(`[DeviceFlow] Flow type system error for ${flow.integrationId}, falling back to manual flow:`, error);
      }
      // Continue to fallback logic below
    }
  }

  // FALLBACK: Use existing hardcoded logic for flows without integration selected
  // This maintains backward compatibility
  let nextStep: FlowStep;
  let responseData: FlowStepResponse = { step: flow.step };

  switch (flow.step) {
    case "discover":
      // User selected a discovered device - move to confirm step
      if (selectedDeviceId) {
        const discoveredDevices = flow.data?.discoveredDevices || [];
        const selectedDevice = discoveredDevices.find((d: any) => d.id === selectedDeviceId);

        if (!selectedDevice) {
          throw new Error("Selected device not found");
        }

        // Determine integration from discovered device
        const integrationDomain = selectedDevice.integrationDomain || "default";

        // Check if integration exists in catalog
        const catalogRow = await query<any>(
          `SELECT domain, name FROM integration_catalog WHERE domain = $1`,
          [integrationDomain]
        );

        if (catalogRow.length > 0) {
          flow.integrationId = integrationDomain;
        } else {
          // Use default integration if not found
          flow.integrationId = "default";
        }

        // Store selected device info in flow data (including identifiers for duplicate check)
        flow.data = {
          ...flow.data,
          selectedDevice: {
            name: selectedDevice.name,
            model: selectedDevice.model,
            manufacturer: selectedDevice.manufacturer,
          },
          deviceIdentifiers: selectedDevice.identifiers,
          deviceConnections: selectedDevice.connections,
          selectedDeviceId: selectedDevice.id, // Store for later use
        };

        // Move directly to confirm (skip configure for discovered devices)
        nextStep = "confirm";
        responseData = {
          step: nextStep,
          data: flow.data,
        };
      } else {
        // No device selected - allow manual brand selection
        nextStep = "pick_integration";
        const integrations = await getSelectBrandIntegrations();
        responseData = {
          step: nextStep,
          integrations,
        };
      }
      break;

    case "pick_integration":
      if (!flow.integrationId) {
        throw new Error("Integration ID required");
      }

      // --- DYNAMIC LOGIC PATH (Task 65) ---
      const HandlerClass = getFlowHandlerClass(flow.integrationId);

      if (HandlerClass) {
        console.log(`[DeviceFlow] Using Dynamic Logic for ${flow.integrationId}`);
        const handler = new HandlerClass(flowId, flow.integrationId, { ...flow.data });

        let handled = false;
        try {
          // Execute the user step logic
          const result = await handler.step_user(configData); // configData is undefined on first run

          if (result.type === "form" || result.type === "menu") {
            nextStep = "configure";
            responseData = {
              step: nextStep,
              schema: result.data_schema || {}, // Use schema from logic (mapped from HA)
              // We can also pass errors/description_placeholders if the UI supports it
              stepTitle: result.title,
              stepDescription: result.description,
            };

            // CRITICAL: Persist any data returned by the logic (e.g. ha_flow_id)
            if (result.data) {
              flow.data = { ...(flow.data || {}), ...result.data };
            }

            handled = true;
          } else if (result.type === "create_entry") {
            // Logic decided to auto-create (e.g. discovery success or simple pairing)

            // Create config entry
            await createConfigEntry({
              integrationDomain: flow.integrationId,
              title: result.title || `${flow.integrationId} Configuration`,
              data: result.data || {},
              status: "loaded",
            });
            await ensureIntegrationRegistryEntry(flow.integrationId);

            flow.data = { ...(flow.data || {}), configData: result.data };

          } else if (result.type === "external_step") {
            // Logic returned an external step (usually OAuth or redirect)
            nextStep = "oauth_authorize";
            responseData = {
              step: nextStep,
              stepTitle: result.title || "Authorization",
              stepDescription: result.description || "Please authorize the integration",
            };

            // If the logic provided a URL, pass it (though frontend usually generates it from provider)
            if (result.url) {
              (responseData as any).authorizationUrl = result.url;
            }

            // Persist data
            if (result.data) {
              flow.data = { ...(flow.data || {}), ...result.data };
            }

            handled = true;
          } else if (result.type === "abort") {
            const abortReason = result.reason || "Flow aborted by Home Assistant";
            console.warn(`[DeviceFlow] Proxy/Dynamic flow aborted: ${abortReason}`);
            throw new Error(abortReason);
          }
        } catch (e) {
          console.error(`[DeviceFlow] Error in dynamic flow:`, e);
          // Verify if we should fallback
          console.warn(`[DeviceFlow] Dynamic flow threw error. Falling back.`);
        }

        if (handled) {
          break; // Exit the switch, we handled it.
        }
        // If not handled (abort or error), fall through to Static Schema Fallback
      }
      // --- END DYNAMIC LOGIC PATH ---

      // --- FALLBACK (STATIC SCHEMA) ---
      // Check if integration defines a config schema
      const configSchema = await getConfigSchema(flow.integrationId);
      const schemaHasFields = Object.keys(configSchema).length > 0;

      // If integration defines a config schema (has any fields), configure step MUST run
      if (schemaHasFields) {
        nextStep = "configure";
        responseData = {
          step: nextStep,
          schema: configSchema,
        };
      } else {
        // Only skip configure step if schema is completely empty (no fields defined)
        // Ensure integration registry entry exists for integrations that don't require config
        await ensureIntegrationRegistryEntry(flow.integrationId);

        // Create a basic device structure for confirm step
        flow.data = {
          ...(flow.data || {}),
          selectedDevice: {
            name: `${flow.integrationId} Device`,
            model: undefined,
            manufacturer: undefined,
          },
        };

        // Go directly to confirm
        nextStep = "confirm";
        responseData = {
          step: nextStep,
          data: flow.data,
        };
      }
      break;

    case "configure":
      // Validate and save configuration
      if (!flow.integrationId) {
        throw new Error("Integration ID required");
      }

      // Always use schema validation - even if configData is missing or empty
      // This ensures proper 400 responses with field-level validation errors
      const configDataToValidate = configData || {};

      // Apply defaults and validate
      // Apply defaults and validate
      const configWithDefaults = await applyConfigDefaults(flow.integrationId, { ...configDataToValidate });
      const validation = await validateConfig(flow.integrationId, configWithDefaults);

      if (!validation.valid) {
        // Return validation errors with 400 status (handled by API route)
        const error = new Error("Configuration validation failed");
        (error as any).validationErrors = validation.errors;
        throw error;
      }

      // Get integration info from catalog for title
      const catalogRow = await query<any>(
        `SELECT name FROM integration_catalog WHERE domain = $1`,
        [flow.integrationId]
      );
      const integrationName = catalogRow[0]?.name || flow.integrationId;

      // Create config entry
      await createConfigEntry({
        integrationDomain: flow.integrationId,
        title: `${integrationName} Configuration`,
        data: configWithDefaults,
        status: "loaded",
      });

      // Ensure integration registry entry exists and is marked as "loaded" (configured)
      await ensureIntegrationRegistryEntry(flow.integrationId);

      // Store config data in flow for reference
      flow.data = {
        ...(flow.data || {}),
        configData: configWithDefaults,
      };

      // Move to confirm step
      nextStep = "confirm";
      responseData = {
        step: nextStep,
        data: flow.data,
      };
      break;

    case "confirm":
      throw new Error("Flow already completed");

    default:
      throw new Error(`Unknown step: ${flow.step}`);
  }

  // Update flow in database
  await updateFlow(flowId, {
    step: nextStep,
    integrationDomain: flow.integrationId || null,
    data: flow.data,
  });

  return responseData;
}

/**
 * Finalize device registration
 */
export async function confirmFlow(
  flowId: string,
  options?: {
    deviceName?: string;
    deviceType?: string;
    model?: string;
    manufacturer?: string;
  }
): Promise<FlowConfirmResponse> {
  // Load flow from database
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    throw new Error("Flow not found");
  }

  // Convert ConfigFlow to DeviceSetupFlow format
  const flow: DeviceSetupFlow = {
    flowId: configFlow.id,
    integrationId: configFlow.integrationDomain || undefined,
    step: configFlow.step,
    data: configFlow.data,
  };

  if (flow.step !== "confirm") {
    throw new Error("Flow must be in confirm step");
  }

  if (!flow.integrationId) {
    throw new Error("Missing required flow data: integrationId");
  }

  // Get device name from options, flow data, or use default
  const deviceName = options?.deviceName || flow.data?.selectedDevice?.name || `${flow.integrationId} Device`;

  if (!deviceName || !deviceName.trim()) {
    throw new Error("Device name is required");
  }

  // Check if integration defines a config schema
  // Check if integration defines a config schema
  const configSchema = await getConfigSchema(flow.integrationId);
  const schemaHasFields = Object.keys(configSchema).length > 0;

  // If integration has a config schema, assert that a config entry exists
  if (schemaHasFields) {
    const configEntry = await getConfigEntryByIntegration(flow.integrationId);
    if (!configEntry) {
      throw new Error("Config entry is required but not found. Configure step must be completed.");
    }
    if (configEntry.status !== "loaded") {
      throw new Error(`Config entry exists but status is "${configEntry.status}", expected "loaded"`);
    }
  }

  // Ensure integration registry entry exists and is marked as loaded
  await ensureIntegrationRegistryEntry(flow.integrationId);

  // Assert that integration is marked as loaded
  const integration = await getGlobalIntegrationByDomain(flow.integrationId);
  if (!integration) {
    throw new Error("Integration registry entry not found");
  }
  if (integration.status !== "loaded") {
    throw new Error(`Integration status is "${integration.status}", expected "loaded"`);
  }

  // Integration is already loaded above, use it for device registration

  // Get discovered device info if available (for unique ID generation)
  const discoveredDevices = flow.data?.discoveredDevices || [];
  const selectedDeviceId = flow.data?.selectedDeviceId;
  const discoveredDevice = selectedDeviceId
    ? discoveredDevices.find((d: any) => d.id === selectedDeviceId)
    : null;

  // Register the device with duplicate prevention
  const device = await registerDevice({
    name: deviceName.trim(),
    integrationId: flow.integrationId,
    model: options?.model || flow.data?.selectedDevice?.model || discoveredDevice?.model,
    manufacturer: options?.manufacturer || flow.data?.selectedDevice?.manufacturer || discoveredDevice?.manufacturer,
    deviceType: options?.deviceType, // Pass device type for entity creation
    status: "offline", // New devices start offline
    uniqueId: discoveredDevice?.id ? `discovered:${discoveredDevice.id}` : undefined,
    identifiers: discoveredDevice?.identifiers || flow.data?.deviceIdentifiers,
    connections: discoveredDevice?.connections,
  });

  // Emit WebSocket event
  await emitWebSocketEvent({
    type: "device_added",
    deviceId: device.id,
  });

  // Clean up flow from database
  await deleteFlow(flowId);

  return {
    deviceId: device.id,
    status: "registered",
  };
}

/**
 * Get flow by ID
 */
export async function getFlow(flowId: string): Promise<DeviceSetupFlow | null> {
  const configFlow = await getFlowById(flowId);
  if (!configFlow) {
    return null;
  }

  // Convert ConfigFlow to DeviceSetupFlow format
  return {
    flowId: configFlow.id,
    integrationId: configFlow.integrationDomain || undefined,
    step: configFlow.step,
    data: configFlow.data,
  };
}

