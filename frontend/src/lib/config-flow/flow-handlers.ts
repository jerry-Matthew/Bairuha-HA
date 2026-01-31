/**
 * Flow Handler Interface
 * 
 * Defines the interface for flow handlers that determine flow step progression
 */

import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "./flow-type-resolver";

export interface ValidationResult {
  valid: boolean;
  errors?: Record<string, string>;
}

export interface FlowHandler {
  /**
   * Get the initial step for this flow type
   */
  getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep>;

  /**
   * Get the next step based on current step and flow data
   */
  getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep>;

  /**
   * Determine if a step should be skipped
   */
  shouldSkipStep(
    step: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<boolean>;

  /**
   * Validate step data
   */
  validateStepData(
    step: FlowStep,
    stepData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<ValidationResult>;
}

/**
 * Base flow handler with common logic
 */
export abstract class BaseFlowHandler implements FlowHandler {
  abstract getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep>;
  abstract getNextStep(currentStep: FlowStep, flowData: Record<string, any>, integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep>;

  async shouldSkipStep(step: FlowStep, flowData: Record<string, any>, integrationDomain: string, flowConfig?: FlowConfig): Promise<boolean> {
    return false; // Default: don't skip any steps
  }

  async validateStepData(step: FlowStep, stepData: Record<string, any>, integrationDomain: string, flowConfig?: FlowConfig): Promise<ValidationResult> {
    return { valid: true }; // Default: always valid
  }
}
