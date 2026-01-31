/**
 * None Flow Handler
 * 
 * No config flow required
 * Flow: pick_integration → confirm (or skip entirely)
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";

export class NoneFlowHandler extends BaseFlowHandler {
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
        // Skip directly to confirm for no-config integrations
        return "confirm";

      case "confirm":
        throw new Error("Flow already completed");

      default:
        throw new Error(`Invalid step for none flow: ${currentStep}`);
    }
  }

  async shouldSkipStep(
    step: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<boolean> {
    // Skip configure step for no-config integrations
    return step === "configure";
  }
}
