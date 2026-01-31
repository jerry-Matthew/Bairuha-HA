/**
 * Wizard Flow Handler
 * 
 * Multi-step wizard configuration flow
 * Flow: pick_integration → wizard_step_1 → wizard_step_2 → ... → confirm
 * 
 * Supports conditional steps, step validation, and data persistence.
 */

import { BaseFlowHandler } from "../flow-handlers";
import type { FlowStep } from "@/components/addDevice/server/device.types";
import type { FlowConfig } from "../flow-type-resolver";
import type { ValidationResult } from "../flow-handlers";
import { loadFlowDefinition, getStepDefinitions, getNextStepId } from "../flow-definition.loader";
import type { FlowDefinition, StepCondition as FlowStepCondition } from "../flow-definition.types";

export interface StepCondition {
  depends_on: string; // Previous step ID
  field: string; // Field name in previous step
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';
  value?: any; // Value to compare (not needed for exists/not_exists)
}

export interface WizardStepDefinition {
  step_id: string;
  title: string;
  description?: string;
  schema: any;
  condition?: StepCondition;
}

export interface StepMetadata {
  stepId: string;
  title: string;
  description?: string;
  schema: any;
  stepNumber: number;
  totalSteps: number;
}

export class WizardFlowHandler extends BaseFlowHandler {
  async getInitialStep(integrationDomain: string, flowConfig?: FlowConfig): Promise<FlowStep> {
    return "pick_integration";
  }

  async getNextStep(
    currentStep: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<FlowStep> {
    // Try to load flow definition first
    const flowDefinition = await loadFlowDefinition(integrationDomain);
    
    switch (currentStep) {
      case "pick_integration":
        if (flowDefinition) {
          // Use flow definition
          const initialStepId = flowDefinition.initial_step || (flowDefinition.steps[0]?.step_id);
          if (initialStepId) {
            return `wizard_step_${initialStepId}` as FlowStep;
          }
        } else {
          // Fallback to flowConfig
          const steps = this.getWizardSteps(flowConfig);
          const firstStep = this.findNextAvailableStep(steps, 0, flowData);
          if (firstStep) {
            return `wizard_step_${firstStep.step_id}` as FlowStep;
          }
        }
        return "confirm";

      default:
        // Handle wizard_step_N steps
        if (typeof currentStep === 'string' && currentStep.startsWith("wizard_step_")) {
          const currentStepId = currentStep.replace("wizard_step_", "");
          
          if (flowDefinition) {
            // Use flow definition
            const nextStepId = getNextStepId(flowDefinition, currentStepId, flowData);
            if (nextStepId) {
              return `wizard_step_${nextStepId}` as FlowStep;
            } else {
              return "confirm";
            }
          } else {
            // Fallback to flowConfig
            const steps = this.getWizardSteps(flowConfig);
            const currentIndex = steps.findIndex(s => s.step_id === currentStepId);
            
            if (currentIndex === -1) {
              throw new Error(`Invalid step for wizard flow: ${currentStep}`);
            }
            
            // Find next available step (skipping conditional steps that don't match)
            const nextStep = this.findNextAvailableStep(steps, currentIndex + 1, flowData);
            
            if (nextStep) {
              return `wizard_step_${nextStep.step_id}` as FlowStep;
            } else {
              // No more steps, move to confirm
              return "confirm";
            }
          }
        }
        
        if (currentStep === "confirm") {
          throw new Error("Flow already completed");
        }
        
        throw new Error(`Invalid step for wizard flow: ${currentStep}`);
    }
  }

  async shouldSkipStep(
    step: FlowStep,
    flowData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<boolean> {
    if (typeof step === 'string' && step.startsWith("wizard_step_")) {
      const stepId = step.replace("wizard_step_", "");
      
      // Try flow definition first
      const flowDefinition = await loadFlowDefinition(integrationDomain);
      if (flowDefinition) {
        const stepDef = flowDefinition.steps.find(s => s.step_id === stepId);
        if (stepDef?.condition) {
          // Evaluate condition - if false, skip this step
          return !this.evaluateConditionFromDefinition(stepDef.condition, flowData);
        }
      } else {
        // Fallback to flowConfig
        const steps = this.getWizardSteps(flowConfig);
        const stepDef = steps.find(s => s.step_id === stepId);
        
        if (stepDef?.condition) {
          // Evaluate condition - if false, skip this step
          return !this.evaluateCondition(stepDef.condition, flowData);
        }
      }
    }
    return false;
  }

  async validateStepData(
    step: FlowStep,
    stepData: Record<string, any>,
    integrationDomain: string,
    flowConfig?: FlowConfig
  ): Promise<ValidationResult> {
    if (typeof step === 'string' && step.startsWith("wizard_step_")) {
      const stepId = step.replace("wizard_step_", "");
      
      // Try flow definition first
      const flowDefinition = await loadFlowDefinition(integrationDomain);
      if (flowDefinition) {
        const stepDef = flowDefinition.steps.find(s => s.step_id === stepId);
        
        if (!stepDef) {
          return {
            valid: false,
            errors: { _general: `Step ${stepId} not found in flow definition` }
          };
        }
        
        // Validate step data against schema
        return this.validateAgainstSchema(stepDef.schema, stepData);
      } else {
        // Fallback to flowConfig
        const steps = this.getWizardSteps(flowConfig);
        const stepDef = steps.find(s => s.step_id === stepId);
        
        if (!stepDef) {
          return {
            valid: false,
            errors: { _general: `Step ${stepId} not found in flow configuration` }
          };
        }
        
        // Validate step data against schema
        return this.validateAgainstSchema(stepDef.schema, stepData);
      }
    }
    
    return { valid: true };
  }

  /**
   * Get wizard step definitions from flow config
   */
  getWizardSteps(flowConfig?: FlowConfig): WizardStepDefinition[] {
    if (!flowConfig?.steps) {
      return [];
    }
    
    return flowConfig.steps.map(step => ({
      step_id: step.step_id,
      title: step.title,
      description: step.description,
      schema: step.schema,
      condition: step.condition as StepCondition | undefined,
    }));
  }

  /**
   * Get step metadata for a wizard step
   */
  getStepMetadata(stepId: string, flowConfig?: FlowConfig): StepMetadata | null {
    const steps = this.getWizardSteps(flowConfig);
    const stepDef = steps.find(s => s.step_id === stepId);
    
    if (!stepDef) {
      return null;
    }
    
    return {
      stepId: stepDef.step_id,
      title: stepDef.title,
      description: stepDef.description,
      schema: stepDef.schema,
      stepNumber: steps.findIndex(s => s.step_id === stepId) + 1,
      totalSteps: steps.length,
    };
  }

  /**
   * Find next available step (skipping conditional steps that don't match)
   */
  private findNextAvailableStep(
    steps: WizardStepDefinition[],
    startIndex: number,
    flowData: Record<string, any>
  ): WizardStepDefinition | null {
    for (let i = startIndex; i < steps.length; i++) {
      const step = steps[i];
      
      // If step has condition, evaluate it
      if (step.condition) {
        if (this.evaluateCondition(step.condition, flowData)) {
          return step; // Condition met, return this step
        }
        // Condition not met, continue to next step
        continue;
      }
      
      // No condition, return this step
      return step;
    }
    
    return null; // No more steps
  }

  /**
   * Evaluate conditional step condition (from flow definition)
   */
  private evaluateConditionFromDefinition(
    condition: FlowStepCondition,
    flowData: Record<string, any>
  ): boolean {
    // Get the value to compare
    let valueToCompare: any;
    
    if (condition.field) {
      // Field path in previous step
      const fieldPath = condition.depends_on.includes('.') 
        ? condition.depends_on 
        : `${condition.depends_on}.${condition.field}`;
      
      // Simple field path resolution
      const pathParts = fieldPath.split('.');
      valueToCompare = pathParts.reduce((obj: any, part: string) => obj?.[part], flowData);
    } else {
      // Direct value from flowData
      valueToCompare = flowData[condition.depends_on];
    }

    // Evaluate operator
    switch (condition.operator) {
      case 'equals':
        return valueToCompare === condition.value;
      case 'not_equals':
        return valueToCompare !== condition.value;
      case 'contains':
        return Array.isArray(valueToCompare) && valueToCompare.includes(condition.value);
      case 'greater_than':
        return Number(valueToCompare) > Number(condition.value);
      case 'less_than':
        return Number(valueToCompare) < Number(condition.value);
      case 'exists':
        return valueToCompare !== undefined && valueToCompare !== null;
      case 'not_exists':
        return valueToCompare === undefined || valueToCompare === null;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(valueToCompare);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(valueToCompare);
      default:
        return false;
    }
  }

  /**
   * Evaluate conditional step condition (from flowConfig - backward compatibility)
   */
  private evaluateCondition(
    condition: StepCondition,
    flowData: Record<string, any>
  ): boolean {
    const stepData = flowData[condition.depends_on];
    if (!stepData) {
      return false; // Dependent step data not found
    }
    
    const fieldValue = stepData[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'not_equals':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'exists':
        return !!fieldValue;
      case 'not_exists':
        return !fieldValue;
      default:
        return false;
    }
  }

  /**
   * Validate step data against schema
   */
  private validateAgainstSchema(
    schema: any,
    stepData: Record<string, any>
  ): ValidationResult {
    const errors: Record<string, string> = {};
    
    if (!schema || typeof schema !== 'object') {
      return { valid: true }; // No schema, skip validation
    }
    
    // Validate each field in schema
    Object.entries(schema).forEach(([fieldName, fieldSchema]: [string, any]) => {
      const value = stepData[fieldName];
      const isRequired = fieldSchema.required === true;
      
      // Check required fields
      if (isRequired && (value === undefined || value === null || value === "")) {
        errors[fieldName] = `${fieldSchema.description || fieldName} is required`;
        return;
      }
      
      // Skip validation if field is empty and not required
      if (!isRequired && (value === undefined || value === null || value === "")) {
        return;
      }
      
      // Type validation
      switch (fieldSchema.type) {
        case 'string':
          if (typeof value !== 'string') {
            errors[fieldName] = `${fieldSchema.description || fieldName} must be a string`;
          }
          break;
        case 'number':
          if (typeof value !== 'number' && !(!isNaN(Number(value)) && value !== "")) {
            errors[fieldName] = `${fieldSchema.description || fieldName} must be a number`;
          }
          // Range validation
          if (typeof value === 'number' || !isNaN(Number(value))) {
            const numValue = typeof value === 'number' ? value : Number(value);
            if (fieldSchema.min !== undefined && numValue < fieldSchema.min) {
              errors[fieldName] = `${fieldSchema.description || fieldName} must be at least ${fieldSchema.min}`;
            }
            if (fieldSchema.max !== undefined && numValue > fieldSchema.max) {
              errors[fieldName] = `${fieldSchema.description || fieldName} must be at most ${fieldSchema.max}`;
            }
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            errors[fieldName] = `${fieldSchema.description || fieldName} must be a boolean`;
          }
          break;
        case 'password':
          if (typeof value !== 'string') {
            errors[fieldName] = `${fieldSchema.description || fieldName} must be a string`;
          }
          break;
      }
      
      // Enum validation
      if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
        errors[fieldName] = `${fieldSchema.description || fieldName} must be one of: ${fieldSchema.enum.join(', ')}`;
      }
    });
    
    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }

  /**
   * Check if a step is the last wizard step
   */
  isLastWizardStep(step: FlowStep, flowConfig?: FlowConfig): boolean {
    if (typeof step === 'string' && step.startsWith("wizard_step_")) {
      const stepId = step.replace("wizard_step_", "");
      const steps = this.getWizardSteps(flowConfig);
      const currentIndex = steps.findIndex(s => s.step_id === stepId);
      
      // Check if there are any more steps after this one
      const remainingSteps = steps.slice(currentIndex + 1);
      return remainingSteps.length === 0;
    }
    
    return false;
  }

  /**
   * Get all wizard steps with their completion status
   */
  getWizardStepsWithStatus(
    flowData: Record<string, any>,
    flowConfig?: FlowConfig
  ): Array<WizardStepDefinition & { completed: boolean; visible: boolean }> {
    const steps = this.getWizardSteps(flowConfig);
    
    return steps.map(step => {
      const stepData = flowData[`wizard_step_${step.step_id}`];
      const completed = !!stepData;
      
      // Check if step should be visible (no condition or condition met)
      let visible = true;
      if (step.condition) {
        visible = this.evaluateCondition(step.condition, flowData);
      }
      
      return {
        ...step,
        completed,
        visible,
      };
    });
  }
}
