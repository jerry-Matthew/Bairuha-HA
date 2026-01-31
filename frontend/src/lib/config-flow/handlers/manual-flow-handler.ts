/**
 * Manual Flow Handler
 * 
 * Standard manual configuration flow
 * Flow: pick_integration → configure → confirm
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";
import { getConfigSchema } from "@/components/addDevice/server/integration-config-schemas";

export class ManualFlowHandler extends BaseFlowHandler {
  async getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep> {
    return "pick_integration";
  }

  async getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep> {
    switch (currentStep) {
      case "pick_integration":
        // Check if integration has config schema
        const configSchema = await getConfigSchema(integrationDomain);
        const schemaHasFields = Object.keys(configSchema).length > 0;

        if (schemaHasFields) {
          return "configure";
        } else {
          // Skip configure if no schema
          return "confirm";
        }

      case "configure":
        return "confirm";

      case "confirm":
        throw new Error("Flow already completed");

      default:
        throw new Error(`Invalid step for manual flow: ${currentStep}`);
    }
  }

  async shouldSkipStep(
    step: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<boolean> {
    if (step === "configure") {
      // Skip configure if no config schema
      const configSchema = await getConfigSchema(integrationDomain);
      return Object.keys(configSchema).length === 0;
    }
    return false;
  }
}
