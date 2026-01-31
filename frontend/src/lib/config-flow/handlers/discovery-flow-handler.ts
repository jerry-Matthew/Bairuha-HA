/**
 * Discovery Flow Handler
 * 
 * Discovery-based configuration flow
 * Flow: discover → configure (optional) → confirm
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";
import { discoveryService } from "@/lib/discovery";

export class DiscoveryFlowHandler extends BaseFlowHandler {
  async getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep> {
    return "discover";
  }

  async getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep> {
    switch (currentStep) {
      case "discover":
        // If device selected, check if configure is needed
        if (flowData.selectedDeviceId) {
          const { getConfigSchema } = await import("@/components/addDevice/server/integration-config-schemas");
          const configSchema = await getConfigSchema(integrationDomain);
          const schemaHasFields = Object.keys(configSchema).length > 0;

          return schemaHasFields ? "configure" : "confirm";
        } else {
          // No device selected, allow manual brand selection
          return "pick_integration";
        }

      case "pick_integration":
        // After picking integration, check if configure needed
        const { getConfigSchema } = await import("@/components/addDevice/server/integration-config-schemas");
        const configSchema = await getConfigSchema(integrationDomain);
        const schemaHasFields = Object.keys(configSchema).length > 0;

        return schemaHasFields ? "configure" : "confirm";

      case "configure":
        return "confirm";

      case "confirm":
        throw new Error("Flow already completed");

      default:
        throw new Error(`Invalid step for discovery flow: ${currentStep}`);
    }
  }

  /**
   * Discover devices for this integration
   */
  async discoverDevices(integrationDomain: string, flowConfig?: FlowConfig) {
    return discoveryService.discoverDevices(integrationDomain, flowConfig);
  }

  /**
   * Refresh discovery
   */
  async refreshDiscovery(integrationDomain: string, flowConfig?: FlowConfig) {
    return discoveryService.refreshDiscovery(integrationDomain, flowConfig);
  }
}
