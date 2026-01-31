/**
 * Hybrid Flow Handler
 * 
 * Combines multiple flow types
 * Flow: Dynamic based on flow_config and user choices
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";

export class HybridFlowHandler extends BaseFlowHandler {
  async getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep> {
    // Check if discovery is available
    const hasDiscovery = flowConfig?.discovery_protocols &&
      Object.keys(flowConfig.discovery_protocols).length > 0;

    if (hasDiscovery) {
      return "discover";
    }

    return "pick_integration";
  }

  async getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep> {
    // Hybrid flows can branch based on user choices
    // For now, implement basic routing logic
    // Full implementation can be enhanced based on flow_config

    switch (currentStep) {
      case "discover":
        if (flowData.selectedDeviceId) {
          // Device selected from discovery
          const { getConfigSchema } = await import("@/components/addDevice/server/integration-config-schemas");
          const configSchema = await getConfigSchema(integrationDomain);
          const schemaHasFields = Object.keys(configSchema).length > 0;

          return schemaHasFields ? "configure" : "confirm";
        }
        return "pick_integration";

      case "pick_integration":
        // Check if OAuth is needed
        if (flowConfig?.oauth_provider) {
          return "oauth_authorize";
        }

        // Check if wizard steps are defined
        if (flowConfig?.steps && flowConfig.steps.length > 0) {
          return `wizard_step_${flowConfig.steps[0].step_id}` as FlowStep;
        }

        // Default to configure
        const { getConfigSchema } = await import("@/components/addDevice/server/integration-config-schemas");
        const configSchema = await getConfigSchema(integrationDomain);
        const schemaHasFields = Object.keys(configSchema).length > 0;

        return schemaHasFields ? "configure" : "confirm";

      case "oauth_authorize":
        return "oauth_callback";

      case "oauth_callback":
        const { getConfigSchema: getConfigSchemaAfterOAuth } = await import("@/components/addDevice/server/integration-config-schemas");
        const configSchemaAfterOAuth = await getConfigSchemaAfterOAuth(integrationDomain);
        const schemaHasFieldsAfterOAuth = Object.keys(configSchemaAfterOAuth).length > 0;

        return schemaHasFieldsAfterOAuth ? "configure" : "confirm";

      case "configure":
        return "confirm";

      case "confirm":
        throw new Error("Flow already completed");

      default:
        // Handle wizard steps
        if (typeof currentStep === 'string' && currentStep.startsWith("wizard_step_")) {
          const currentStepId = currentStep.replace("wizard_step_", "");
          const steps = flowConfig?.steps || [];
          const currentIndex = steps.findIndex(s => s.step_id === currentStepId);

          if (currentIndex >= 0 && currentIndex < steps.length - 1) {
            return `wizard_step_${steps[currentIndex + 1].step_id}` as FlowStep;
          }
          return "confirm";
        }

        throw new Error(`Invalid step for hybrid flow: ${currentStep}`);
    }
  }
}
