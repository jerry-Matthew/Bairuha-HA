/**
 * Conditional Step Engine
 * 
 * Evaluates conditional logic to determine step visibility and navigation paths
 * Extracted from flow-definition.loader.ts for better separation of concerns
 */

import type { FlowDefinition, StepDefinition, StepCondition } from "./flow-definition.types";

/**
 * Evaluate a step condition
 */
export function evaluateStepCondition(
  condition: StepCondition,
  flowData: Record<string, any>,
  definition: FlowDefinition
): boolean {
  // Handle nested conditions with AND/OR logic
  if (condition.conditions && condition.conditions.length > 0) {
    const results = condition.conditions.map(c => evaluateStepCondition(c, flowData, definition));
    
    if (condition.logic === 'or') {
      return results.some(r => r === true);
    }
    // Default to 'and'
    return results.every(r => r === true);
  }

  // Get the value to compare
  let valueToCompare: any;
  
  if (condition.field) {
    // Field path in previous step - depends_on is step ID, field is field name
    const stepData = flowData[condition.depends_on] || flowData[`wizard_step_${condition.depends_on}`];
    if (stepData) {
      valueToCompare = stepData[condition.field];
    } else {
      // Try direct field path
      const fieldPath = condition.depends_on.includes('.') 
        ? condition.depends_on 
        : `${condition.depends_on}.${condition.field}`;
      const pathParts = fieldPath.split('.');
      valueToCompare = pathParts.reduce((obj: any, part: string) => obj?.[part], flowData);
    }
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
 * Check if a step should be skipped based on its condition
 */
export function shouldSkipStep(
  step: StepDefinition,
  flowData: Record<string, any>,
  definition: FlowDefinition
): boolean {
  if (!step.condition) {
    return false; // No condition, don't skip
  }

  return !evaluateStepCondition(step.condition, flowData, definition);
}

/**
 * Determine next step based on conditional logic
 */
export function determineNextStep(
  definition: FlowDefinition,
  currentStepId: string,
  flowData: Record<string, any>
): string | null {
  const currentIndex = definition.steps.findIndex(step => step.step_id === currentStepId);
  
  if (currentIndex === -1) {
    return null;
  }

  // Check if current step has explicit next_step
  const currentStep = definition.steps[currentIndex];
  if (currentStep.navigation?.next_step) {
    return currentStep.navigation.next_step;
  }

  // Find next available step (skipping conditional steps that don't match)
  for (let i = currentIndex + 1; i < definition.steps.length; i++) {
    const step = definition.steps[i];
    
    // Check if step should be skipped based on condition
    if (shouldSkipStep(step, flowData, definition)) {
      continue;
    }
    
    return step.step_id;
  }

  return null; // No more steps
}

/**
 * Get list of visible steps based on conditional logic
 */
export function getVisibleSteps(
  definition: FlowDefinition,
  flowData: Record<string, any>
): string[] {
  return definition.steps
    .filter(step => !shouldSkipStep(step, flowData, definition))
    .map(step => step.step_id);
}
